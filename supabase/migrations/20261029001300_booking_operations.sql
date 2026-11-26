-- Fase 2B.4: operaciones controladas de booking. Las funciones usan READ COMMITTED,
-- locks asesorados transaccionales y la exclusion GiST como garantia final.

create function private.lock_booking_global(p_exclusive boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_exclusive then perform pg_advisory_xact_lock(94117, 0);
  else perform pg_advisory_xact_lock_shared(94117, 0); end if;
end;
$$;
create function private.lock_booking_professional(p_professional_id uuid)
returns void language sql security definer set search_path = '' as $$
  select pg_advisory_xact_lock(94117, hashtext(p_professional_id::text));
$$;

create function private.release_expired_holds(p_professional_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.professional_time_allocations
  set state = 'expired', released_at = clock_timestamp()
  where professional_id = p_professional_id and allocation_kind = 'hold'
    and state = 'active' and expires_at <= clock_timestamp();
  update public.booking_time_holds
  set status = 'expired'
  where professional_id = p_professional_id and status = 'active' and expires_at <= clock_timestamp();
end;
$$;

create function private.booking_slot_available(p_professional_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_service_ids uuid[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_timezone text; v_local_start timestamp; v_local_end timestamp; v_weekday smallint; v_start_minute integer; v_end_minute integer;
begin
  select business_timezone into v_timezone from public.business_settings where id = 1;
  v_local_start := timezone(v_timezone, p_starts_at); v_local_end := timezone(v_timezone, p_ends_at);
  if v_local_start::date <> v_local_end::date then return false; end if;
  v_weekday := extract(isodow from v_local_start)::smallint;
  v_start_minute := extract(hour from v_local_start)::integer * 60 + extract(minute from v_local_start)::integer;
  v_end_minute := extract(hour from v_local_end)::integer * 60 + extract(minute from v_local_end)::integer;
  if not exists (select 1 from public.professionals p where p.id = p_professional_id and p.is_active and p.archived_at is null) then return false; end if;
  if (select count(*) from public.professional_services ps where ps.professional_id = p_professional_id and ps.is_active and ps.service_id = any(p_service_ids)) <> cardinality(p_service_ids) then return false; end if;
  if not exists (select 1 from public.professional_working_hours w where w.professional_id = p_professional_id and w.weekday = v_weekday and w.is_active and w.archived_at is null and w.effective_from <= v_local_start::date and (w.effective_until is null or w.effective_until > v_local_start::date) and w.start_minute <= v_start_minute and w.end_minute >= v_end_minute) then return false; end if;
  if exists (select 1 from public.professional_recurring_breaks b where b.professional_id = p_professional_id and b.weekday = v_weekday and b.is_active and b.archived_at is null and b.effective_from <= v_local_start::date and (b.effective_until is null or b.effective_until > v_local_start::date) and int4range(b.start_minute,b.end_minute,'[)') && int4range(v_start_minute,v_end_minute,'[)')) then return false; end if;
  if exists (select 1 from public.calendar_blocks c where c.is_active and c.archived_at is null and (c.professional_id is null or c.professional_id = p_professional_id) and tstzrange(c.starts_at,c.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')) then return false; end if;
  if exists (select 1 from public.professional_time_allocations a where a.professional_id = p_professional_id and a.state = 'active' and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')) then return false; end if;
  return true;
end;
$$;

create function public.request_booking_hold(p_service_ids uuid[], p_mode public.service_mode, p_starts_at timestamptz, p_professional_id uuid, p_idempotency_key uuid, p_request_fingerprint text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_customer uuid := auth.uid(); v_settings public.business_settings%rowtype; v_duration integer; v_end timestamptz; v_professional uuid; v_hold uuid; v_candidate record;
begin
  if v_customer is null then raise exception 'Autenticacion requerida' using errcode = '42501'; end if;
  perform private.lock_booking_global(false);
  select * into v_settings from public.business_settings where id = 1;
  if not found or not v_settings.booking_enabled or v_settings.professional_assignment_mode is null or v_settings.approval_max_pending_minutes is null or v_settings.approval_cutoff_before_start_minutes is null or v_settings.cancellation_notice_minutes is null or v_settings.reschedule_proposal_ttl_minutes is null then raise exception 'Reservas no disponibles' using errcode = '55000'; end if;
  select id into v_hold from public.booking_time_holds where customer_profile_id = v_customer and idempotency_key = p_idempotency_key for update;
  if found then
    if (select request_fingerprint from public.booking_time_holds where id = v_hold) <> p_request_fingerprint then raise exception 'Clave de idempotencia reutilizada con otro payload' using errcode = '23505'; end if;
    return v_hold;
  end if;
  if p_service_ids is null or cardinality(p_service_ids) = 0 or cardinality(p_service_ids) <> (select count(distinct s) from unnest(p_service_ids) s) then raise exception 'Servicios invalidos' using errcode = '23514'; end if;
  select sum(s.duration_minutes)::integer into v_duration from public.services s where s.id = any(p_service_ids) and s.is_active and s.archived_at is null and s.duration_minutes is not null and exists (select 1 from public.service_modes m where m.service_id=s.id and m.mode=p_mode and m.is_active);
  if v_duration is null or (select count(*) from public.services s where s.id = any(p_service_ids) and s.is_active and s.archived_at is null and exists (select 1 from public.service_modes m where m.service_id=s.id and m.mode=p_mode and m.is_active)) <> cardinality(p_service_ids) then raise exception 'Servicios o modalidad no disponibles' using errcode = '23514'; end if;
  v_end := p_starts_at + make_interval(mins => v_duration);
  if p_starts_at < clock_timestamp() + make_interval(mins => v_settings.minimum_notice_minutes) or p_starts_at > clock_timestamp() + make_interval(days => v_settings.booking_horizon_days) then raise exception 'Horario fuera de la ventana de reserva' using errcode = '23514'; end if;
  if v_settings.professional_assignment_mode = 'customer_choice' then
    if p_professional_id is null then raise exception 'Debe seleccionar profesional' using errcode = '23514'; end if;
    v_professional := p_professional_id; perform private.lock_booking_professional(v_professional); perform private.release_expired_holds(v_professional);
    if not private.booking_slot_available(v_professional,p_starts_at,v_end,p_service_ids) then raise exception 'Horario no disponible' using errcode = '23P01'; end if;
  else
    for v_candidate in select p.id from public.professionals p where p.is_active and p.archived_at is null and (select count(*) from public.professional_services ps where ps.professional_id=p.id and ps.is_active and ps.service_id=any(p_service_ids))=cardinality(p_service_ids) order by (select count(*) from public.professional_time_allocations a where a.professional_id=p.id and a.allocation_kind='booking' and a.state='active' and a.starts_at>clock_timestamp()), p.sort_order, p.id loop
      perform private.lock_booking_professional(v_candidate.id); perform private.release_expired_holds(v_candidate.id);
      if private.booking_slot_available(v_candidate.id,p_starts_at,v_end,p_service_ids) then v_professional := v_candidate.id; exit; end if;
    end loop;
    if v_professional is null then raise exception 'No hay profesional disponible' using errcode = '23P01'; end if;
  end if;
  insert into public.booking_time_holds(customer_profile_id,professional_id,mode,service_ids,request_fingerprint,idempotency_key,starts_at,ends_at,expires_at) values(v_customer,v_professional,p_mode,p_service_ids,p_request_fingerprint,p_idempotency_key,p_starts_at,v_end,clock_timestamp()+interval '10 minutes') returning id into v_hold;
  insert into public.professional_time_allocations(professional_id,allocation_kind,hold_id,starts_at,ends_at,expires_at) values(v_professional,'hold',v_hold,p_starts_at,v_end,clock_timestamp()+interval '10 minutes');
  return v_hold;
end;
$$;

create function public.convert_hold_to_booking(p_hold_id uuid, p_request_fingerprint text, p_address_line text default null, p_district text default null, p_reference text default null, p_additional_instructions text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_customer uuid := auth.uid(); h public.booking_time_holds%rowtype; s public.business_settings%rowtype; v_booking uuid; v_name text; v_duration integer;
begin
  if v_customer is null then raise exception 'Autenticacion requerida' using errcode='42501'; end if;
  select * into h from public.booking_time_holds where id=p_hold_id for update;
  if not found or h.customer_profile_id <> v_customer then raise exception 'Retencion no encontrada' using errcode='42501'; end if;
  perform private.lock_booking_global(false); perform private.lock_booking_professional(h.professional_id); perform private.release_expired_holds(h.professional_id);
  select * into h from public.booking_time_holds where id=p_hold_id for update;
  if h.status='converted' then return h.converted_booking_id; end if;
  if h.status <> 'active' or h.expires_at <= clock_timestamp() then raise exception 'Retencion vencida o no activa' using errcode='55000'; end if;
  if h.request_fingerprint <> p_request_fingerprint then raise exception 'Huella de solicitud invalida' using errcode='23514'; end if;
  select * into s from public.business_settings where id=1;
  if not s.booking_enabled or s.professional_assignment_mode is null or s.approval_max_pending_minutes is null or s.approval_cutoff_before_start_minutes is null or s.cancellation_notice_minutes is null then raise exception 'Reservas no disponibles' using errcode='55000'; end if;
  if h.mode='domicilio' and (p_address_line is null or p_district is null or p_reference is null) then raise exception 'Direccion incompleta para domicilio' using errcode='23514'; end if;
  select display_name into v_name from public.professionals where id=h.professional_id;
  select sum(duration_minutes)::integer into v_duration from public.services where id=any(h.service_ids);
  insert into public.bookings(customer_profile_id,professional_id,professional_name_snapshot,mode,assignment_mode_snapshot,starts_at,ends_at,total_duration_minutes,status,business_timezone_snapshot,minimum_notice_minutes_snapshot,booking_horizon_days_snapshot,cancellation_notice_minutes_snapshot,approval_deadline_at) values(v_customer,h.professional_id,v_name,h.mode,s.professional_assignment_mode,h.starts_at,h.ends_at,v_duration,'pending',s.business_timezone,s.minimum_notice_minutes,s.booking_horizon_days,s.cancellation_notice_minutes,least(clock_timestamp()+make_interval(mins=>s.approval_max_pending_minutes),h.starts_at-make_interval(mins=>s.approval_cutoff_before_start_minutes))) returning id into v_booking;
  insert into public.booking_services(booking_id,service_id,position,service_name_snapshot,price_pen_centavos_snapshot,duration_minutes_snapshot) select v_booking,srv.id,u.ordinality::smallint,srv.name,srv.price_pen_centavos,srv.duration_minutes from unnest(h.service_ids) with ordinality u(id,ordinality) join public.services srv on srv.id=u.id;
  if h.mode='domicilio' then insert into public.booking_addresses(booking_id,address_line,district,reference,additional_instructions) values(v_booking,p_address_line,p_district,p_reference,p_additional_instructions); end if;
  insert into public.booking_status_history(booking_id,event_type,to_status,actor_profile_id) values(v_booking,'created','pending',v_customer);
  update public.professional_time_allocations set allocation_kind='booking', booking_id=v_booking, hold_id=null, origin_hold_id=h.id, expires_at=null where hold_id=h.id and state='active';
  update public.booking_time_holds set status='converted', converted_booking_id=v_booking where id=h.id;
  return v_booking;
end;
$$;

create function public.cancel_own_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticacion requerida' using errcode='42501'; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.customer_profile_id <> auth.uid() then raise exception 'Reserva no encontrada' using errcode='42501'; end if;
  perform private.lock_booking_global(false); perform private.lock_booking_professional(b.professional_id);
  if b.status not in ('pending','confirmed') or b.starts_at <= clock_timestamp()+make_interval(mins=>b.cancellation_notice_minutes_snapshot) then raise exception 'Cancelacion no permitida' using errcode='55000'; end if;
  update public.bookings set status='cancelled' where id=b.id;
  update public.professional_time_allocations set state='released',released_at=clock_timestamp() where booking_id=b.id and state='active';
  insert into public.booking_status_history(booking_id,event_type,from_status,to_status,actor_profile_id) values(b.id,'cancelled',b.status,'cancelled',auth.uid());
end;
$$;

create function public.admin_confirm_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  select * into b from public.bookings where id=p_booking_id for update; if not found or b.status<>'pending' then raise exception 'Reserva no confirmable' using errcode='55000'; end if;
  if b.approval_deadline_at <= clock_timestamp() then raise exception 'Plazo de aprobacion vencido' using errcode='55000'; end if;
  perform private.lock_booking_global(false); perform private.lock_booking_professional(b.professional_id);
  update public.bookings set status='confirmed' where id=b.id;
  insert into public.booking_status_history(booking_id,event_type,from_status,to_status,actor_profile_id) values(b.id,'confirmed','pending','confirmed',auth.uid());
end;
$$;

create function public.admin_reject_booking(p_booking_id uuid, p_customer_reason text default null, p_internal_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  select * into b from public.bookings where id=p_booking_id for update; if not found or b.status<>'pending' then raise exception 'Reserva no rechazable' using errcode='55000'; end if;
  perform private.lock_booking_global(false); perform private.lock_booking_professional(b.professional_id);
  update public.bookings set status='rejected' where id=b.id; update public.professional_time_allocations set state='released',released_at=clock_timestamp() where booking_id=b.id and state='active';
  insert into public.booking_status_history(booking_id,event_type,from_status,to_status,actor_profile_id,customer_reason,internal_note) values(b.id,'rejected','pending','rejected',auth.uid(),p_customer_reason,p_internal_note);
end;
$$;

create function public.expire_booking_holds_and_proposals()
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  update public.professional_time_allocations set state='expired',released_at=clock_timestamp() where state='active' and expires_at <= clock_timestamp() and allocation_kind in ('hold','reschedule_proposal');
  update public.booking_time_holds set status='expired' where status='active' and expires_at <= clock_timestamp();
  update public.reschedule_proposals set status='expired',responded_at=clock_timestamp() where status='proposed' and expires_at <= clock_timestamp();
  for v_booking_id in
    update public.bookings set status='expired'
    where status='pending' and approval_deadline_at <= clock_timestamp()
    returning id
  loop
    update public.professional_time_allocations set state='expired', released_at=clock_timestamp()
    where booking_id=v_booking_id and state='active';
    insert into public.booking_status_history(booking_id,event_type,from_status,to_status,actor_profile_id)
    values(v_booking_id,'expired','pending','expired',auth.uid());
  end loop;
end;
$$;

revoke all on function private.lock_booking_global(boolean), private.lock_booking_professional(uuid), private.release_expired_holds(uuid), private.booking_slot_available(uuid,timestamptz,timestamptz,uuid[]) from public, anon, authenticated;
revoke all on function public.request_booking_hold(uuid[],public.service_mode,timestamptz,uuid,uuid,text), public.convert_hold_to_booking(uuid,text,text,text,text,text), public.cancel_own_booking(uuid), public.admin_confirm_booking(uuid), public.admin_reject_booking(uuid,text,text), public.expire_booking_holds_and_proposals() from public, anon;
grant execute on function public.request_booking_hold(uuid[],public.service_mode,timestamptz,uuid,uuid,text), public.convert_hold_to_booking(uuid,text,text,text,text,text), public.cancel_own_booking(uuid) to authenticated;
grant execute on function public.admin_confirm_booking(uuid), public.admin_reject_booking(uuid,text,text), public.expire_booking_holds_and_proposals() to authenticated;

-- Las modificaciones operativas pasan por RPC: el DML directo podria eludir la
-- comprobacion de ocupaciones activas que se incorpora mas abajo.

create function public.admin_propose_reschedule(p_booking_id uuid, p_professional_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype; s public.business_settings%rowtype; v_proposal uuid; v_name text; v_services uuid[];
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  select * into b from public.bookings where id=p_booking_id for update; if not found or b.status<>'confirmed' then raise exception 'Solo una reserva confirmada puede reprogramarse' using errcode='55000'; end if;
  select * into s from public.business_settings where id=1; if s.reschedule_proposal_ttl_minutes is null then raise exception 'Configuracion de reprogramacion incompleta' using errcode='55000'; end if;
  perform private.lock_booking_global(false);
  if b.professional_id < p_professional_id then perform private.lock_booking_professional(b.professional_id); perform private.lock_booking_professional(p_professional_id); else perform private.lock_booking_professional(p_professional_id); perform private.lock_booking_professional(b.professional_id); end if;
  select array_agg(service_id order by position) into v_services from public.booking_services where booking_id=b.id;
  if p_ends_at <> p_starts_at + make_interval(mins=>b.total_duration_minutes) or not private.booking_slot_available(p_professional_id,p_starts_at,p_ends_at,v_services) then raise exception 'Horario propuesto no disponible' using errcode='23P01'; end if;
  select display_name into v_name from public.professionals where id=p_professional_id;
  insert into public.reschedule_proposals(booking_id,original_professional_id,original_starts_at,original_ends_at,proposed_professional_id,proposed_professional_name_snapshot,proposed_starts_at,proposed_ends_at,expires_at,created_by_profile_id) values(b.id,b.professional_id,b.starts_at,b.ends_at,p_professional_id,v_name,p_starts_at,p_ends_at,least(clock_timestamp()+make_interval(mins=>s.reschedule_proposal_ttl_minutes),b.starts_at),auth.uid()) returning id into v_proposal;
  insert into public.professional_time_allocations(professional_id,allocation_kind,reschedule_proposal_id,starts_at,ends_at,expires_at) values(p_professional_id,'reschedule_proposal',v_proposal,p_starts_at,p_ends_at,least(clock_timestamp()+make_interval(mins=>s.reschedule_proposal_ttl_minutes),b.starts_at));
  insert into public.booking_status_history(booking_id,event_type,actor_profile_id) values(b.id,'reschedule_proposed',auth.uid());
  return v_proposal;
end;
$$;

create function public.respond_to_reschedule_proposal(p_proposal_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reschedule_proposals%rowtype; b public.bookings%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticacion requerida' using errcode='42501'; end if;
  select * into r from public.reschedule_proposals where id=p_proposal_id for update; if not found then raise exception 'Propuesta no encontrada' using errcode='42501'; end if;
  select * into b from public.bookings where id=r.booking_id for update; if b.customer_profile_id<>auth.uid() then raise exception 'Propuesta no autorizada' using errcode='42501'; end if;
  perform private.lock_booking_global(false);
  if b.professional_id < r.proposed_professional_id then perform private.lock_booking_professional(b.professional_id); perform private.lock_booking_professional(r.proposed_professional_id); else perform private.lock_booking_professional(r.proposed_professional_id); perform private.lock_booking_professional(b.professional_id); end if;
  if r.status<>'proposed' or r.expires_at<=clock_timestamp() then raise exception 'Propuesta no activa' using errcode='55000'; end if;
  if p_accept then
    update public.professional_time_allocations set state='released',released_at=clock_timestamp() where booking_id=b.id and state='active';
    update public.bookings set professional_id=r.proposed_professional_id,professional_name_snapshot=r.proposed_professional_name_snapshot,starts_at=r.proposed_starts_at,ends_at=r.proposed_ends_at where id=b.id;
    update public.professional_time_allocations set allocation_kind='booking',booking_id=b.id,reschedule_proposal_id=null,expires_at=null where reschedule_proposal_id=r.id and state='active';
    update public.reschedule_proposals set status='accepted',responded_at=clock_timestamp() where id=r.id;
    insert into public.booking_status_history(booking_id,event_type,actor_profile_id) values(b.id,'reschedule_accepted',auth.uid());
  else
    update public.professional_time_allocations set state='released',released_at=clock_timestamp() where reschedule_proposal_id=r.id and state='active';
    update public.reschedule_proposals set status='rejected',responded_at=clock_timestamp() where id=r.id;
    insert into public.booking_status_history(booking_id,event_type,actor_profile_id) values(b.id,'reschedule_rejected',auth.uid());
  end if;
end;
$$;

create function public.admin_withdraw_reschedule_proposal(p_proposal_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reschedule_proposals%rowtype;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  select * into r from public.reschedule_proposals where id=p_proposal_id for update; if not found or r.status<>'proposed' then raise exception 'Propuesta no retirable' using errcode='55000'; end if;
  perform private.lock_booking_global(false); perform private.lock_booking_professional(r.proposed_professional_id);
  update public.professional_time_allocations set state='released',released_at=clock_timestamp() where reschedule_proposal_id=r.id and state='active';
  update public.reschedule_proposals set status='withdrawn',responded_at=clock_timestamp() where id=r.id;
  insert into public.booking_status_history(booking_id,event_type,actor_profile_id) values(r.booking_id,'reschedule_withdrawn',auth.uid());
end;
$$;

create function public.admin_create_calendar_block(p_scope public.calendar_block_scope, p_professional_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_is_all_day boolean default false, p_internal_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  if p_scope='business' then perform private.lock_booking_global(true); else perform private.lock_booking_global(false); perform private.lock_booking_professional(p_professional_id); end if;
  if exists(select 1 from public.professional_time_allocations a where a.state='active' and (p_scope='business' or a.professional_id=p_professional_id) and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')) then raise exception 'Bloqueo incompatible con ocupacion activa' using errcode='23P01'; end if;
  insert into public.calendar_blocks(scope,professional_id,starts_at,ends_at,is_all_day,internal_reason) values(p_scope,p_professional_id,p_starts_at,p_ends_at,p_is_all_day,p_internal_reason) returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_create_working_hours(
  p_professional_id uuid, p_weekday smallint, p_starts_at time, p_ends_at time,
  p_effective_from date, p_effective_until date default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  perform private.lock_booking_global(false);
  perform private.lock_booking_professional(p_professional_id);
  insert into public.professional_working_hours(professional_id,weekday,starts_at,ends_at,effective_from,effective_until)
  values(p_professional_id,p_weekday,p_starts_at,p_ends_at,p_effective_from,p_effective_until)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_update_recurring_break(
  p_break_id uuid, p_is_active boolean, p_archived_at timestamptz default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_break public.professional_recurring_breaks%rowtype;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  select * into v_break from public.professional_recurring_breaks where id=p_break_id for update;
  if not found then raise exception 'Descanso no encontrado' using errcode='P0002'; end if;
  perform private.lock_booking_global(false);
  perform private.lock_booking_professional(v_break.professional_id);
  if exists (select 1 from public.professional_time_allocations a where a.professional_id=v_break.professional_id and a.state='active' and a.ends_at > clock_timestamp()) then
    raise exception 'Modificacion incompatible con ocupacion activa' using errcode='23P01';
  end if;
  update public.professional_recurring_breaks set is_active=p_is_active, archived_at=p_archived_at where id=p_break_id;
end;
$$;

create function public.admin_update_working_hours(
  p_working_hours_id uuid, p_starts_at time, p_ends_at time, p_effective_from date,
  p_effective_until date, p_is_active boolean, p_archived_at timestamptz default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_hours public.professional_working_hours%rowtype;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  select * into v_hours from public.professional_working_hours where id=p_working_hours_id for update;
  if not found then raise exception 'Horario no encontrado' using errcode='P0002'; end if;
  perform private.lock_booking_global(false); perform private.lock_booking_professional(v_hours.professional_id);
  if exists (select 1 from public.professional_time_allocations a where a.professional_id=v_hours.professional_id and a.state='active' and a.ends_at > clock_timestamp()) then
    raise exception 'Modificacion incompatible con ocupacion activa' using errcode='23P01';
  end if;
  update public.professional_working_hours set starts_at=p_starts_at, ends_at=p_ends_at, effective_from=p_effective_from, effective_until=p_effective_until, is_active=p_is_active, archived_at=p_archived_at where id=p_working_hours_id;
end;
$$;

create function public.admin_create_recurring_break(
  p_professional_id uuid, p_weekday smallint, p_starts_at time, p_ends_at time,
  p_effective_from date, p_effective_until date default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  perform private.lock_booking_global(false); perform private.lock_booking_professional(p_professional_id);
  if exists (select 1 from public.professional_time_allocations a where a.professional_id=p_professional_id and a.state='active' and a.ends_at > clock_timestamp()) then
    raise exception 'Modificacion incompatible con ocupacion activa' using errcode='23P01';
  end if;
  insert into public.professional_recurring_breaks(professional_id,weekday,starts_at,ends_at,effective_from,effective_until)
  values(p_professional_id,p_weekday,p_starts_at,p_ends_at,p_effective_from,p_effective_until) returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_update_calendar_block(
  p_block_id uuid, p_scope public.calendar_block_scope, p_professional_id uuid,
  p_starts_at timestamptz, p_ends_at timestamptz, p_is_all_day boolean,
  p_is_active boolean, p_archived_at timestamptz, p_internal_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.calendar_blocks%rowtype;
begin
  if not (select private.is_admin()) then raise exception 'Administrador requerido' using errcode='42501'; end if;
  select * into v_old from public.calendar_blocks where id=p_block_id for update;
  if not found then raise exception 'Bloqueo no encontrado' using errcode='P0002'; end if;
  if v_old.scope='business' or p_scope='business' then
    perform private.lock_booking_global(true);
  else
    perform private.lock_booking_global(false);
    if v_old.professional_id < p_professional_id then perform private.lock_booking_professional(v_old.professional_id); perform private.lock_booking_professional(p_professional_id);
    else perform private.lock_booking_professional(p_professional_id); perform private.lock_booking_professional(v_old.professional_id); end if;
  end if;
  if p_is_active and p_archived_at is null and exists (select 1 from public.professional_time_allocations a where a.state='active' and (p_scope='business' or a.professional_id=p_professional_id) and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')) then
    raise exception 'Bloqueo incompatible con ocupacion activa' using errcode='23P01';
  end if;
  update public.calendar_blocks set scope=p_scope, professional_id=p_professional_id, starts_at=p_starts_at, ends_at=p_ends_at, is_all_day=p_is_all_day, is_active=p_is_active, archived_at=p_archived_at, internal_reason=p_internal_reason where id=p_block_id;
end;
$$;

revoke insert, update, delete on table public.calendar_blocks, public.professional_working_hours, public.professional_recurring_breaks from authenticated;
revoke all on function public.admin_propose_reschedule(uuid,uuid,timestamptz,timestamptz), public.respond_to_reschedule_proposal(uuid,boolean), public.admin_withdraw_reschedule_proposal(uuid), public.admin_create_calendar_block(public.calendar_block_scope,uuid,timestamptz,timestamptz,boolean,text), public.admin_create_working_hours(uuid,smallint,time,time,date,date), public.admin_update_working_hours(uuid,time,time,date,date,boolean,timestamptz), public.admin_create_recurring_break(uuid,smallint,time,time,date,date), public.admin_update_recurring_break(uuid,boolean,timestamptz), public.admin_update_calendar_block(uuid,public.calendar_block_scope,uuid,timestamptz,timestamptz,boolean,boolean,timestamptz,text) from public, anon;
grant execute on function public.admin_propose_reschedule(uuid,uuid,timestamptz,timestamptz), public.respond_to_reschedule_proposal(uuid,boolean), public.admin_withdraw_reschedule_proposal(uuid), public.admin_create_calendar_block(public.calendar_block_scope,uuid,timestamptz,timestamptz,boolean,text), public.admin_create_working_hours(uuid,smallint,time,time,date,date), public.admin_update_working_hours(uuid,time,time,date,date,boolean,timestamptz), public.admin_create_recurring_break(uuid,smallint,time,time,date,date), public.admin_update_recurring_break(uuid,boolean,timestamptz), public.admin_update_calendar_block(uuid,public.calendar_block_scope,uuid,timestamptz,timestamptz,boolean,boolean,timestamptz,text) to authenticated;

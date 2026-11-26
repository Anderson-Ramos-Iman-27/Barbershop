-- Private address book and immutable per-booking location snapshots.
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  address_line text not null check (length(btrim(address_line)) between 1 and 300),
  district text not null check (length(btrim(district)) between 1 and 120),
  reference text check (reference is null or length(btrim(reference)) between 1 and 500),
  additional_instructions text check (additional_instructions is null or length(btrim(additional_instructions)) between 1 and 1000),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_addresses_owner_idx on public.customer_addresses(customer_profile_id, updated_at desc);
create trigger customer_addresses_updated before update on public.customer_addresses
  for each row execute function private.set_updated_at();
alter table public.customer_addresses enable row level security;
revoke all on public.customer_addresses from public, anon, authenticated;
grant select, delete on public.customer_addresses to authenticated;
grant insert(customer_profile_id,address_line,district,reference,additional_instructions,latitude,longitude) on public.customer_addresses to authenticated;
grant update(address_line,district,reference,additional_instructions,latitude,longitude) on public.customer_addresses to authenticated;
create policy customer_addresses_owner_read on public.customer_addresses for select to authenticated using(customer_profile_id=(select auth.uid()));
create policy customer_addresses_owner_insert on public.customer_addresses for insert to authenticated with check(customer_profile_id=(select auth.uid()));
create policy customer_addresses_owner_update on public.customer_addresses for update to authenticated using(customer_profile_id=(select auth.uid())) with check(customer_profile_id=(select auth.uid()));
create policy customer_addresses_owner_delete on public.customer_addresses for delete to authenticated using(customer_profile_id=(select auth.uid()));

-- Existing reservations keep their original data and nullable coordinates.
alter table public.booking_addresses alter column reference drop not null;
alter table public.booking_addresses add column latitude double precision, add column longitude double precision;
alter table public.booking_addresses add constraint booking_address_coordinates_valid check (
  (latitude is null and longitude is null) or
  (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
);

create function public.convert_hold_to_booking_with_address(
  p_hold_id uuid, p_request_fingerprint text,
  p_saved_address_id uuid default null,
  p_address_line text default null, p_district text default null,
  p_reference text default null, p_additional_instructions text default null,
  p_latitude double precision default null, p_longitude double precision default null,
  p_save_address boolean default false
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_customer uuid:=auth.uid(); h public.booking_time_holds%rowtype;
  s public.business_settings%rowtype; a public.customer_addresses%rowtype;
  v_booking uuid; v_name text; v_duration integer;
begin
  if v_customer is null then raise exception 'Autenticacion requerida' using errcode='42501'; end if;
  select * into h from public.booking_time_holds where id=p_hold_id for update;
  if not found or h.customer_profile_id<>v_customer then raise exception 'Retencion no encontrada' using errcode='42501'; end if;
  if h.request_fingerprint is distinct from p_request_fingerprint then raise exception 'Huella de solicitud invalida' using errcode='23514'; end if;
  perform private.lock_booking_global(false);
  perform private.lock_booking_professional(h.professional_id);
  perform private.release_expired_holds(h.professional_id);
  select * into h from public.booking_time_holds where id=p_hold_id for update;
  if h.status='converted' then return h.converted_booking_id; end if;
  if h.status<>'active' or h.expires_at<=clock_timestamp() then raise exception 'Retencion vencida o no activa' using errcode='55000'; end if;
  select * into s from public.business_settings where id=1;
  if not s.booking_enabled or s.professional_assignment_mode is null or s.approval_max_pending_minutes is null or s.approval_cutoff_before_start_minutes is null or s.cancellation_notice_minutes is null then raise exception 'Reservas no disponibles' using errcode='55000'; end if;
  if h.mode='domicilio' then
    if p_saved_address_id is not null then
      select * into a from public.customer_addresses where id=p_saved_address_id and customer_profile_id=v_customer for share;
      if not found then raise exception 'Direccion no disponible' using errcode='42501'; end if;
    else
      a.address_line:=btrim(p_address_line); a.district:=btrim(p_district);
      a.reference:=nullif(btrim(p_reference),''); a.additional_instructions:=nullif(btrim(p_additional_instructions),'');
      a.latitude:=p_latitude; a.longitude:=p_longitude;
    end if;
    if a.address_line is null or length(btrim(a.address_line)) not between 1 and 300
      or a.district is null or length(btrim(a.district)) not between 1 and 120
      or (a.reference is not null and length(a.reference) not between 1 and 500)
      or (a.additional_instructions is not null and length(a.additional_instructions) not between 1 and 1000)
      or a.latitude is null or a.longitude is null
      or not (a.latitude between -90 and 90 and a.longitude between -180 and 180) then
      raise exception 'Completa la direccion y selecciona un punto valido en el mapa' using errcode='23514';
    end if;
  end if;
  select display_name into v_name from public.professionals where id=h.professional_id;
  select sum(duration_minutes)::integer into v_duration from public.services where id=any(h.service_ids);
  insert into public.bookings(customer_profile_id,professional_id,professional_name_snapshot,mode,assignment_mode_snapshot,starts_at,ends_at,total_duration_minutes,status,business_timezone_snapshot,minimum_notice_minutes_snapshot,booking_horizon_days_snapshot,cancellation_notice_minutes_snapshot,approval_deadline_at)
  values(v_customer,h.professional_id,v_name,h.mode,s.professional_assignment_mode,h.starts_at,h.ends_at,v_duration,'pending',s.business_timezone,s.minimum_notice_minutes,s.booking_horizon_days,s.cancellation_notice_minutes,least(clock_timestamp()+make_interval(mins=>s.approval_max_pending_minutes),h.starts_at-make_interval(mins=>s.approval_cutoff_before_start_minutes))) returning id into v_booking;
  insert into public.booking_services(booking_id,service_id,position,service_name_snapshot,price_pen_centavos_snapshot,duration_minutes_snapshot)
  select v_booking,srv.id,u.ordinality::smallint,srv.name,srv.price_pen_centavos,srv.duration_minutes from unnest(h.service_ids) with ordinality u(id,ordinality) join public.services srv on srv.id=u.id;
  if h.mode='domicilio' then
    insert into public.booking_addresses(booking_id,address_line,district,reference,additional_instructions,latitude,longitude)
      values(v_booking,a.address_line,a.district,a.reference,a.additional_instructions,a.latitude,a.longitude);
    if coalesce(p_save_address,false) and p_saved_address_id is null then
      insert into public.customer_addresses(customer_profile_id,address_line,district,reference,additional_instructions,latitude,longitude)
        values(v_customer,a.address_line,a.district,a.reference,a.additional_instructions,a.latitude,a.longitude);
    end if;
  end if;
  insert into public.booking_status_history(booking_id,event_type,to_status,actor_profile_id) values(v_booking,'created','pending',v_customer);
  update public.professional_time_allocations set allocation_kind='booking',booking_id=v_booking,hold_id=null,origin_hold_id=h.id,expires_at=null where hold_id=h.id and state='active';
  update public.booking_time_holds set status='converted',converted_booking_id=v_booking where id=h.id;
  return v_booking;
end;
$$;
revoke all on function public.convert_hold_to_booking_with_address(uuid,text,uuid,text,text,text,text,double precision,double precision,boolean) from public,anon,authenticated;
grant execute on function public.convert_hold_to_booking_with_address(uuid,text,uuid,text,text,text,text,double precision,double precision,boolean) to authenticated;

-- Keep the local-booking API signature. Domicilio now requires the location RPC;
-- the legacy entry point cannot bypass coordinate validation.
create or replace function public.convert_hold_to_booking(p_hold_id uuid,p_request_fingerprint text,p_address_line text default null,p_district text default null,p_reference text default null,p_additional_instructions text default null)
returns uuid language sql security definer set search_path='' as $$
  select public.convert_hold_to_booking_with_address(p_hold_id,p_request_fingerprint,null,p_address_line,p_district,p_reference,p_additional_instructions);
$$;
revoke all on function public.convert_hold_to_booking(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.convert_hold_to_booking(uuid,text,text,text,text,text) to authenticated;

-- Tests the existing admin RPCs. All synthetic rows are rolled back.
-- The internal hold fixture tests the occupied-professional guard, not booking creation.
begin;
do $$
declare p uuid; administrator uuid; customer uuid;
begin
  select id into administrator from public.profiles where role='admin' limit 1;
  select id into customer from public.profiles where role='customer' limit 1;
  if administrator is null or customer is null then raise exception 'Existing admin and customer required'; end if;
  insert into public.professionals(display_name,is_active,is_published) values('__hours_crud_rollback__',true,false) returning id into p;
  perform set_config('app.hours_crud_professional',p::text,true);
  perform set_config('app.hours_crud_customer',customer::text,true);
  perform set_config('app.hours_crud_admin',administrator::text,true);
  perform set_config('request.jwt.claim.sub',administrator::text,true);
end;
$$;
set local role authenticated;
do $$
declare p uuid:=current_setting('app.hours_crud_professional')::uuid; ids uuid[]; h uuid; first_day date:=(clock_timestamp() at time zone 'America/Lima')::date;
begin
  ids:=public.admin_create_working_hours_batch(p,array[1,3]::smallint[],'09:00','12:00',first_day,null);
  if cardinality(ids)<>2 then raise exception 'FAIL: batch creation'; end if;
  select id into h from public.professional_working_hours where professional_id=p and weekday=1;
  perform set_config('app.hours_crud_turn',h::text,true);
  perform public.admin_update_working_hours(h,'10:00','12:00',first_day,null,true,null);
  if not exists(select 1 from public.professional_working_hours where id=h and starts_at='10:00'::time) then raise exception 'FAIL: edit'; end if;
  perform public.admin_create_working_hours(p,1::smallint,'14:00','16:00',first_day,null);
  begin
    perform public.admin_update_working_hours(h,'11:00','15:00',first_day,null,true,null);
    raise exception 'FAIL: overlapping edit accepted';
  exception when exclusion_violation then null; end;
  if not exists(select 1 from public.professional_working_hours where id=h and starts_at='10:00'::time and ends_at='12:00'::time) then raise exception 'FAIL: failed edit changed row'; end if;
  perform public.admin_update_working_hours(h,'10:00','12:00',first_day,null,false,null);
  if (select is_active from public.professional_working_hours where id=h) then raise exception 'FAIL: deactivate'; end if;
  perform public.admin_update_working_hours(h,'10:00','12:00',first_day,null,false,clock_timestamp());
  if not exists(select 1 from public.professional_working_hours where id=h and archived_at is not null and not is_active) then raise exception 'FAIL: logical removal'; end if;
  perform public.admin_update_working_hours(h,'10:00','12:00',first_day,null,true,null);
  if not exists(select 1 from public.professional_working_hours where id=h and archived_at is null and is_active) then raise exception 'FAIL: restore'; end if;
  begin
    perform public.admin_update_working_hours(h,'23:00','01:00',first_day,null,true,null);
    raise exception 'FAIL: overnight edit accepted';
  exception when check_violation then null; end;
  begin
    perform public.admin_update_working_hours(h,'10:00','12:00',first_day,first_day,true,null);
    raise exception 'FAIL: empty validity accepted';
  exception when check_violation then null; end;
  begin
    update public.professional_working_hours set is_active=false where id=h;
    raise exception 'FAIL: direct DML allowed';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',current_setting('app.hours_crud_customer'),true);
  begin
    perform public.admin_update_working_hours(h,'10:00','12:00',first_day,null,false,null);
    raise exception 'FAIL: customer executed admin RPC';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.professional_working_hours where professional_id=p) then raise exception 'FAIL: customer can read private working hours'; end if;
end;
$$;
reset role;
do $$
declare p uuid:=current_setting('app.hours_crud_professional')::uuid; hold uuid; service uuid; duration integer; slot timestamptz;
begin
  select id,duration_minutes into service,duration from public.services where is_active and duration_minutes is not null order by id limit 1;
  if service is null then raise exception 'Existing active service required for internal hold fixture'; end if;
  slot:=(date_trunc('week',clock_timestamp() at time zone 'America/Lima')+interval '7 days 10 hours') at time zone 'America/Lima';
  insert into public.booking_time_holds(customer_profile_id,professional_id,mode,service_ids,request_fingerprint,idempotency_key,starts_at,ends_at,expires_at)
    values(current_setting('app.hours_crud_customer')::uuid,p,'local',array[service],'__hours_crud_guard__',gen_random_uuid(),slot,slot+make_interval(mins=>duration),clock_timestamp()+interval '10 minutes') returning id into hold;
  insert into public.professional_time_allocations(professional_id,allocation_kind,hold_id,starts_at,ends_at,expires_at)
    select p,'hold',id,starts_at,ends_at,expires_at from public.booking_time_holds where id=hold;
  perform set_config('request.jwt.claim.sub',current_setting('app.hours_crud_admin'),true);
  if has_function_privilege('anon','public.admin_update_working_hours(uuid,time,time,date,date,boolean,timestamptz)','execute') then raise exception 'FAIL: anonymous EXECUTE'; end if;
end;
$$;
set local role authenticated;
do $$
declare h public.professional_working_hours%rowtype;
begin
  select * into h from public.professional_working_hours where id=current_setting('app.hours_crud_turn')::uuid;
  begin
    perform public.admin_update_working_hours(h.id,h.starts_at,h.ends_at,h.effective_from,h.effective_until,false,clock_timestamp());
    raise exception 'FAIL: occupied professional changed';
  exception when exclusion_violation then null; end;
  if not exists(select 1 from public.professional_working_hours where id=h.id and is_active and archived_at is null) then raise exception 'FAIL: failed archive changed occupancy source'; end if;
end;
$$;
reset role;
set constraints all immediate;
rollback;
select 'PASS: create, read, edit, multiple shifts, overlap rejection, deactivate, soft delete, restore, temporal validation, rollback, RLS, restricted DML/EXECUTE and occupied-professional guard. No production records changed.' as result;

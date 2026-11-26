-- No Auth identities are created. Synthetic catalog/booking rows and temporary
-- settings changes are confined to this transaction and always rolled back.
begin;
create temporary table address_check_context(customer_id uuid, other_id uuid, professional_id uuid, service_id uuid, address_id uuid, hold_id uuid, booking_id uuid, starts_at timestamptz) on commit drop;
grant all on address_check_context to authenticated;
do $$
declare c uuid; administrator uuid; p uuid; s uuid; slot timestamptz;
begin
  select id into c from public.profiles where role='customer' limit 1;
  select id into administrator from public.profiles where role='admin' limit 1;
  if c is null or administrator is null then raise exception 'Existing customer and administrator required'; end if;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  update public.business_settings set booking_enabled=true,professional_assignment_mode='customer_choice',minimum_notice_minutes=60,booking_horizon_days=30,approval_max_pending_minutes=180,approval_cutoff_before_start_minutes=60,cancellation_notice_minutes=60,reschedule_proposal_ttl_minutes=60 where id=1;
  insert into public.professionals(display_name,is_active,is_published) values('__address_rollback_check__',true,false) returning id into p;
  insert into public.services(name,description,price_pen_centavos,duration_minutes,is_active,is_published) values('__address_rollback_check__','Synthetic rollback fixture',1000,30,true,false) returning id into s;
  insert into public.service_modes(service_id,mode) values(s,'local'),(s,'domicilio');
  insert into public.professional_services(professional_id,service_id) values(p,s);
  insert into public.professional_working_hours(professional_id,weekday,starts_at,ends_at,effective_from)
    select p,d,'00:00'::time,'23:59'::time,current_date from generate_series(1,7) d;
  select candidate into slot from (select ((clock_timestamp() at time zone 'America/Lima')::date+d+time '10:00') at time zone 'America/Lima' as candidate from generate_series(2,20) d) slots
    where not exists(select 1 from public.calendar_blocks b where b.is_active and b.archived_at is null and b.professional_id is null and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(candidate,candidate+interval '4 hours','[)')) limit 1;
  if slot is null then raise exception 'No test interval free of global blocks'; end if;
  insert into address_check_context values(c,administrator,p,s,null,null,null,slot);
  perform set_config('request.jwt.claim.sub',c::text,true);
  if has_table_privilege('anon','public.customer_addresses','select') or has_table_privilege('anon','public.customer_addresses','insert') then raise exception 'FAIL: anonymous address access'; end if;
  if has_function_privilege('anon','public.convert_hold_to_booking_with_address(uuid,text,uuid,text,text,text,text,double precision,double precision,boolean)','execute') then raise exception 'FAIL: anonymous conversion'; end if;
end;
$$;
set local role authenticated;
do $$
declare x address_check_context%rowtype; a uuid; b uuid; h uuid; result uuid; before_count integer;
begin
  select * into x from address_check_context;
  insert into public.customer_addresses(customer_profile_id,address_line,district,latitude,longitude) values(x.customer_id,'__test_address__','__test_district__',-12.01,-77.01) returning id into a;
  insert into public.customer_addresses(customer_profile_id,address_line,district,latitude,longitude) values(x.customer_id,'__second_address__','__test_district__',-12.02,-77.02) returning id into b;
  update public.customer_addresses set reference='Optional test reference' where id=a;
  if (select count(*) from public.customer_addresses where id in(a,b))<>2 then raise exception 'FAIL: multiple own addresses'; end if;
  begin
    insert into public.customer_addresses(customer_profile_id,address_line,district,latitude,longitude) values(x.other_id,'__forbidden__','__test__',0,0);
    raise exception 'FAIL: ownership spoofing';
  exception when insufficient_privilege then null; end;
  begin
    update public.customer_addresses set latitude='NaN'::double precision where id=a;
    raise exception 'FAIL: NaN accepted';
  exception when check_violation then null; end;
  begin
    update public.customer_addresses set longitude=181 where id=a;
    raise exception 'FAIL: invalid coordinate accepted';
  exception when check_violation then null; end;
  perform set_config('request.jwt.claim.sub',x.other_id::text,true);
  if exists(select 1 from public.customer_addresses where id=a) then raise exception 'FAIL: another user address visible, including to admin'; end if;
  update public.customer_addresses set address_line='__forbidden__' where id=a;
  if found then raise exception 'FAIL: another user address update'; end if;
  delete from public.customer_addresses where id=a;
  if found then raise exception 'FAIL: another user address deletion'; end if;
  h:=public.request_booking_hold(array[x.service_id],'domicilio',x.starts_at,x.professional_id,gen_random_uuid(),'address-other');
  begin
    perform public.convert_hold_to_booking_with_address(h,'address-other',a);
    raise exception 'FAIL: another user address used in booking';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',x.customer_id::text,true);
  if (select address_line from public.customer_addresses where id=a)<>'__test_address__' then raise exception 'FAIL: failed operations changed source'; end if;
  h:=public.request_booking_hold(array[x.service_id],'domicilio',x.starts_at+interval '1 hour',x.professional_id,gen_random_uuid(),'address-own');
  begin
    perform public.convert_hold_to_booking(h,'address-own','__test__','__test__',null);
    raise exception 'FAIL: legacy RPC bypassed coordinate requirement';
  exception when check_violation then null; end;
  result:=public.convert_hold_to_booking_with_address(h,'address-own',a,'__spoofed__','__spoofed__',null,null,0,0);
  update address_check_context set address_id=a,hold_id=h,booking_id=result;
  if not exists(select 1 from public.booking_addresses where booking_id=result and address_line='__test_address__' and latitude=-12.01 and longitude=-77.01) then raise exception 'FAIL: saved address not loaded server-side'; end if;
  update public.customer_addresses set address_line='__edited__',latitude=1,longitude=1 where id=a;
  delete from public.customer_addresses where id=a;
  if not exists(select 1 from public.booking_addresses where booking_id=result and address_line='__test_address__' and latitude=-12.01 and longitude=-77.01) then raise exception 'FAIL: snapshot lost after edit/delete'; end if;
  if public.convert_hold_to_booking_with_address(h,'address-own',a)<>result then raise exception 'FAIL: conversion retry not idempotent after source deletion'; end if;
  begin
    perform public.convert_hold_to_booking_with_address(h,'wrong-fingerprint',a);
    raise exception 'FAIL: wrong fingerprint accepted';
  exception when check_violation then null; end;
  h:=public.request_booking_hold(array[x.service_id],'domicilio',x.starts_at+interval '2 hours',x.professional_id,gen_random_uuid(),'address-new');
  select count(*) into before_count from public.customer_addresses;
  begin
    perform public.convert_hold_to_booking_with_address(h,'address-new',null,'__new__','__district__',null,null,null,null,true);
    raise exception 'FAIL: missing coordinates accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.customer_addresses)<>before_count then raise exception 'FAIL: partial saved address'; end if;
  result:=public.convert_hold_to_booking_with_address(h,'address-new',null,'__new__','__district__',null,null,-12.03,-77.03,true);
  if not exists(select 1 from public.booking_addresses where booking_id=result and reference is null and latitude=-12.03) then raise exception 'FAIL: optional reference or new snapshot'; end if;
  if (select count(*) from public.customer_addresses)<>before_count+1 then raise exception 'FAIL: explicit save not performed'; end if;
  perform public.convert_hold_to_booking_with_address(h,'address-new',null,'__new__','__district__',null,null,-12.03,-77.03,true);
  if (select count(*) from public.customer_addresses)<>before_count+1 then raise exception 'FAIL: repeated conversion saved duplicate address'; end if;
  h:=public.request_booking_hold(array[x.service_id],'local',x.starts_at+interval '3 hours',x.professional_id,gen_random_uuid(),'address-legacy-local');
  result:=public.convert_hold_to_booking(h,'address-legacy-local');
  if exists(select 1 from public.booking_addresses where booking_id=result) or not exists(select 1 from public.bookings where id=result and mode='local' and status='pending') then raise exception 'FAIL: local booking compatibility'; end if;
  perform set_config('request.jwt.claim.sub',x.other_id::text,true);
  if not exists(select 1 from public.booking_addresses ba join address_check_context ctx on ba.booking_id=ctx.booking_id where ba.latitude=-12.01 and ba.longitude=-77.01) then raise exception 'FAIL: administrator cannot read booking location snapshot'; end if;
end;
$$;
reset role;
do $$
declare x address_check_context%rowtype;
begin
  select * into x from address_check_context;
  if not exists(select 1 from public.professional_time_allocations where booking_id=x.booking_id and state='active' and origin_hold_id=x.hold_id) then raise exception 'FAIL: allocation not transferred'; end if;
end;
$$;
set constraints all immediate;
rollback;
select 'PASS: address CRUD, multi-address ownership, coordinate validation, protected conversion, optional reference, immutable snapshots, idempotency, local booking compatibility, administrator snapshot access and deferred integrity; all fixtures rolled back' as result;

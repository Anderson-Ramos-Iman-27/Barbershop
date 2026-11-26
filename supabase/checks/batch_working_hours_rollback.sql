-- Explicit transactional check. Synthetic fixtures are rolled back; no Auth users.
begin;
do $$
declare professional uuid; administrator uuid;
begin
  select id into administrator from public.profiles where role = 'admin' limit 1;
  if administrator is null then raise exception 'An existing administrator is required for this check'; end if;
  insert into public.professionals(display_name,is_active,is_published)
    values('__transactional_hours_check__',true,false) returning id into professional;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  perform set_config('app.hours_check_professional',professional::text,true);
end;
$$;
set local role authenticated;
do $$
declare professional uuid := current_setting('app.hours_check_professional')::uuid; ids uuid[];
begin
  ids := public.admin_create_working_hours_batch(professional,array[1,3]::smallint[],'09:00','10:00','2090-01-01',null);
  if cardinality(ids) <> 2 or (select count(*) from public.professional_working_hours where professional_id=professional) <> 2 then
    raise exception 'FAIL: selected weekdays were not created';
  end if;
  begin
    perform public.admin_create_working_hours_batch(professional,array[2,3]::smallint[],'09:30','10:30','2090-01-01',null);
    raise exception 'FAIL: conflicting day accepted';
  exception when exclusion_violation then null;
  end;
  if exists(select 1 from public.professional_working_hours where professional_id=professional and weekday=2) then
    raise exception 'FAIL: partial batch persisted';
  end if;
  begin
    perform public.admin_create_working_hours_batch(professional,array[2,2]::smallint[],'11:00','12:00','2090-01-01',null);
    raise exception 'FAIL: duplicate days accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.admin_create_working_hours_batch(professional,array[]::smallint[],'11:00','12:00','2090-01-01',null);
    raise exception 'FAIL: empty days accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.admin_create_working_hours_batch(professional,array[8]::smallint[],'11:00','12:00','2090-01-01',null);
    raise exception 'FAIL: invalid day accepted';
  exception when check_violation then null;
  end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.admin_create_working_hours_batch(professional,array[2]::smallint[],'11:00','12:00','2090-01-01',null);
    raise exception 'FAIL: non-administrator accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.admin_create_working_hours_batch(uuid,smallint[],time,time,date,date)','execute') then
    raise exception 'FAIL: anonymous execution granted';
  end if;
end; $$;
rollback;

-- All selected weekdays are created in one transaction through the existing
-- controlled operation. A conflict rolls the whole batch back.
create function public.admin_create_working_hours_batch(
  p_professional_id uuid,
  p_weekdays smallint[],
  p_starts_at time,
  p_ends_at time,
  p_effective_from date,
  p_effective_until date default null
) returns uuid[] language plpgsql security definer set search_path = '' as $$
declare day smallint; created uuid[] := '{}'::uuid[];
begin
  if not (select private.is_admin()) then
    raise exception 'Administrador requerido' using errcode = '42501';
  end if;
  if p_professional_id is null or p_weekdays is null or cardinality(p_weekdays) not between 1 and 7
    or exists(select 1 from unnest(p_weekdays) d where d is null or d not between 1 and 7)
    or cardinality(p_weekdays) <> (select count(distinct d) from unnest(p_weekdays) d) then
    raise exception 'Selecciona dias validos sin duplicados' using errcode = '23514';
  end if;
  perform private.lock_booking_global(false);
  perform private.lock_booking_professional(p_professional_id);
  for day in select d from unnest(p_weekdays) d order by d loop
    created := array_append(created, public.admin_create_working_hours(
      p_professional_id, day, p_starts_at, p_ends_at, p_effective_from, p_effective_until
    ));
  end loop;
  return created;
end;
$$;
revoke all on function public.admin_create_working_hours_batch(uuid, smallint[], time, time, date, date) from public, anon, authenticated;
grant execute on function public.admin_create_working_hours_batch(uuid, smallint[], time, time, date, date) to authenticated;

-- Fase 2B.5: configuracion y consulta de disponibilidad de solo lectura.

alter table public.business_settings
  add column booking_slot_interval_minutes smallint not null default 15
  check (booking_slot_interval_minutes in (15, 30, 60));

comment on column public.business_settings.booking_slot_interval_minutes is
  'Granularidad de los inicios de reserva en minutos. No cambia la duracion de los servicios.';

-- La auditoria y RLS de business_settings ya limitan esta actualizacion a admins.
grant update (booking_slot_interval_minutes) on public.business_settings to authenticated;

create function public.get_booking_availability(
  p_date date,
  p_service_ids uuid[],
  p_mode public.service_mode,
  p_professional_id uuid default null
) returns table (starts_at timestamptz, ends_at timestamptz, professional_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  s public.business_settings%rowtype;
  v_duration integer;
  v_start timestamptz;
  v_end timestamptz;
  v_local_start timestamp;
  v_now timestamptz := clock_timestamp();
  p record;
begin
  select * into s from public.business_settings where id = 1;
  if not found or not s.booking_enabled then
    return;
  end if;

  if p_date is null or p_mode is null or p_service_ids is null or cardinality(p_service_ids) = 0
    or cardinality(p_service_ids) <> (select count(distinct x) from unnest(p_service_ids) x) then
    raise exception 'Parametros de disponibilidad invalidos' using errcode = '23514';
  end if;

  select sum(srv.duration_minutes)::integer
  into v_duration
  from public.services srv
  where srv.id = any(p_service_ids)
    and srv.is_active
    and srv.archived_at is null
    and srv.duration_minutes is not null
    and exists (
      select 1
      from public.service_modes sm
      where sm.service_id = srv.id and sm.mode = p_mode and sm.is_active
    );

  if v_duration is null
    or (
      select count(*)
      from public.services srv
      where srv.id = any(p_service_ids)
        and srv.is_active
        and srv.archived_at is null
        and exists (
          select 1 from public.service_modes sm
          where sm.service_id = srv.id and sm.mode = p_mode and sm.is_active
        )
    ) <> cardinality(p_service_ids) then
    return;
  end if;

  -- La serie se genera en hora local del negocio: 15/30/60 representan inicios,
  -- no duraciones. booking_slot_available exige que todo el intervalo quede dentro
  -- de una jornada efectiva y no cruce el dia local.
  for v_local_start in
    select generate_series(
      p_date::timestamp,
      p_date::timestamp + interval '1 day' - make_interval(mins => s.booking_slot_interval_minutes),
      make_interval(mins => s.booking_slot_interval_minutes)
    )
  loop
    v_start := v_local_start at time zone s.business_timezone;
    v_end := v_start + make_interval(mins => v_duration);

    if v_start < v_now + make_interval(mins => s.minimum_notice_minutes)
      or v_start > v_now + make_interval(days => s.booking_horizon_days) then
      continue;
    end if;

    for p in
      select pr.id
      from public.professionals pr
      where pr.is_active
        and pr.archived_at is null
        and (p_professional_id is null or pr.id = p_professional_id)
        and (
          select count(*)
          from public.professional_services ps
          where ps.professional_id = pr.id
            and ps.is_active
            and ps.service_id = any(p_service_ids)
        ) = cardinality(p_service_ids)
      order by (
        select count(*)
        from public.professional_time_allocations a
        where a.professional_id = pr.id
          and a.allocation_kind = 'booking'
          and a.state = 'active'
          and a.starts_at > v_now
      ), pr.sort_order, pr.id
    loop
      if private.booking_slot_available(p.id, v_start, v_end, p_service_ids) then
        starts_at := v_start;
        ends_at := v_end;
        professional_id := p.id;
        return next;
        if p_professional_id is null then
          exit;
        end if;
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.get_booking_availability(date,uuid[],public.service_mode,uuid) from public;
grant execute on function public.get_booking_availability(date,uuid[],public.service_mode,uuid) to anon, authenticated;

comment on function public.get_booking_availability(date,uuid[],public.service_mode,uuid) is
  'Consulta no vinculante: la RPC de hold vuelve a validar disponibilidad y concurrencia.';

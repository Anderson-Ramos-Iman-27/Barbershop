begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- Datos locales aislados. La fecha se calcula en America/Lima para verificar
-- que la serie de disponibilidad no se genere con el dia UTC.
insert into auth.users (id, email) values
  ('50000000-0000-0000-0000-000000000001', 'availability-customer@example.test'),
  ('50000000-0000-0000-0000-000000000002', 'availability-admin@example.test');
update public.profiles set role = 'admin' where id = '50000000-0000-0000-0000-000000000002';

insert into public.services (id, name, description, price_pen_centavos, duration_minutes, is_active, is_published) values
  ('50000000-0000-0000-0000-000000000010', 'Servicio disponibilidad 30', 'Dato local de prueba', 1000, 30, true, true),
  ('50000000-0000-0000-0000-000000000011', 'Servicio disponibilidad 45', 'Dato local de prueba', 1200, 45, true, true),
  ('50000000-0000-0000-0000-000000000012', 'Servicio inactivo', 'Dato local de prueba', 900, 30, false, false);
insert into public.service_modes (service_id, mode) values
  ('50000000-0000-0000-0000-000000000010', 'local'),
  ('50000000-0000-0000-0000-000000000011', 'local'),
  ('50000000-0000-0000-0000-000000000012', 'local');
insert into public.professionals (id, display_name, is_active, is_published, sort_order) values
  ('50000000-0000-0000-0000-000000000020', 'Profesional disponibilidad A', true, true, 1),
  ('50000000-0000-0000-0000-000000000021', 'Profesional disponibilidad B', true, true, 2),
  ('50000000-0000-0000-0000-000000000022', 'Profesional incompatible', true, true, 3);
insert into public.professional_services (professional_id, service_id) values
  ('50000000-0000-0000-0000-000000000020', '50000000-0000-0000-0000-000000000010'),
  ('50000000-0000-0000-0000-000000000020', '50000000-0000-0000-0000-000000000011'),
  ('50000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000010');

create temporary table availability_context (
  target_date date not null,
  p1 uuid not null,
  p2 uuid not null,
  p3 uuid not null,
  customer_id uuid not null,
  admin_id uuid not null,
  service_30 uuid not null,
  service_45 uuid not null,
  inactive_service uuid not null
) on commit drop;
insert into availability_context values (
  (timezone('America/Lima', clock_timestamp())::date + 2),
  '50000000-0000-0000-0000-000000000020',
  '50000000-0000-0000-0000-000000000021',
  '50000000-0000-0000-0000-000000000022',
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000010',
  '50000000-0000-0000-0000-000000000011',
  '50000000-0000-0000-0000-000000000012'
);
grant select on availability_context to authenticated;
grant select on availability_context to anon;

-- La configuracion inicial conserva reservas deshabilitadas y granularidad 15.
select is((select booking_slot_interval_minutes::integer from public.business_settings where id = 1), 15,
  'La granularidad inicial persistente es de 15 minutos');
select is_empty($$select * from public.get_booking_availability(current_date, array['50000000-0000-0000-0000-000000000010'::uuid], 'local', '50000000-0000-0000-0000-000000000020'::uuid)$$,
  'Con booking_enabled=false no se ofrecen horarios');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select throws_ok($$update public.business_settings set booking_slot_interval_minutes = 20 where id = 1$$, '23514', null,
  'La configuracion solo admite 15, 30 o 60 minutos');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
update public.business_settings
set booking_enabled = true,
    professional_assignment_mode = 'customer_choice',
    approval_max_pending_minutes = 1440,
    approval_cutoff_before_start_minutes = 360,
    cancellation_notice_minutes = 720,
    reschedule_proposal_ttl_minutes = 360
where id = 1;
reset role;

insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
select p, extract(isodow from c.target_date)::smallint, '09:00'::time, '17:00'::time, c.target_date
from availability_context c
cross join unnest(array[c.p1, c.p2]) as p;

select ok(exists(
  select 1 from public.get_booking_availability(
    (select target_date from availability_context),
    array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
  ) a
  where timezone('America/Lima', a.starts_at)::time = '09:00'::time
), 'Una jornada efectiva genera horarios dentro del intervalo laboral');
select ok(not exists(
  select 1 from public.get_booking_availability(
    (select target_date from availability_context),
    array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
  ) a
  where timezone('America/Lima', a.starts_at)::time < '09:00'::time
     or timezone('America/Lima', a.ends_at)::time > '17:00'::time
), 'No se generan inicios fuera de la jornada ni intervalos que excedan su fin');
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context),
  array[(select service_30 from availability_context)], 'local', (select p3 from availability_context)
)$$, 'Un profesional sin servicio o jornada compatible no ofrece horarios');

select ok(not exists(
  select 1 from public.get_booking_availability(
    (select target_date from availability_context),
    array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
  ) a
  where extract(minute from timezone('America/Lima', a.starts_at))::integer % 15 <> 0
), 'Granularidad de 15 minutos alinea todos los inicios locales');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
update public.business_settings set booking_slot_interval_minutes = 30 where id = 1;
reset role;
select ok(not exists(
  select 1 from public.get_booking_availability((select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)) a
  where extract(minute from timezone('America/Lima', a.starts_at))::integer % 30 <> 0
), 'Granularidad de 30 minutos se respeta');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
update public.business_settings set booking_slot_interval_minutes = 60 where id = 1;
reset role;
select ok(not exists(
  select 1 from public.get_booking_availability((select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)) a
  where extract(minute from timezone('America/Lima', a.starts_at))::integer <> 0
), 'Granularidad de 60 minutos se respeta');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
update public.business_settings set booking_slot_interval_minutes = 15 where id = 1;
reset role;

insert into public.professional_recurring_breaks (professional_id, weekday, starts_at, ends_at, effective_from)
select p1, extract(isodow from target_date)::smallint, '10:00'::time, '11:00'::time, target_date from availability_context;
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
) a where tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(((select target_date from availability_context)::timestamp + time '10:00') at time zone 'America/Lima', ((select target_date from availability_context)::timestamp + time '11:00') at time zone 'America/Lima', '[)')$$,
  'Un descanso recurrente excluye cualquier intervalo solapado');

insert into public.calendar_blocks (scope, starts_at, ends_at, is_all_day)
select 'business', (target_date::timestamp + time '12:00') at time zone 'America/Lima', (target_date::timestamp + time '13:00') at time zone 'America/Lima', false from availability_context;
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
) a where tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(((select target_date from availability_context)::timestamp + time '12:00') at time zone 'America/Lima', ((select target_date from availability_context)::timestamp + time '13:00') at time zone 'America/Lima', '[)')$$,
  'Un bloqueo global excluye el intervalo afectado');
insert into public.calendar_blocks (scope, professional_id, starts_at, ends_at, is_all_day)
select 'professional', p1, (target_date::timestamp + time '13:00') at time zone 'America/Lima', (target_date::timestamp + time '14:00') at time zone 'America/Lima', false from availability_context;
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
) a where tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(((select target_date from availability_context)::timestamp + time '13:00') at time zone 'America/Lima', ((select target_date from availability_context)::timestamp + time '14:00') at time zone 'America/Lima', '[)')$$,
  'Un bloqueo profesional excluye solo el profesional afectado');

select ok(exists(
  select 1 from public.get_booking_availability(
    (select target_date from availability_context),
    array[(select service_30 from availability_context), (select service_45 from availability_context)], 'local', (select p1 from availability_context)
  ) a
  where a.ends_at = a.starts_at + interval '75 minutes'
), 'Varios servicios suman su duracion real sin depender de la granularidad');
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select inactive_service from availability_context)], 'local', (select p1 from availability_context)
)$$, 'Un servicio inactivo no ofrece horarios');
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select service_45 from availability_context)], 'local', (select p2 from availability_context)
)$$, 'Un profesional no habilitado para todos los servicios no ofrece horarios');

-- Retencion real: la consulta no crea una nueva retencion y excluye la allocation activa.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
create temporary table hold_context(id uuid, starts_at timestamptz) on commit drop;
grant select on hold_context to authenticated;
insert into hold_context
select public.request_booking_hold(array[c.service_30], 'local', (c.target_date::timestamp + time '14:00') at time zone 'America/Lima', c.p1,
  '50000000-0000-0000-0000-000000000030', 'availability-hold'),
  (c.target_date::timestamp + time '14:00') at time zone 'America/Lima'
from availability_context c;
reset role;
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
) a where a.starts_at = (select starts_at from hold_context)$$,
  'Una retencion activa se excluye mediante la fuente unificada de ocupacion');
select is((select count(*)::integer from public.booking_time_holds where id = (select id from hold_context)), 1,
  'Consultar disponibilidad no crea holds adicionales');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
create temporary table booking_context(id uuid) on commit drop;
grant select on booking_context to authenticated;
insert into booking_context select public.convert_hold_to_booking(id, 'availability-hold') from hold_context;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select public.admin_confirm_booking(id) from booking_context;
reset role;
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context)
) a where a.starts_at = (select starts_at from hold_context)$$,
  'Las reservas pending y confirmed permanecen excluidas por la allocation activa');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
create temporary table proposal_context(id uuid) on commit drop;
grant select on proposal_context to authenticated;
insert into proposal_context
select public.admin_propose_reschedule(
  b.id, c.p2,
  (c.target_date::timestamp + time '15:00') at time zone 'America/Lima',
  (c.target_date::timestamp + time '15:30') at time zone 'America/Lima'
)
from booking_context b cross join availability_context c;
reset role;
select is_empty($$select * from public.get_booking_availability(
  (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p2 from availability_context)
) a where timezone('America/Lima', a.starts_at)::time = '15:00'::time$$,
  'Una propuesta de reprogramacion activa excluye su ocupacion temporal');

select ok((
  select count(*) = 1
  from public.get_booking_availability(
    (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', null
  ) a
  where timezone('America/Lima', a.starts_at)::time = '09:00'::time
), 'La asignacion automatica devuelve un unico profesional con el orden existente');

select is_empty($$select * from public.get_booking_availability(
  timezone('America/Lima', clock_timestamp())::date,
  array['50000000-0000-0000-0000-000000000010'::uuid], 'local', '50000000-0000-0000-0000-000000000020'::uuid
)$$, 'La anticipacion minima evita horarios del dia actual');
select is_empty($$select * from public.get_booking_availability(
  timezone('America/Lima', clock_timestamp())::date + 31,
  array['50000000-0000-0000-0000-000000000010'::uuid], 'local', '50000000-0000-0000-0000-000000000020'::uuid
)$$, 'El horizonte maximo evita horarios mas alla de la configuracion');
select ok(exists(
  select 1 from public.get_booking_availability(
    (select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p2 from availability_context)
  ) a where timezone('America/Lima', a.starts_at)::time = '16:30'::time
       and timezone('America/Lima', a.ends_at)::time = '17:00'::time
), 'Los intervalos semiabiertos admiten un fin exacto en el limite de jornada');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
select lives_ok($$select * from public.get_booking_availability((select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context))$$,
  'Authenticated puede ejecutar la RPC sin recibir acceso directo a tablas internas');
reset role;
set local role anon;
select lives_ok($$select * from public.get_booking_availability((select target_date from availability_context), array[(select service_30 from availability_context)], 'local', (select p1 from availability_context))$$,
  'Anon puede ejecutar exclusivamente la RPC de disponibilidad');
reset role;
select ok(not has_function_privilege('anon', 'private.booking_slot_available(uuid,timestamptz,timestamptz,uuid[])', 'EXECUTE'),
  'Anon no obtiene acceso directo a la funcion interna ni a datos privados');
select throws_ok($$select * from public.get_booking_availability((select target_date from availability_context), array[(select service_30 from availability_context), (select service_30 from availability_context)], 'local', (select p1 from availability_context))$$,
  '23514', null, 'Servicios duplicados se rechazan para evitar resultados ambiguos');

select * from finish();
rollback;

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email) values
  ('11111111-2222-3333-4444-555555555551', 'booking-customer@example.test'),
  ('11111111-2222-3333-4444-555555555552', 'booking-admin@example.test');

update public.profiles set role = 'admin'
where id = '11111111-2222-3333-4444-555555555552'::uuid;

insert into public.professionals (id, display_name)
values ('11111111-2222-3333-4444-555555555553', 'Profesional de seguridad');

select ok(
  not has_function_privilege('anon', 'public.request_booking_hold(uuid[], public.service_mode, timestamptz, uuid, uuid, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.is_admin()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.bootstrap_initial_admin(uuid)', 'EXECUTE'),
  'Funciones de reserva y autorizacion privada no se exponen a anon ni clientes'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-2222-3333-4444-555555555551', true);

select throws_ok(
  $$select public.request_booking_hold(array[]::uuid[], 'local'::public.service_mode, clock_timestamp() + interval '2 days', null, '11111111-2222-3333-4444-555555555554'::uuid, 'disabled')$$,
  '55000', null, 'Las solicitudes se rechazan mientras booking_enabled permanece false'
);

select is_empty(
  $$select id from public.bookings$$,
  'Un cliente no puede leer reservas ajenas'
);

select throws_ok(
  $$insert into public.bookings(customer_profile_id, professional_id, professional_name_snapshot, mode, assignment_mode_snapshot, starts_at, ends_at, total_duration_minutes, business_timezone_snapshot, minimum_notice_minutes_snapshot, booking_horizon_days_snapshot, cancellation_notice_minutes_snapshot, approval_deadline_at) values ('11111111-2222-3333-4444-555555555551'::uuid, '11111111-2222-3333-4444-555555555553'::uuid, 'Manipulado', 'local', 'customer_choice', clock_timestamp()+interval '2 days', clock_timestamp()+interval '2 days 30 minutes', 30, 'America/Lima', 1440, 30, 720, clock_timestamp()+interval '1 day')$$,
  '42501', null, 'Un cliente no puede insertar reservas ni snapshots directamente'
);

select throws_ok(
  $$select public.admin_create_working_hours('11111111-2222-3333-4444-555555555553'::uuid, 1::smallint, '09:00'::time, '10:00'::time, '2026-01-01'::date, null::date)$$,
  '42501', null, 'Un cliente no puede invocar RPC administrativa'
);

select set_config('request.jwt.claim.sub', '11111111-2222-3333-4444-555555555552', true);

select lives_ok(
  $$select public.admin_create_working_hours('11111111-2222-3333-4444-555555555553'::uuid, 1::smallint, '09:00'::time, '10:00'::time, '2026-01-01'::date, null::date)$$,
  'Un administrador autenticado puede invocar la RPC de horarios'
);

select throws_ok(
  $$insert into public.professional_working_hours(professional_id, weekday, starts_at, ends_at, effective_from) values ('11111111-2222-3333-4444-555555555553'::uuid, 2, '09:00', '10:00', '2026-01-01')$$,
  '42501', null, 'El administrador tampoco dispone de DML directo sobre horarios'
);

select ok(
  (select relrowsecurity from pg_class where oid='public.bookings'::regclass)
  and not has_table_privilege('authenticated', 'public.booking_time_holds', 'INSERT')
  and not has_table_privilege('authenticated', 'public.professional_time_allocations', 'INSERT'),
  'RLS y grants protegen retenciones y ocupaciones internas'
);

select * from finish();

rollback;

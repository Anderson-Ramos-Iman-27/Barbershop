begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

insert into auth.users (id, email)
values
  ('66666666-6666-6666-6666-666666666666', 'availability-customer@example.test'),
  ('77777777-7777-7777-7777-777777777777', 'availability-admin@example.test');

update public.profiles
set role = 'admin'
where id = '77777777-7777-7777-7777-777777777777'::uuid;

insert into public.professionals (id, display_name)
values
  ('88888888-8888-8888-8888-888888888888', 'Profesional disponibilidad uno'),
  ('99999999-9999-9999-9999-999999999999', 'Profesional disponibilidad dos');

insert into public.professional_working_hours (
  id, professional_id, weekday, starts_at, ends_at, effective_from
)
values
  ('aaaaaaaa-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 1, '09:00', '12:00', '2026-01-01'),
  ('bbbbbbbb-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 1, '12:00', '17:00', '2026-01-01');

select ok(
  (select count(*) = 2 from public.professional_working_hours
    where professional_id = '88888888-8888-8888-8888-888888888888'::uuid
      and weekday = 1),
  'Se permiten turnos consecutivos para el mismo profesional y dia'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 1, '11:00', '13:00', '2026-01-01')$$,
  '23P01', null,
  'Se rechazan turnos laborales solapados'
);

select lives_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 2, '11:00', '13:00', '2026-01-01')$$,
  'El mismo intervalo en otro dia ISO es valido'
);

select lives_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from, effective_until)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 1, '09:00', '12:00', '2025-01-01', '2026-01-01')$$,
  'Se permiten versiones temporales consecutivas'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 1, '09:00', '12:00', '2027-01-01')$$,
  '23P01', null,
  'Una vigencia abierta impide una version solapada posterior'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 0, '09:00', '10:00', '2026-01-01')$$,
  '23514', null,
  'Se rechazan dias ISO invalidos'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 3, '09:00:30', '10:00', '2026-01-01')$$,
  '23514', null,
  'Se rechazan horas con segundos'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 3, '12:00', '12:00', '2026-01-01')$$,
  '23514', null,
  'Se rechazan turnos vacios o que cruzan medianoche'
);

select lives_ok(
  $$insert into public.professional_recurring_breaks (id, professional_id, weekday, starts_at, ends_at, effective_from)
    values ('cccccccc-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888'::uuid, 1, '10:00', '10:15', '2026-01-01')$$,
  'Se crea un descanso recurrente'
);

select throws_ok(
  $$insert into public.professional_recurring_breaks (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 1, '10:10', '10:20', '2026-01-01')$$,
  '23P01', null,
  'Se rechazan descansos solapados'
);

select lives_ok(
  $$insert into public.professional_recurring_breaks (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 1, '18:00', '18:30', '2026-01-01')$$,
  'Se permiten descansos fuera de la jornada'
);

select lives_ok(
  $$insert into public.professional_recurring_breaks (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 1, '10:15', '10:30', '2026-01-01')$$,
  'Se permiten descansos consecutivos'
);

select throws_ok(
  $$insert into public.professional_recurring_breaks (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 2, '10:00:01', '10:30', '2026-01-01')$$,
  '23514', null,
  'Los descansos tambien exigen precision de minuto'
);

select throws_ok(
  $$insert into public.professional_recurring_breaks (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('00000000-0000-0000-0000-000000000000'::uuid, 2, '10:00', '10:30', '2026-01-01')$$,
  '23503', null,
  'Los descansos exigen un profesional existente'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('00000000-0000-0000-0000-000000000000'::uuid, 2, '10:00', '10:30', '2026-01-01')$$,
  '23503', null,
  'Los turnos exigen un profesional existente'
);

select lives_ok(
  $$insert into public.calendar_blocks (scope, starts_at, ends_at, internal_reason)
    values ('business', '2026-03-01 05:00+00', '2026-03-02 05:00+00', 'Cierre general de prueba')$$,
  'Se permite un bloqueo global'
);

select lives_ok(
  $$insert into public.calendar_blocks (scope, professional_id, starts_at, ends_at, internal_reason)
    values ('professional', '88888888-8888-8888-8888-888888888888'::uuid, '2026-03-03 14:00+00', '2026-03-03 16:00+00', 'Ausencia de prueba')$$,
  'Se permite un bloqueo por profesional'
);

select throws_ok(
  $$insert into public.calendar_blocks (scope, professional_id, starts_at, ends_at)
    values ('business', '88888888-8888-8888-8888-888888888888'::uuid, '2026-03-04 14:00+00', '2026-03-04 16:00+00')$$,
  '23514', null,
  'Un bloqueo business no admite professional_id'
);

select throws_ok(
  $$insert into public.calendar_blocks (scope, starts_at, ends_at)
    values ('professional', '2026-03-04 14:00+00', '2026-03-04 16:00+00')$$,
  '23514', null,
  'Un bloqueo professional exige professional_id'
);

select throws_ok(
  $$insert into public.calendar_blocks (scope, starts_at, ends_at)
    values ('business', '2026-03-05 16:00+00', '2026-03-05 16:00+00')$$,
  '23514', null,
  'Se rechazan rangos absolutos vacios o invertidos'
);

select lives_ok(
  $$insert into public.calendar_blocks (scope, starts_at, ends_at)
    values ('business', '2026-03-01 12:00+00', '2026-03-01 18:00+00')$$,
  'Se permiten bloqueos puntuales superpuestos'
);

select throws_ok(
  $$insert into public.calendar_blocks (scope, professional_id, starts_at, ends_at)
    values ('professional', '00000000-0000-0000-0000-000000000000'::uuid, '2026-03-06 14:00+00', '2026-03-06 16:00+00')$$,
  '23503', null,
  'Los bloqueos por profesional exigen una referencia existente'
);

select lives_ok(
  $$update public.professional_working_hours
    set is_active = false, archived_at = now()
    where id = 'aaaaaaaa-1111-1111-1111-111111111111'::uuid$$,
  'Se permite el archivado logico tras desactivar el turno'
);

select throws_ok(
  $$update public.professional_working_hours
    set archived_at = now()
    where id = 'bbbbbbbb-1111-1111-1111-111111111111'::uuid$$,
  '23514', null,
  'No se archiva un turno que permanece activo'
);

set local role anon;

select throws_ok(
  $$select id from public.professional_working_hours$$,
  '42501', null,
  'anon no puede leer horarios laborales'
);

select throws_ok(
  $$select id from public.professional_recurring_breaks$$,
  '42501', null,
  'anon no puede leer descansos recurrentes'
);

select throws_ok(
  $$select id from public.calendar_blocks$$,
  '42501', null,
  'anon no puede leer bloqueos'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 4, '09:00', '10:00', '2026-01-01')$$,
  '42501', null,
  'anon no puede escribir horarios laborales'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);

select is_empty(
  $$select internal_reason from public.calendar_blocks$$,
  'Un cliente no puede consultar internal_reason ni bloqueos'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from)
    values ('88888888-8888-8888-8888-888888888888'::uuid, 4, '09:00', '10:00', '2026-01-01')$$,
  '42501', null,
  'Un cliente no puede escribir horarios laborales'
);

select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);

select ok(
  exists (select 1 from public.professional_working_hours),
  'El administrador puede leer horarios incluidos archivados'
);

select lives_ok(
  $$select public.admin_create_working_hours('99999999-9999-9999-9999-999999999999'::uuid, 3::smallint, '09:00'::time, '10:00'::time, '2026-01-01'::date, null::date)$$,
  'El administrador puede crear horarios mediante RPC controlada'
);

select lives_ok(
  $$select public.admin_update_recurring_break('cccccccc-1111-1111-1111-111111111111'::uuid, false, null)$$,
  'El administrador puede actualizar descansos mediante RPC controlada'
);

select lives_ok(
  $$select public.admin_update_calendar_block((select id from public.calendar_blocks where scope='business' order by id limit 1), 'business', null, '2026-03-01 05:00+00', '2026-03-02 05:00+00', false, true, null, 'Motivo administrativo actualizado')$$,
  'El administrador puede actualizar bloqueos y motivos internos mediante RPC controlada'
);

select throws_ok(
  $$insert into public.professional_working_hours (professional_id, weekday, starts_at, ends_at, effective_from) values ('99999999-9999-9999-9999-999999999999'::uuid, 4, '09:00', '10:00', '2026-01-01')$$,
  '42501', null, 'El DML directo de horarios queda revocado incluso para administrador'
);
select throws_ok(
  $$update public.professional_recurring_breaks set is_active = true where id = 'cccccccc-1111-1111-1111-111111111111'::uuid$$,
  '42501', null, 'El DML directo de descansos queda revocado incluso para administrador'
);
select throws_ok(
  $$update public.calendar_blocks set internal_reason = 'No permitido' where scope='business'$$,
  '42501', null, 'El DML directo de bloqueos queda revocado incluso para administrador'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.professional_working_hours'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.professional_recurring_breaks'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.calendar_blocks'::regclass)
  and not has_table_privilege('anon', 'public.professional_working_hours', 'INSERT')
  and not has_table_privilege('anon', 'public.professional_recurring_breaks', 'INSERT')
  and not has_table_privilege('anon', 'public.calendar_blocks', 'INSERT')
  and not has_table_privilege('authenticated', 'public.professional_working_hours', 'INSERT')
  and not has_table_privilege('authenticated', 'public.professional_recurring_breaks', 'INSERT')
  and not has_table_privilege('authenticated', 'public.calendar_blocks', 'INSERT'),
  'RLS permanece activa y el DML administrativo se limita a RPC controladas'
);

select * from finish();

rollback;

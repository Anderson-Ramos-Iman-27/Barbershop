begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'customer-one@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'customer-two@example.test');

select results_eq(
  $$select role::text from public.profiles order by id$$,
  array['customer'::text, 'customer'::text],
  'El trigger crea perfiles customer para nuevas identidades'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select ok(not private.is_admin(), 'Un cliente no es administrador');

select results_eq(
  $$select id from public.profiles order by id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'Un cliente solo lee su propio perfil'
);

select lives_ok(
  $$select id, full_name, phone, role, created_at, updated_at from public.profiles$$,
  'La lectura de perfiles usa columnas explicitas compatibles con privilegios por columna'
);

select lives_ok(
  $$update public.profiles set full_name = 'Cliente Uno', phone = '999999999'
    where id = '11111111-1111-1111-1111-111111111111'::uuid$$,
  'Un cliente puede actualizar sus campos de contacto'
);

select is_empty(
  $$update public.profiles set full_name = 'No permitido'
    where id = '22222222-2222-2222-2222-222222222222'::uuid returning id$$,
  'Un cliente no puede actualizar un perfil ajeno'
);

select throws_ok(
  $$update public.profiles set role = 'admin'
    where id = '11111111-1111-1111-1111-111111111111'::uuid$$,
  '42501',
  null,
  'Un cliente no tiene privilegio para actualizar role'
);

select is_empty(
  $$select id from public.business_settings$$,
  'Un cliente no puede leer business_settings'
);

select is_empty(
  $$update public.business_settings set minimum_notice_minutes = 1500 returning id$$,
  'Un cliente no puede actualizar business_settings'
);

select throws_ok(
  $$select private.bootstrap_initial_admin('11111111-1111-1111-1111-111111111111'::uuid)$$,
  '42501',
  null,
  'authenticated no puede ejecutar bootstrap_initial_admin'
);

reset role;

select lives_ok(
  $$select private.bootstrap_initial_admin('11111111-1111-1111-1111-111111111111'::uuid)$$,
  'El operador privilegiado puede crear el administrador inicial'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select ok(private.is_admin(), 'El administrador inicial obtiene el rol admin');

select results_eq(
  $$select count(*) from public.business_settings$$,
  array[1::bigint],
  'Un administrador puede leer business_settings'
);

select throws_ok(
  $$update public.business_settings
    set professional_assignment_mode = 'automatic', booking_enabled = true
    where id = 1$$,
  '23514',
  null,
  'No se habilitan reservas con plazos operativos incompletos'
);

select lives_ok(
  $$update public.business_settings
    set professional_assignment_mode = 'automatic',
        approval_max_pending_minutes = 60,
        approval_cutoff_before_start_minutes = 30,
        cancellation_notice_minutes = 120,
        reschedule_proposal_ttl_minutes = 60,
        booking_enabled = true
    where id = 1$$,
  'Un administrador puede guardar configuracion completa'
);

select throws_ok(
  $$update public.business_settings set business_timezone = 'Invalid/Timezone' where id = 1$$,
  '42501',
  null,
  'La zona horaria no es editable por roles de aplicacion'
);

reset role;

select throws_ok(
  $$select private.bootstrap_initial_admin('22222222-2222-2222-2222-222222222222'::uuid)$$,
  'P0001',
  'Ya existe un administrador inicial',
  'El bootstrap falla cuando ya existe un administrador'
);

set local role anon;

select throws_ok(
  $$select private.bootstrap_initial_admin('22222222-2222-2222-2222-222222222222'::uuid)$$,
  '42501',
  null,
  'anon no puede ejecutar bootstrap_initial_admin'
);

select * from finish();

rollback;

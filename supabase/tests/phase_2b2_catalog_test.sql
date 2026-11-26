begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

insert into auth.users (id, email)
values
  ('44444444-4444-4444-4444-444444444444', 'catalog-customer@example.test'),
  ('55555555-5555-5555-5555-555555555555', 'catalog-admin@example.test');

update public.profiles
set role = 'admin'
where id = '55555555-5555-5555-5555-555555555555'::uuid;

insert into public.services (
  id, name, description, price_pen_centavos, duration_minutes, is_active, is_published, sort_order
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Servicio borrador', null, null, null, false, false, 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Servicio visible', 'Descripcion visible', 4500, 45, true, true, 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Servicio no publicado', 'Descripcion interna', 3000, 30, true, false, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Servicio con relacion', 'Descripcion relacionada', 5000, 60, true, true, 3);

insert into public.service_modes (service_id, mode, is_active)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'local', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'domicilio', false),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'local', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'local', true);

insert into public.professionals (id, display_name, is_active, is_published, sort_order)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Profesional visible', true, true, 1),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Profesional no publicado', true, false, 2);

insert into public.professional_services (professional_id, service_id, is_active)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'dddddddd-dddd-dddd-dddd-dddddddddddd', false),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

insert into public.gallery_items (
  id, storage_bucket, storage_path, alt_text, is_published, published_at, sort_order
)
values
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gallery', 'visible.jpg', 'Galeria visible', true, now(), 1),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gallery', 'draft.jpg', 'Galeria borrador', false, null, 2);

select ok(
  exists (
    select 1 from public.services
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and price_pen_centavos is null and duration_minutes is null and description is null
  ),
  'Se permiten servicios en borrador incompletos'
);

select throws_ok(
  $$update public.services set is_active = true where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid$$,
  '23514', null,
  'No se activa un servicio sin precio y duracion'
);

select throws_ok(
  $$update public.services set is_published = true where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid$$,
  '23514', null,
  'No se publica un servicio incompleto e inactivo'
);

select throws_ok(
  $$insert into public.services (name, price_pen_centavos) values ('Precio invalido', 0)$$,
  '23514', null,
  'El precio configurado debe ser positivo'
);

select throws_ok(
  $$insert into public.services (name, duration_minutes) values ('Duracion invalida', 0)$$,
  '23514', null,
  'La duracion configurada debe ser positiva'
);

select throws_ok(
  $$insert into public.service_modes (service_id, mode) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'local')$$,
  '23505', null,
  'No se duplican modalidades para un servicio'
);

select throws_ok(
  $$insert into public.service_modes (service_id, mode) values ('99999999-9999-9999-9999-999999999999'::uuid, 'local')$$,
  '23503', null,
  'service_modes exige un servicio existente'
);

select throws_ok(
  $$insert into public.professionals (display_name) values ('   ')$$,
  '23514', null,
  'El profesional exige un nombre visible'
);

select throws_ok(
  $$insert into public.professional_services (professional_id, service_id) values ('99999999-9999-9999-9999-999999999999'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid)$$,
  '23503', null,
  'professional_services exige un profesional existente'
);

select throws_ok(
  $$insert into public.professional_services (professional_id, service_id) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid)$$,
  '23505', null,
  'No se duplican asociaciones profesional-servicio'
);

select throws_ok(
  $$insert into public.gallery_items (is_published, published_at) values (true, now())$$,
  '23514', null,
  'No se publica galeria sin archivo y texto alternativo'
);

select throws_ok(
  $$insert into public.gallery_items (storage_bucket, storage_path) values ('gallery', 'visible.jpg')$$,
  '23505', null,
  'No se duplican rutas de archivo en galeria'
);

select throws_ok(
  $$delete from public.services where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid$$,
  '23503', null,
  'Una relacion protege el servicio frente a eliminacion fisica'
);

select throws_ok(
  $$delete from public.professionals where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid$$,
  '23503', null,
  'Una relacion protege el profesional frente a eliminacion fisica'
);

select throws_ok(
  $$update public.services set archived_at = now() where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid$$,
  '23514', null,
  'No se archiva un servicio activo y publicado sin desactivarlo'
);

set local role anon;

select results_eq(
  $$select name from public.services order by sort_order$$,
  array['Servicio visible'::text, 'Servicio con relacion'::text],
  'anon solo lee servicios publicados y activos'
);

select results_eq(
  $$select mode::text from public.service_modes order by mode$$,
  array['local'::text, 'local'::text],
  'anon no lee modalidades inactivas ni de servicios no publicados'
);

select results_eq(
  $$select display_name from public.professionals order by sort_order$$,
  array['Profesional visible'::text],
  'anon solo lee profesionales activos y publicados'
);

select results_eq(
  $$select service_id::text from public.professional_services order by service_id$$,
  array['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::text],
  'anon no lee asociaciones inactivas o con entidades no publicas'
);

select results_eq(
  $$select alt_text from public.gallery_items order by sort_order$$,
  array['Galeria visible'::text],
  'anon solo lee galeria publicada'
);

select throws_ok(
  $$insert into public.services (name) values ('Escritura anonima')$$,
  '42501', null,
  'anon no puede escribir servicios'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);

select results_eq(
  $$select name from public.services order by sort_order$$,
  array['Servicio visible'::text, 'Servicio con relacion'::text],
  'El cliente autenticado solo lee el catalogo publico'
);

select is_empty(
  $$update public.services set price_pen_centavos = 1 where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid returning id$$,
  'Un cliente no puede modificar precios'
);

select throws_ok(
  $$insert into public.professionals (display_name) values ('Escritura cliente')$$,
  '42501', null,
  'Un cliente no puede crear profesionales'
);

select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

select results_eq(
  $$select count(*) from public.services$$,
  array[4::bigint],
  'El administrador puede leer borradores y servicios no publicados'
);

select lives_ok(
  $$insert into public.services (name) values ('Borrador administrado')$$,
  'El administrador puede crear servicios en borrador'
);

select lives_ok(
  $$update public.service_modes set is_active = true where service_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid and mode = 'domicilio'$$,
  'El administrador puede gestionar modalidades'
);

select lives_ok(
  $$update public.professionals set is_published = true where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid$$,
  'El administrador puede gestionar profesionales no publicados'
);

select lives_ok(
  $$update public.professional_services set is_active = true where professional_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid and service_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid$$,
  'El administrador puede gestionar asociaciones'
);

select lives_ok(
  $$insert into public.gallery_items (alt_text) values ('Borrador administrado')$$,
  'El administrador puede crear galeria en borrador'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.services'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.service_modes'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.professionals'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.professional_services'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.gallery_items'::regclass),
  'Las cinco tablas del catalogo tienen RLS habilitado'
);

select * from finish();

rollback;

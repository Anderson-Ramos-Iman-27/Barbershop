-- Fase 2B.2: profesionales independientes de Supabase Auth y sus capacidades.
-- Supabase CLI aplica este archivo en una transaccion; no usa pg-delta: transaction=false.

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (btrim(display_name) <> ''),
  bio text,
  image_bucket text,
  image_path text,
  image_alt text,
  is_active boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (image_bucket is null and image_path is null and image_alt is null)
    or (
      image_bucket is not null and btrim(image_bucket) <> ''
      and image_path is not null and btrim(image_path) <> ''
      and image_alt is not null and btrim(image_alt) <> ''
    )
  ),
  check (not is_published or (is_active and archived_at is null)),
  check (archived_at is null or (not is_active and not is_published))
);

create table public.professional_services (
  professional_id uuid not null references public.professionals (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (professional_id, service_id)
);

comment on table public.professionals is
  'Profesionales operativos. No requieren ni crean una identidad en auth.users.';
comment on table public.professional_services is
  'Servicios que un profesional puede realizar. La disponibilidad efectiva se resuelve con las entidades padre.';

create index professionals_public_listing_idx
on public.professionals (sort_order, id)
where is_active and is_published and archived_at is null;

create index professional_services_active_by_service_idx
on public.professional_services (service_id, professional_id)
where is_active;

create trigger professionals_set_updated_at
before update on public.professionals
for each row execute function private.set_updated_at();

create trigger professional_services_set_updated_at
before update on public.professional_services
for each row execute function private.set_updated_at();

alter table public.professionals enable row level security;
alter table public.professional_services enable row level security;

revoke all on table public.professionals from public, anon, authenticated;
revoke all on table public.professional_services from public, anon, authenticated;

grant select on table public.professionals to anon, authenticated;
grant insert, update, delete on table public.professionals to authenticated;
grant select on table public.professional_services to anon, authenticated;
grant insert, update, delete on table public.professional_services to authenticated;

create policy professionals_public_read
on public.professionals
for select
to anon, authenticated
using (is_active and is_published and archived_at is null);

create policy professionals_admin_manage
on public.professionals
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy professional_services_public_read
on public.professional_services
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.professionals professional
    where professional.id = professional_services.professional_id
      and professional.is_active
      and professional.is_published
      and professional.archived_at is null
  )
  and exists (
    select 1
    from public.services service
    where service.id = professional_services.service_id
      and service.is_active
      and service.is_published
      and service.archived_at is null
  )
);

create policy professional_services_admin_manage
on public.professional_services
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

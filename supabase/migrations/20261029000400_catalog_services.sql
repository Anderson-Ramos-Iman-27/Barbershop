-- Fase 2B.2: catalogo de servicios y modalidades habilitadas.
-- Supabase CLI aplica este archivo en una transaccion; no usa pg-delta: transaction=false.

create type public.service_mode as enum ('local', 'domicilio');

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  description text,
  price_pen_centavos bigint check (price_pen_centavos is null or price_pen_centavos > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
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
  check (
    not is_active
    or (price_pen_centavos is not null and duration_minutes is not null)
  ),
  check (
    not is_published
    or (
      is_active
      and archived_at is null
      and description is not null
      and btrim(description) <> ''
    )
  ),
  check (archived_at is null or (not is_active and not is_published))
);

create table public.service_modes (
  service_id uuid not null references public.services (id) on delete restrict,
  mode public.service_mode not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (service_id, mode)
);

comment on table public.services is
  'Catalogo operativo. Los importes se almacenan en centavos de PEN y las reservas futuras conservaran snapshots.';
comment on table public.service_modes is
  'Modalidades fijas habilitadas por servicio. No define recargos, cobertura ni traslados.';

create index services_public_listing_idx
on public.services (sort_order, id)
where is_active and is_published and archived_at is null;

create index service_modes_active_by_mode_idx
on public.service_modes (mode, service_id)
where is_active;

create trigger services_set_updated_at
before update on public.services
for each row execute function private.set_updated_at();

create trigger service_modes_set_updated_at
before update on public.service_modes
for each row execute function private.set_updated_at();

alter table public.services enable row level security;
alter table public.service_modes enable row level security;

revoke all on table public.services from public, anon, authenticated;
revoke all on table public.service_modes from public, anon, authenticated;

grant select on table public.services to anon, authenticated;
grant insert, update, delete on table public.services to authenticated;
grant select on table public.service_modes to anon, authenticated;
grant insert, update, delete on table public.service_modes to authenticated;

create policy services_public_read
on public.services
for select
to anon, authenticated
using (is_active and is_published and archived_at is null);

create policy services_admin_manage
on public.services
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy service_modes_public_read
on public.service_modes
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.services service
    where service.id = service_modes.service_id
      and service.is_active
      and service.is_published
      and service.archived_at is null
  )
);

create policy service_modes_admin_manage
on public.service_modes
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

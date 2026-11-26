-- Fase 2B.3: descansos recurrentes locales por profesional.
-- Supabase CLI aplica este archivo en una transaccion; no usa pg-delta: transaction=false.

create table public.professional_recurring_breaks (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete restrict,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  start_minute integer generated always as (
    (extract(hour from starts_at)::integer * 60)
    + extract(minute from starts_at)::integer
  ) stored,
  end_minute integer generated always as (
    (extract(hour from ends_at)::integer * 60)
    + extract(minute from ends_at)::integer
  ) stored,
  effective_from date not null,
  effective_until date,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(second from starts_at) = 0),
  check (extract(second from ends_at) = 0),
  check (end_minute > start_minute),
  check (effective_until is null or effective_until > effective_from),
  check (archived_at is null or not is_active),
  constraint professional_recurring_breaks_no_overlap
    exclude using gist (
      professional_id with =,
      weekday with =,
      daterange(effective_from, effective_until, '[)') with &&,
      int4range(start_minute, end_minute, '[)') with &&
    ) where (is_active and archived_at is null)
);

comment on table public.professional_recurring_breaks is
  'Descansos locales recurrentes. Pueden estar fuera de un turno; nunca generan disponibilidad.';

create index professional_recurring_breaks_active_lookup_idx
on public.professional_recurring_breaks (professional_id, weekday, effective_from, starts_at)
where is_active and archived_at is null;

create trigger professional_recurring_breaks_set_updated_at
before update on public.professional_recurring_breaks
for each row execute function private.set_updated_at();

alter table public.professional_recurring_breaks enable row level security;

revoke all on table public.professional_recurring_breaks from public, anon, authenticated;

grant select, insert, update, delete on table public.professional_recurring_breaks to authenticated;

create policy professional_recurring_breaks_admin_manage
on public.professional_recurring_breaks
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

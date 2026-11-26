-- Fase 2B.4: retenciones autenticadas e idempotentes.

create type public.booking_hold_status as enum ('active', 'converted', 'released', 'expired');

create table public.booking_time_holds (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles (id) on delete restrict,
  professional_id uuid not null references public.professionals (id) on delete restrict,
  mode public.service_mode not null,
  service_ids uuid[] not null check (cardinality(service_ids) > 0),
  request_fingerprint text not null check (btrim(request_fingerprint) <> ''),
  idempotency_key uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expires_at timestamptz not null,
  status public.booking_hold_status not null default 'active',
  converted_booking_id uuid references public.bookings (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (expires_at > created_at),
  check ((status = 'converted') = (converted_booking_id is not null))
);

create unique index booking_time_holds_customer_idempotency_idx on public.booking_time_holds (customer_profile_id, idempotency_key);
create index booking_time_holds_active_expiry_idx on public.booking_time_holds (professional_id, expires_at) where status = 'active';
create trigger booking_time_holds_set_updated_at before update on public.booking_time_holds for each row execute function private.set_updated_at();

alter table public.booking_time_holds enable row level security;
revoke all on public.booking_time_holds from public, anon, authenticated;

-- Fase 2B.4: nucleo de reservas, snapshots, direcciones e historial.

create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'expired', 'cancelled');
create type public.booking_event_type as enum (
  'created', 'confirmed', 'rejected', 'expired', 'cancelled',
  'reschedule_proposed', 'reschedule_accepted', 'reschedule_rejected',
  'reschedule_expired', 'reschedule_withdrawn'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles (id) on delete restrict,
  professional_id uuid not null references public.professionals (id) on delete restrict,
  professional_name_snapshot text not null check (btrim(professional_name_snapshot) <> ''),
  mode public.service_mode not null,
  assignment_mode_snapshot public.professional_assignment_mode not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_duration_minutes integer not null check (total_duration_minutes > 0),
  status public.booking_status not null default 'pending',
  business_timezone_snapshot text not null,
  minimum_notice_minutes_snapshot integer not null check (minimum_notice_minutes_snapshot > 0),
  booking_horizon_days_snapshot integer not null check (booking_horizon_days_snapshot > 0),
  cancellation_notice_minutes_snapshot integer not null check (cancellation_notice_minutes_snapshot > 0),
  approval_deadline_at timestamptz not null,
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at = starts_at + make_interval(mins => total_duration_minutes)),
  check (approval_deadline_at <= starts_at)
);

create table public.booking_services (
  booking_id uuid not null references public.bookings (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  position smallint not null check (position > 0),
  service_name_snapshot text not null check (btrim(service_name_snapshot) <> ''),
  price_pen_centavos_snapshot bigint not null check (price_pen_centavos_snapshot > 0),
  duration_minutes_snapshot integer not null check (duration_minutes_snapshot > 0),
  primary key (booking_id, service_id),
  unique (booking_id, position)
);

create table public.booking_addresses (
  booking_id uuid primary key references public.bookings (id) on delete restrict,
  address_line text not null check (btrim(address_line) <> ''),
  district text not null check (btrim(district) <> ''),
  reference text not null check (btrim(reference) <> ''),
  additional_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  event_type public.booking_event_type not null,
  from_status public.booking_status,
  to_status public.booking_status,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  customer_reason text,
  internal_note text,
  created_at timestamptz not null default now(),
  check ((from_status is null) = (to_status is null) or from_status is distinct from to_status),
  check (customer_reason is null or btrim(customer_reason) <> ''),
  check (internal_note is null or btrim(internal_note) <> '')
);

create index bookings_customer_created_idx on public.bookings (customer_profile_id, created_at desc);
create index bookings_professional_starts_idx on public.bookings (professional_id, starts_at) where status in ('pending', 'confirmed');
create index booking_status_history_booking_created_idx on public.booking_status_history (booking_id, created_at);

create trigger bookings_set_updated_at before update on public.bookings for each row execute function private.set_updated_at();
create trigger booking_addresses_set_updated_at before update on public.booking_addresses for each row execute function private.set_updated_at();

alter table public.bookings enable row level security;
alter table public.booking_services enable row level security;
alter table public.booking_addresses enable row level security;
alter table public.booking_status_history enable row level security;

revoke all on table public.bookings, public.booking_services, public.booking_addresses, public.booking_status_history from public, anon, authenticated;
grant select on public.bookings, public.booking_services, public.booking_addresses, public.booking_status_history to authenticated;

create policy bookings_customer_or_admin_read on public.bookings for select to authenticated
using (customer_profile_id = (select auth.uid()) or (select private.is_admin()));
create policy booking_services_customer_or_admin_read on public.booking_services for select to authenticated
using (exists (select 1 from public.bookings b where b.id = booking_services.booking_id and (b.customer_profile_id = (select auth.uid()) or (select private.is_admin()))));
create policy booking_addresses_customer_or_admin_read on public.booking_addresses for select to authenticated
using (exists (select 1 from public.bookings b where b.id = booking_addresses.booking_id and (b.customer_profile_id = (select auth.uid()) or (select private.is_admin()))));
create policy booking_history_admin_read on public.booking_status_history for select to authenticated using ((select private.is_admin()));

-- Fase 2B.4: propuestas de reprogramacion y fuente unificada de ocupacion.

create type public.reschedule_proposal_status as enum ('proposed', 'accepted', 'rejected', 'expired', 'withdrawn');
create type public.allocation_kind as enum ('hold', 'booking', 'reschedule_proposal');
create type public.allocation_state as enum ('active', 'released', 'expired', 'transferred');

create table public.reschedule_proposals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  original_professional_id uuid not null references public.professionals (id) on delete restrict,
  original_starts_at timestamptz not null,
  original_ends_at timestamptz not null,
  proposed_professional_id uuid not null references public.professionals (id) on delete restrict,
  proposed_professional_name_snapshot text not null check (btrim(proposed_professional_name_snapshot) <> ''),
  proposed_starts_at timestamptz not null,
  proposed_ends_at timestamptz not null,
  expires_at timestamptz not null,
  status public.reschedule_proposal_status not null default 'proposed',
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (original_ends_at > original_starts_at),
  check (proposed_ends_at > proposed_starts_at),
  check (expires_at <= original_starts_at),
  check (expires_at > created_at)
);
create unique index reschedule_proposals_one_active_idx on public.reschedule_proposals (booking_id) where status = 'proposed';
create trigger reschedule_proposals_set_updated_at before update on public.reschedule_proposals for each row execute function private.set_updated_at();

create table public.professional_time_allocations (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete restrict,
  allocation_kind public.allocation_kind not null,
  booking_id uuid references public.bookings (id) on delete restrict,
  hold_id uuid references public.booking_time_holds (id) on delete restrict,
  reschedule_proposal_id uuid references public.reschedule_proposals (id) on delete restrict,
  origin_hold_id uuid references public.booking_time_holds (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expires_at timestamptz,
  state public.allocation_state not null default 'active',
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (num_nonnulls(booking_id, hold_id, reschedule_proposal_id) = 1),
  check (
    (allocation_kind = 'booking' and booking_id is not null and hold_id is null and reschedule_proposal_id is null)
    or (allocation_kind = 'hold' and hold_id is not null and booking_id is null and reschedule_proposal_id is null)
    or (allocation_kind = 'reschedule_proposal' and reschedule_proposal_id is not null and booking_id is null and hold_id is null)
  ),
  check ((allocation_kind = 'booking') = (expires_at is null)),
  check ((state = 'active') = (released_at is null)),
  constraint professional_time_allocations_no_overlap
    exclude using gist (
      professional_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (state = 'active')
);
create unique index professional_time_allocations_active_booking_idx on public.professional_time_allocations (booking_id) where state = 'active' and booking_id is not null;
create unique index professional_time_allocations_active_hold_idx on public.professional_time_allocations (hold_id) where state = 'active' and hold_id is not null;
create unique index professional_time_allocations_active_proposal_idx on public.professional_time_allocations (reschedule_proposal_id) where state = 'active' and reschedule_proposal_id is not null;
create index professional_time_allocations_active_professional_idx on public.professional_time_allocations (professional_id, starts_at) where state = 'active';
create trigger professional_time_allocations_set_updated_at before update on public.professional_time_allocations for each row execute function private.set_updated_at();

alter table public.reschedule_proposals enable row level security;
alter table public.professional_time_allocations enable row level security;
revoke all on public.reschedule_proposals, public.professional_time_allocations from public, anon, authenticated;
grant select on public.reschedule_proposals to authenticated;
create policy reschedule_proposals_customer_or_admin_read on public.reschedule_proposals for select to authenticated
using (exists (select 1 from public.bookings b where b.id = reschedule_proposals.booking_id and (b.customer_profile_id = (select auth.uid()) or (select private.is_admin()))));

create function private.assert_booking_allocation(p_booking_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_status public.booking_status; v_count integer;
begin
  select status into v_status from public.bookings where id = p_booking_id;
  if not found then return; end if;
  select count(*) into v_count from public.professional_time_allocations where booking_id = p_booking_id and state = 'active';
  if v_status in ('pending', 'confirmed') and v_count <> 1 then raise exception 'Reserva activa sin ocupacion valida'; end if;
  if v_status in ('rejected', 'expired', 'cancelled') and v_count <> 0 then raise exception 'Reserva terminal conserva ocupacion activa'; end if;
  if v_count = 1 and not exists (select 1 from public.professional_time_allocations a join public.bookings b on b.id = a.booking_id where a.booking_id = p_booking_id and a.state = 'active' and a.professional_id = b.professional_id and a.starts_at = b.starts_at and a.ends_at = b.ends_at) then raise exception 'Ocupacion de reserva no coincide con su origen'; end if;
end;
$$;
create function private.assert_hold_allocation(p_hold_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_status public.booking_hold_status; v_count integer;
begin
  select status into v_status from public.booking_time_holds where id = p_hold_id;
  if not found then return; end if;
  select count(*) into v_count from public.professional_time_allocations where hold_id = p_hold_id and state = 'active';
  if v_status = 'active' and v_count <> 1 then raise exception 'Retencion activa sin ocupacion valida'; end if;
  if v_status <> 'active' and v_count <> 0 then raise exception 'Retencion inactiva conserva ocupacion activa'; end if;
  if v_count = 1 and not exists (select 1 from public.professional_time_allocations a join public.booking_time_holds h on h.id = a.hold_id where a.hold_id = p_hold_id and a.state = 'active' and a.professional_id = h.professional_id and a.starts_at = h.starts_at and a.ends_at = h.ends_at) then raise exception 'Ocupacion de retencion no coincide con su origen'; end if;
end;
$$;
create function private.assert_proposal_allocation(p_proposal_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_status public.reschedule_proposal_status; v_count integer;
begin
  select status into v_status from public.reschedule_proposals where id = p_proposal_id;
  if not found then return; end if;
  select count(*) into v_count from public.professional_time_allocations where reschedule_proposal_id = p_proposal_id and state = 'active';
  if v_status = 'proposed' and v_count <> 1 then raise exception 'Propuesta activa sin ocupacion valida'; end if;
  if v_status <> 'proposed' and v_count <> 0 then raise exception 'Propuesta inactiva conserva ocupacion activa'; end if;
  if v_count = 1 and not exists (select 1 from public.professional_time_allocations a join public.reschedule_proposals r on r.id = a.reschedule_proposal_id where a.reschedule_proposal_id = p_proposal_id and a.state = 'active' and a.professional_id = r.proposed_professional_id and a.starts_at = r.proposed_starts_at and a.ends_at = r.proposed_ends_at) then raise exception 'Ocupacion de propuesta no coincide con su origen'; end if;
end;
$$;
create function private.assert_allocation_source() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'bookings' then perform private.assert_booking_allocation(coalesce(new.id, old.id));
  elsif tg_table_name = 'booking_time_holds' then perform private.assert_hold_allocation(coalesce(new.id, old.id));
  elsif tg_table_name = 'reschedule_proposals' then perform private.assert_proposal_allocation(coalesce(new.id, old.id));
  else
    perform private.assert_booking_allocation(coalesce(new.booking_id, old.booking_id));
    perform private.assert_hold_allocation(coalesce(new.hold_id, old.hold_id));
    perform private.assert_proposal_allocation(coalesce(new.reschedule_proposal_id, old.reschedule_proposal_id));
  end if;
  return coalesce(new, old);
end;
$$;
create constraint trigger bookings_allocation_integrity after insert or update or delete on public.bookings deferrable initially deferred for each row execute function private.assert_allocation_source();
create constraint trigger holds_allocation_integrity after insert or update or delete on public.booking_time_holds deferrable initially deferred for each row execute function private.assert_allocation_source();
create constraint trigger proposals_allocation_integrity after insert or update or delete on public.reschedule_proposals deferrable initially deferred for each row execute function private.assert_allocation_source();
create constraint trigger allocations_source_integrity after insert or update or delete on public.professional_time_allocations deferrable initially deferred for each row execute function private.assert_allocation_source();
revoke all on function private.assert_booking_allocation(uuid), private.assert_hold_allocation(uuid), private.assert_proposal_allocation(uuid), private.assert_allocation_source() from public, anon, authenticated;

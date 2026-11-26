-- Fase 2B.2: metadata editorial de galeria. No crea buckets ni politicas Storage.
-- Supabase CLI aplica este archivo en una transaccion; no usa pg-delta: transaction=false.

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  alt_text text,
  caption text,
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (storage_bucket is null and storage_path is null)
    or (
      storage_bucket is not null and btrim(storage_bucket) <> ''
      and storage_path is not null and btrim(storage_path) <> ''
    )
  ),
  check (mime_type is null or btrim(mime_type) <> ''),
  check (
    not is_published
    or (
      archived_at is null
      and storage_bucket is not null
      and storage_path is not null
      and alt_text is not null
      and btrim(alt_text) <> ''
      and published_at is not null
    )
  ),
  check (archived_at is null or not is_published)
);

comment on table public.gallery_items is
  'Metadata editorial y ruta de Storage. No almacena URLs firmadas ni crea buckets.';

create unique index gallery_items_storage_object_unique_idx
on public.gallery_items (storage_bucket, storage_path)
where storage_bucket is not null and storage_path is not null;

create index gallery_items_public_listing_idx
on public.gallery_items (sort_order, id)
where is_published and archived_at is null;

create trigger gallery_items_set_updated_at
before update on public.gallery_items
for each row execute function private.set_updated_at();

alter table public.gallery_items enable row level security;

revoke all on table public.gallery_items from public, anon, authenticated;

grant select on table public.gallery_items to anon, authenticated;
grant insert, update, delete on table public.gallery_items to authenticated;

create policy gallery_items_public_read
on public.gallery_items
for select
to anon, authenticated
using (is_published and archived_at is null);

create policy gallery_items_admin_manage
on public.gallery_items
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

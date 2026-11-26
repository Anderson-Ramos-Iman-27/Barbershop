-- Galería administrable: archivos privados y lectura firmada solo para items publicados.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('original-wave-gallery', 'original-wave-gallery', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy gallery_storage_public_published_read
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'original-wave-gallery'
  and exists (
    select 1 from public.gallery_items item
    where item.storage_bucket = bucket_id
      and item.storage_path = name
      and item.is_published
      and item.archived_at is null
  )
);

create policy gallery_storage_admin_manage
on storage.objects for all to authenticated
using (bucket_id = 'original-wave-gallery' and (select private.is_admin()))
with check (bucket_id = 'original-wave-gallery' and (select private.is_admin()));

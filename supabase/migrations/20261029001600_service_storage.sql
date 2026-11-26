-- Fotografías oficiales de servicios: bucket privado y lectura temporal solo
-- para servicios activos y publicados. Las rutas permanecen en PostgreSQL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('original-wave-services', 'original-wave-services', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy service_storage_public_published_read
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'original-wave-services'
  and exists (
    select 1 from public.services service
    where service.image_bucket = bucket_id
      and service.image_path = name
      and service.is_active
      and service.is_published
      and service.archived_at is null
  )
);

create policy service_storage_admin_manage
on storage.objects for all to authenticated
using (bucket_id = 'original-wave-services' and (select private.is_admin()))
with check (bucket_id = 'original-wave-services' and (select private.is_admin()));

alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint profiles_avatar_owned_path check (
  avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f-]+[.](jpg|png|webp)$')
);
grant update (avatar_path) on public.profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('original-wave-avatars','original-wave-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy profile_avatar_owner_read on storage.objects for select to authenticated
using(bucket_id='original-wave-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_avatar_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='original-wave-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_avatar_owner_update on storage.objects for update to authenticated
using(bucket_id='original-wave-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='original-wave-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_avatar_owner_delete on storage.objects for delete to authenticated
using(bucket_id='original-wave-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Customers keep the email they registered with, including direct Auth API calls.
-- Normal confirmation, password recovery and clearing an old pending email change
-- remain possible. Administrative identities are outside this customer rule.
create function private.protect_customer_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.email is not null
    and not exists(select 1 from public.profiles where id=old.id and role='admin')
    and (new.email is distinct from old.email
      or (coalesce(new.email_change,'')<>'' and lower(new.email_change)<>lower(old.email))) then
    raise exception 'El correo de acceso del cliente no se puede modificar' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_customer_email() from public,anon,authenticated;
create trigger protect_customer_email
before update of email,email_change on auth.users
for each row execute function private.protect_customer_email();

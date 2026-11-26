-- Uses existing identities without printing contact data. Every write rolls back.
begin;
do $$
declare customer uuid; administrator uuid;
begin
  select id into customer from public.profiles where role='customer' limit 1;
  select id into administrator from public.profiles where role='admin' limit 1;
  if customer is null or administrator is null then raise exception 'Existing customer and administrator required'; end if;
  perform set_config('app.profile_check_customer',customer::text,true);
  perform set_config('app.profile_check_admin',administrator::text,true);
  perform set_config('request.jwt.claim.sub',customer::text,true);
  if exists(select 1 from storage.buckets where id='original-wave-avatars' and public) then raise exception 'FAIL: avatar bucket is public'; end if;
  if not exists(select 1 from storage.buckets where id='original-wave-avatars' and not public and file_size_limit=5242880) then raise exception 'FAIL: private bucket missing'; end if;
  if has_function_privilege('authenticated','private.protect_customer_email()','EXECUTE') or has_function_privilege('anon','private.protect_customer_email()','EXECUTE') then raise exception 'FAIL: privileged trigger exposed'; end if;
end;
$$;
set local role authenticated;
do $$
declare customer uuid:=current_setting('app.profile_check_customer')::uuid; administrator uuid:=current_setting('app.profile_check_admin')::uuid; changed integer;
begin
  update public.profiles set full_name='__profile_rollback_check__',phone='+51000000000',avatar_path=customer::text||'/'||gen_random_uuid()::text||'.png' where id=customer;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'FAIL: own profile cannot be updated'; end if;
  update public.profiles set full_name='__not_allowed__' where id=administrator;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'FAIL: another profile was updated'; end if;
  if exists(select 1 from public.profiles where id=administrator) then raise exception 'FAIL: another profile is visible'; end if;
  begin
    update public.profiles set role='admin' where id=customer;
    raise exception 'FAIL: role escalation allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set avatar_path=administrator::text||'/'||gen_random_uuid()::text||'.png' where id=customer;
    raise exception 'FAIL: another user avatar path accepted';
  exception when check_violation then null;
  end;
  insert into storage.objects(bucket_id,name) values('original-wave-avatars',customer::text||'/'||gen_random_uuid()::text||'.png');
  begin
    insert into storage.objects(bucket_id,name) values('original-wave-avatars',administrator::text||'/'||gen_random_uuid()::text||'.png');
    raise exception 'FAIL: upload to another user folder allowed';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  if not exists(select 1 from public.profiles where id=customer) then raise exception 'FAIL: administrator cannot read customer details'; end if;
  if exists(select 1 from storage.objects where bucket_id='original-wave-avatars' and (storage.foldername(name))[1]=customer::text) then raise exception 'FAIL: another user avatar readable directly'; end if;
end;
$$;
reset role;
do $$
declare customer uuid:=current_setting('app.profile_check_customer')::uuid;
begin
  begin
    update auth.users set email_change='profile-check@example.invalid' where id=customer;
    raise exception 'FAIL: pending customer email change accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update auth.users set email='profile-check@example.invalid' where id=customer;
    raise exception 'FAIL: customer email changed';
  exception when insufficient_privilege then null;
  end;
  update auth.users set email=email,email_change='' where id=customer;
end;
$$;
rollback;
select 'PASS: own contact/avatar, cross-user RLS, role protection, private Storage, email immutability and normal Auth updates; all writes rolled back' as result;

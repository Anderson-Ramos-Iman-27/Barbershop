-- Google may create users during OAuth. A short-lived registration intent is
-- required before creating a Google identity; existing identities can log in.
create table private.google_registration_intents (
  email_hash text primary key,
  expires_at timestamptz not null
);
alter table private.google_registration_intents enable row level security;
revoke all on private.google_registration_intents from public, anon, authenticated;

create function public.begin_google_registration(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(btrim(p_email));
begin
  if normalized is null or length(normalized) > 254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Correo invalido' using errcode = '22023';
  end if;
  delete from private.google_registration_intents where expires_at <= clock_timestamp();
  insert into private.google_registration_intents(email_hash, expires_at)
  values (encode(sha256(convert_to(normalized, 'UTF8')), 'hex'), clock_timestamp() + interval '10 minutes')
  on conflict (email_hash) do update set expires_at = excluded.expires_at;
end;
$$;
revoke all on function public.begin_google_registration(text) from public, anon, authenticated;
grant execute on function public.begin_google_registration(text) to anon, authenticated;

create function public.before_user_created_registration(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare provider text := event->'user'->'app_metadata'->>'provider';
  normalized text := lower(btrim(event->'user'->>'email'));
  consumed text;
begin
  if provider = 'google' then
    delete from private.google_registration_intents
      where email_hash = encode(sha256(convert_to(normalized, 'UTF8')), 'hex')
        and expires_at > clock_timestamp()
      returning email_hash into consumed;
    if consumed is null then
      return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'registration_required'));
    end if;
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.before_user_created_registration(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created_registration(jsonb) to supabase_auth_admin;

-- Server-only email lookup. It never returns IDs, profiles or credentials.
create function public.auth_account_exists(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where lower(email) = lower(btrim(p_email)));
$$;
revoke all on function public.auth_account_exists(text) from public, anon, authenticated;
grant execute on function public.auth_account_exists(text) to service_role;

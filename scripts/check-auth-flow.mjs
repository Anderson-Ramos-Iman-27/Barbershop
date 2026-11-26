import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const base = "http://localhost:3000";
const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
const secret = env.SUPABASE_SERVER_SECRET_KEY;
assert(secret, "Server account verification must be configured");
const decode = text => text.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attributes = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));

async function loginForm(email) {
  const response = await fetch(`${base}/login?next=${encodeURIComponent("/reservar?mode=domicilio")}`);
  const html = await response.text();
  assert(!html.includes(secret), "Server credential appeared in HTML");
  const form = html.match(/<form\b[\s\S]*?<\/form>/)?.[0];
  assert(form, "Login form must render");
  const data = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const attrs = attributes(match[0]);
    if (attrs.type === "hidden" && attrs.name) data.append(attrs.name, attrs.value ?? "");
  }
  assert([...data.keys()].some(name => name.startsWith("$ACTION_")), "Server Action metadata must exist");
  data.set("email", email);
  data.set("password", `Invalid-${randomUUID()}-1`);
  const result = await fetch(`${base}/login`, { method: "POST", body: data, headers: { Origin: base }, redirect: "manual" });
  return { status: result.status, location: result.headers.get("location"), body: await result.text() };
}

const unknown = await loginForm(`not-registered-${randomUUID()}@example.invalid`);
assert.equal(unknown.status, 303);
const target = new URL(unknown.location, base);
assert.equal(target.pathname, "/registro");
assert.equal(target.searchParams.get("reason"), "not_registered");
assert.equal(target.searchParams.get("next"), "/reservar?mode=domicilio");
console.log("PASS: unknown password account redirects to Register with booking return");

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 10 });
assert(!existing.error, "Could not inspect existing identities for read-only checks");
const user = existing.data.users.find(value => value.email);
if (user) {
  const wrongPassword = await loginForm(user.email);
  assert.equal(wrongPassword.status, 200);
  assert.equal(wrongPassword.location, null);
  assert(wrongPassword.body.includes("Correo") && wrongPassword.body.includes("válidos"));
  console.log("PASS: existing account with wrong password remains in Login");
} else console.log("SKIP: existing account case (no identities)");

const callback = await fetch(`${base}/auth/callback?error=access_denied&error_description=registration_required&next=${encodeURIComponent("/reservar?mode=local")}`, { headers: { Cookie: "ow-google-intent=login" }, redirect: "manual" });
assert.equal(new URL(callback.headers.get("location"), base).pathname, "/registro");
console.log("PASS: unregistered Google callback redirects to Register (simulated provider response)");

for (const path of ["/login", "/registro"]) {
  const html = await (await fetch(`${base}${path}`)).text();
  assert(html.includes("google-g.png"));
  assert(!html.includes(secret));
  console.log(`PASS: official Google icon and no server secret in ${path}`);
}
assert.equal((await fetch(`${base}/images/auth/google-g.png`)).status, 200);
const publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const lookup = await publicClient.rpc("auth_account_exists", { p_email: "unknown@example.invalid" });
assert(lookup.error, "Anonymous clients must not call the account lookup");
console.log("PASS: anonymous account lookup denied");

const chunks = new URL("../.next/static/chunks/", import.meta.url);
for (const entry of readdirSync(chunks, { recursive: true, withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".js")) {
    const path = `${entry.parentPath}/${entry.name}`;
    assert(!readFileSync(path, "utf8").includes(secret), "Server credential appeared in client bundle");
  }
}
console.log("PASS: server credential absent from browser bundles");
console.log("No users created or removed. No email sent. Google consent flow requires a real browser check.");

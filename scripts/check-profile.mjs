// Credentials are supplied through stdin only, never arguments or logs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";

const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
const base = "http://localhost:3000";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
const credentials = await new Promise(resolve => {
  let input = "";
  process.stdin.on("data", chunk => {
    input += chunk;
    try { resolve(JSON.parse(input)); process.stdin.pause(); if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch { /* Wait for the complete JSON input. */ }
  });
});
const jar = new Map();
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cookies => cookies.forEach(({ name, value }) => jar.set(name, value)) },
});
let uploaded;
const addressIds = [];
const bucket = supabase.storage.from("original-wave-avatars");
try {
  const login = await supabase.auth.signInWithPassword(credentials);
  assert(!login.error && login.data.user, "Test administrator login failed");
  const actor = await supabase.from("profiles").select("id, role").eq("id", login.data.user.id).single();
  assert.equal(actor.data?.role, "admin", "An existing administrator is required");
  for (const suffix of ["one", "two"]) {
    const created = await supabase.from("customer_addresses").insert({ customer_profile_id: actor.data.id, address_line: `__address_http_check_${randomUUID()}_${suffix}__`, district: "__test__", latitude: -12.01, longitude: -77.01 }).select("id,address_line").single();
    assert(!created.error && created.data, "Own address creation failed");
    addressIds.push(created.data.id);
  }
  const updatedAddress = await supabase.from("customer_addresses").update({ reference: "__optional_reference__" }).eq("id", addressIds[0]).select("id").single();
  assert(!updatedAddress.error, "Own address update failed");
  console.log("PASS: two independent own addresses created and edited through authenticated API");
  const missingHold = await supabase.rpc("convert_hold_to_booking_with_address", { p_hold_id: randomUUID(), p_request_fingerprint: "__api_existence_check__" });
  assert.equal(missingHold.error?.code, "42501", "Location RPC unavailable through API or missing-hold protection failed");
  console.log("PASS: location RPC exposed through authenticated API and rejects a nonexistent hold");
  const headers = { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
  const publicPoint = { latitude: -12.0453, longitude: -77.0311 }; // Public Plaza Mayor, not a customer location.
  const reverse = await fetch(`${base}/api/address/reverse`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(publicPoint) });
  assert.equal(reverse.status, 200, "Authenticated reverse geocoding failed");
  const suggested = await reverse.json();
  assert(typeof suggested.address_line === "string" && suggested.address_line.length > 0 && typeof suggested.district === "string", "No usable street/district returned");
  assert(!("features" in suggested) && !("customer_profile_id" in suggested), "Unexpected raw/private geocoding response");
  const cachedReverse = await fetch(`${base}/api/address/reverse`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(publicPoint) });
  assert.equal(cachedReverse.status, 200, "Repeated point should use user-scoped cache");
  assert.deepEqual(await cachedReverse.json(), suggested);
  const invalidReverse = await fetch(`${base}/api/address/reverse`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ latitude: 91, longitude: 0 }) });
  assert.equal(invalidReverse.status, 400, "Invalid coordinates were accepted");
  const anonymousReverse = await fetch(`${base}/api/address/reverse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(publicPoint) });
  assert.equal(anonymousReverse.status, 401, "Anonymous geocoding was accepted");
  console.log("PASS: authenticated street suggestion, repeated-point cache, invalid coordinates and anonymous denial");
  for (const [route, text] of [["/perfil", "Tu correo de acceso no se puede modificar"], ["/direcciones", "Agregar dirección"], ["/mis-citas", "Consulta tus solicitudes"], ["/admin/reservas", "Total de la solicitud"], ["/", "Mi perfil"]]) {
    const response = await fetch(`${base}${route}`, { headers });
    const html = await response.text();
    assert.equal(response.status, 200, `${route}: HTTP failure`);
    assert(html.includes(text), `${route}: expected content missing`);
    assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500') && !html.includes('data-next-error-message='), `${route}: runtime error`);
    if (route === "/perfil") assert(/type="email"[^>]*readOnly|readOnly[^>]*type="email"/i.test(html), "Email is not read-only");
    if (["/perfil", "/direcciones", "/mis-citas"].includes(route)) {
      assert(html.includes('aria-label="Navegación principal"') && html.includes("<footer"), "Account Header/Footer missing");
    }
    if (route === "/perfil") assert(!html.includes("Agregar dirección") && !html.includes("__optional_reference__"), "Profile still embeds the address manager");
    if (route === "/direcciones") {
      assert(html.includes("__optional_reference__"), "Saved addresses not rendered on dedicated page");
      assert(/href="\/direcciones"[^>]*>Mis direcciones/.test(html), "Dedicated address navigation link missing");
      // Shared layouts use the hydrated client router for the active segment.
      // Raw HTTP cannot execute that router; do not claim a browser assertion.
      if (!/href="\/direcciones"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/direcciones"/.test(html)) console.log("NOT RUN: hydrated active-link visual assertion (browser required)");
    }
    if (route === "/") assert(!html.includes('id="professionals-title"'), "Home still renders professional team section");
    if (route === "/admin/reservas") assert(!html.includes("Cliente: "), "Old customer UUID presentation remains");
    console.log(`PASS: authenticated ${route}`);
  }
  for (const route of ["/perfil", "/direcciones"]) {
    const anonymous = await fetch(`${base}${route}`, { redirect: "manual" });
    const anonymousHtml = await anonymous.text();
    assert(anonymous.headers.get("location")?.includes("/login") || anonymousHtml.includes("/login?next="), "Anonymous account access was not redirected");
    console.log(`PASS: anonymous ${route} access requires login`);
  }
  const settings = await supabase.rpc("get_booking_public_settings");
  if (settings.data?.[0]?.booking_enabled) {
    const reservation = await fetch(`${base}/reservar?mode=domicilio`, { headers });
    const html = await reservation.text();
    assert.equal(reservation.status, 200);
    assert(html.includes("Elige dónde recibir el servicio") && html.includes("Usar una dirección nueva") && html.includes("__optional_reference__"), "Booking does not offer saved and new addresses");
    console.log("PASS: domicilio offers saved addresses, new address and existing location data");
  } else console.log("NOT RUN: booking address UI (booking_enabled remains false)");
  const path = `${login.data.user.id}/${randomUUID()}.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  const upload = await bucket.upload(path, png, { contentType: "image/png" });
  assert(!upload.error, "Private avatar upload failed");
  uploaded = path;
  const signed = await bucket.createSignedUrl(path, 60);
  assert(!signed.error && signed.data, "Owner cannot sign avatar URL");
  assert.equal((await fetch(signed.data.signedUrl)).status, 200, "Signed avatar cannot be downloaded");
  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
  assert.notEqual((await fetch(publicUrl)).status, 200, "Private avatar exposed as a public object");
  console.log("PASS: actual image upload, owner signed download and public denial");
} finally {
  if (addressIds.length) {
    const removedAddresses = await supabase.from("customer_addresses").delete().in("id", addressIds).select("id");
    assert(!removedAddresses.error && removedAddresses.data.length === addressIds.length, "Temporary address cleanup failed");
    console.log("PASS: all temporary addresses removed");
  }
  if (uploaded) {
    const removed = await bucket.remove([uploaded]);
    assert(!removed.error, "Temporary avatar cleanup failed");
    console.log("PASS: temporary avatar removed");
  }
  await supabase.auth.signOut({ scope: "local" });
}

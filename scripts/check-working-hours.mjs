// Read-only HTTP check. Supply credentials through stdin, never arguments or files.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";

const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
const credentials = await new Promise(resolve => {
  let input = "";
  process.stdin.on("data", chunk => {
    input += chunk;
    try { resolve(JSON.parse(input)); process.stdin.pause(); if (process.stdin.isTTY) process.stdin.setRawMode(false); }
    catch { /* Wait for complete stdin JSON. */ }
  });
});
const jar = new Map();
const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cookies => cookies.forEach(({ name, value }) => jar.set(name, value)) },
});
try {
  const login = await client.auth.signInWithPassword(credentials);
  assert(!login.error && login.data.user, "Authentication failed");
  const profile = await client.from("profiles").select("role").eq("id", login.data.user.id).single();
  assert.equal(profile.data?.role, "admin", "Existing admin required");
  const headers = { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
  const response = await fetch("http://localhost:3000/admin/horarios", { headers });
  const html = await response.text();
  assert.equal(response.status, 200);
  for (const text of ["Horarios por profesional", "Todos los profesionales", "Nuevo horario", "Ver turnos desactivados y eliminados", "Hora de Lima"]) assert(html.includes(text), `Missing content: ${text}`);
  assert(html.includes('aria-label="Horarios de '), "Professional groups missing");
  assert(html.includes("grid-cols-7") && html.includes("min-w-[70rem]"), "Server is not serving the horizontal seven-day schedule");
  assert(html.includes("bg-brown px-5 py-5 text-white") && html.includes("border-orange bg-orange text-charcoal"), "Updated schedule colors missing");
  assert(html.includes("desliza horizontalmente"), "Horizontal calendar navigation hint missing");
  assert(html.includes("Editar turno") && html.includes("Eliminar turno") && html.includes("Desactivar"), "Existing shifts lack CRUD controls");
  assert(!html.includes("data-next-error-message=") && !html.includes("NEXT_HTTP_ERROR_FALLBACK;500"), "Server rendering error");
  console.log("PASS: authenticated hours page, professional groups, filters, existing shift edit and state controls; HTTP 200");
  const anonymous = await fetch("http://localhost:3000/admin/horarios", { redirect: "manual" });
  const anonymousHtml = await anonymous.text();
  assert(anonymous.headers.get("location")?.includes("/login") || anonymousHtml.includes("/login?next="), "Anonymous admin access allowed");
  console.log("PASS: anonymous access requires login. No schedules modified. Browser interaction/visual checks not executed.");
} finally {
  await client.auth.signOut({ scope: "local" });
}

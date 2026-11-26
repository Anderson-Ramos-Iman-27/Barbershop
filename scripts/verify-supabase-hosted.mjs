import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Read the hosted configuration explicitly: no CLI token or database password.
const environment = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
const base = environment.NEXT_PUBLIC_SUPABASE_URL;
const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(base)) {
  throw new Error("Configura una URL HTTPS alojada y su clave pública en .env.local.");
}

const resources = [
  ["Auth", "/auth/v1/settings"],
  ["Servicios", "/rest/v1/services?select=id&limit=1"],
  ["Modalidades", "/rest/v1/service_modes?select=service_id&limit=1"],
  ["Profesionales", "/rest/v1/professionals?select=id&limit=1"],
  ["Servicios por profesional", "/rest/v1/professional_services?select=professional_id&limit=1"],
  ["Galería", "/rest/v1/gallery_items?select=id&limit=1"],
  ["Configuración pública de Booking", "/rest/v1/rpc/get_booking_public_settings", {}],
  ["Consulta de disponibilidad", "/rest/v1/rpc/get_booking_availability", {
    p_date: new Date().toISOString().slice(0, 10), p_service_ids: [], p_mode: "local", p_professional_id: null,
  }],
];

let failures = 0;
for (const [name, path, body] of resources) {
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: body ? "POST" : "GET",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    // Do not print response bodies, keys, sessions or personal data.
    if (name === "Consulta de disponibilidad" && result.code === "23514") {
      console.log(`${name}: PASS validación de parámetros HTTP ${response.status} 23514`);
    } else if (!response.ok) {
      failures++;
      console.log(`${name}: FAIL HTTP ${response.status} ${result.code ?? ""}`);
    } else {
      console.log(`${name}: PASS HTTP ${response.status}${Array.isArray(result) ? ` (${result.length} filas visibles en esta consulta limitada)` : ""}`);
      if (name === "Auth") console.log(`Google habilitado: ${result.external?.google === true}`);
      if (name === "Configuración pública de Booking") console.log(`booking_enabled: ${result[0]?.booking_enabled === true}`);
    }
  } catch {
    failures++;
    console.log(`${name}: FAIL conexión o respuesta no válida`);
  }
}
console.log("Solo lectura con clave pública. No verifica sesiones, rol admin ni escrituras.");
process.exitCode = failures ? 1 : 0;

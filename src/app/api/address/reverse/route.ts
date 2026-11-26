import { NextResponse } from "next/server";
import { getCurrentActor } from "@/features/auth/session";
import { hasPoint } from "@/features/addresses/types";
import { parseAddressSuggestion, type AddressSuggestion } from "@/features/addresses/geocoding";

const cache = new Map<string, { expires: number; data: AddressSuggestion }>();
const lastRequest = new Map<string, number>();
const pending = new Map<string, Promise<AddressSuggestion>>();
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 1024) return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413, headers });
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Inicia sesión para consultar la dirección." }, { status: 401, headers });
  let value;
  try { const body = await request.text(); if (body.length > 1024) throw new Error(); value = JSON.parse(body); } catch { return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400, headers }); }
  if (!value || !hasPoint(value)) return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400, headers });
  const key = `${actor.id}:${value.latitude.toFixed(6)},${value.longitude.toFixed(6)}`;
  const now = Date.now();
  const saved = cache.get(key);
  if (saved && saved.expires > now) return NextResponse.json(saved.data, { headers });
  const previous = pending.get(key);
  if (previous) { try { return NextResponse.json(await previous, { headers }); } catch { return NextResponse.json({ error: "No se pudo obtener la dirección. Escríbela manualmente." }, { status: 502, headers }); } }
  if (now - (lastRequest.get(actor.id) ?? 0) < 1200) return NextResponse.json({ error: "Espera un momento y vuelve a elegir el punto." }, { status: 429, headers: { ...headers, "Retry-After": "2" } });
  lastRequest.set(actor.id, now);
  // Bounded, short-lived per-user data. Never log coordinates or provider URLs.
  for (const [id, timestamp] of lastRequest) if (now - timestamp > 300000) lastRequest.delete(id);
  for (const [id, entry] of cache) if (entry.expires <= now) cache.delete(id);
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  const lookup = (async () => {
    const url = new URL(process.env.PHOTON_REVERSE_URL || "https://photon.komoot.io/reverse");
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Invalid provider configuration");
    url.search = new URLSearchParams({ lat: String(value.latitude), lon: String(value.longitude), limit: "1", radius: "0.1" }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store", headers: { "User-Agent": "OriginalWave/1.0 (customer-selected address lookup)", "Accept-Language": "es" } });
    if (!response.ok) throw new Error("Geocoder unavailable");
    const data = parseAddressSuggestion(await response.json());
    cache.set(key, { data, expires: Date.now() + 300000 });
    return data;
  })();
  pending.set(key, lookup);
  try { return NextResponse.json(await lookup, { headers }); }
  catch { return NextResponse.json({ error: "No se pudo obtener la dirección. Puedes completar los campos manualmente." }, { status: 502, headers }); }
  finally { pending.delete(key); }
}

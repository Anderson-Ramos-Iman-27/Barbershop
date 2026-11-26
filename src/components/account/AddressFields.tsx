"use client";

import { useEffect, useId, useRef, useState } from "react";
import LocationMap from "./LocationMap";
import { hasPoint, type AddressDraft, type MapPoint } from "@/features/addresses/types";
import type { AddressSuggestion } from "@/features/addresses/geocoding";

export default function AddressFields({ value, onChange }: { value: AddressDraft; onChange: (value: AddressDraft) => void }) {
  const id = useId();
  const latest = useRef({ value, onChange });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const lastLookup = useRef(0);
  const autoFilled = useRef({ address_line: "", district: "" });
  const [lookup, setLookup] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [suggestion, setSuggestion] = useState<AddressSuggestion | null>(null);
  useEffect(() => { latest.current = { value, onChange }; }, [value, onChange]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); request.current?.abort(); }, []);
  function choosePoint(point: MapPoint) {
    const next = { ...latest.current.value, ...point };
    if (next.latitude !== latest.current.value.latitude || next.longitude !== latest.current.value.longitude) {
      for (const key of ["address_line", "district"] as const) if (next[key] === autoFilled.current[key]) next[key] = "";
    }
    latest.current = { ...latest.current, value: next };
    latest.current.onChange(next);
    if (timer.current) clearTimeout(timer.current);
    request.current?.abort();
    const ticket = ++sequence.current;
    setLookup("loading"); setSuggestion(null);
    timer.current = setTimeout(async () => {
      lastLookup.current = Date.now();
      const controller = new AbortController(); request.current = controller;
      try {
        const response = await fetch("/api/address/reverse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(point), signal: controller.signal });
        if (!response.ok) throw new Error();
        const data: AddressSuggestion = await response.json();
        if (ticket !== sequence.current) return;
        const current = latest.current.value;
        if (current.latitude !== point.latitude || current.longitude !== point.longitude) { setLookup("idle"); return; }
        const update = { ...current };
        for (const key of ["address_line", "district"] as const) {
          if (data[key] && (!current[key].trim() || current[key] === autoFilled.current[key])) { update[key] = data[key]; autoFilled.current[key] = data[key]; }
        }
        latest.current = { ...latest.current, value: update };
        latest.current.onChange(update);
        setSuggestion(data); setLookup("done");
      } catch { if (!controller.signal.aborted && ticket === sequence.current) setLookup("error"); }
    }, Math.max(700, 1250 - (Date.now() - lastLookup.current)));
  }
  const input = "mt-2 min-h-11 w-full rounded-md border border-brown/30 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brown";
  return <div className="grid min-w-0 gap-4 sm:grid-cols-2">
    <label className="text-sm font-semibold sm:col-span-2">Dirección completa<input className={input} name="address_line" required maxLength={300} autoComplete="street-address" placeholder="Calle, número y departamento, si corresponde" value={value.address_line} onChange={e => onChange({ ...value, address_line: e.target.value })} /></label>
    <label className="text-sm font-semibold">Distrito<input className={input} name="district" required maxLength={120} value={value.district} onChange={e => onChange({ ...value, district: e.target.value })} /></label>
    <label className="text-sm font-semibold">Referencia (opcional)<input className={input} name="reference" maxLength={500} placeholder="Una indicación para encontrar la entrada" value={value.reference} onChange={e => onChange({ ...value, reference: e.target.value })} /></label>
    <label className="text-sm font-semibold sm:col-span-2">Indicaciones de acceso (opcional)<textarea className={input} name="additional_instructions" maxLength={1000} value={value.additional_instructions} onChange={e => onChange({ ...value, additional_instructions: e.target.value })} /></label>
    <div className="space-y-3 sm:col-span-2"><p className="text-sm leading-relaxed text-brown">Al elegir un punto, intentaremos completar la dirección y el distrito. Puedes corregirlos: revisa el número, departamento y entrada antes de guardar.</p><LocationMap point={hasPoint(value) ? { latitude: value.latitude, longitude: value.longitude } : null} onChange={choosePoint} />
      <div aria-live="polite" className="text-sm leading-relaxed text-brown">{lookup === "loading" && "Buscando la dirección del punto elegido…"}{lookup === "error" && "No se pudo obtener la dirección. Puedes escribirla manualmente o volver a elegir el punto."}{lookup === "done" && (suggestion?.address_line || suggestion?.district ? "Revisa los datos sugeridos por el mapa. Tus referencias e indicaciones no se modificaron." : "No se encontró una dirección para este punto. Completa los campos manualmente.")}</div>
      {suggestion && (suggestion.address_line || suggestion.district) && (suggestion.address_line && value.address_line !== suggestion.address_line || suggestion.district && value.district !== suggestion.district) && <div className="rounded-md bg-cream p-3 text-sm"><p className="break-words">Sugerencia: {[suggestion.address_line, suggestion.district].filter(Boolean).join(" · ")}. Conservamos lo que escribiste.</p><button type="button" onClick={() => { const next = { ...value, address_line: suggestion.address_line || value.address_line, district: suggestion.district || value.district }; autoFilled.current = { address_line: next.address_line, district: next.district }; onChange(next); }} className="mt-2 min-h-11 cursor-pointer rounded-md border border-brown/30 px-3 font-semibold hover:bg-white">Usar la dirección sugerida</button></div>}
      <p className="text-xs text-brown">Direcciones aproximadas de <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer" className="underline">Photon / OpenStreetMap</a>. Solo se consulta el punto que seleccionas; no tu nombre ni tus indicaciones.</p>
    </div>
    <details className="sm:col-span-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold underline underline-offset-4">Introducir coordenadas manualmente</summary><p id={`${id}-coordinates-help`} className="mb-3 text-sm text-brown">Alternativa si el mapa no carga. Copia las coordenadas del punto correcto; no uses datos aproximados.</p><div className="grid gap-4 sm:grid-cols-2">{(["latitude", "longitude"] as const).map(key => <label key={key} className="text-sm font-semibold">{key === "latitude" ? "Latitud" : "Longitud"}<input className={input} name={key} type="number" step="any" min={key === "latitude" ? -90 : -180} max={key === "latitude" ? 90 : 180} aria-describedby={`${id}-coordinates-help`} value={value[key] ?? ""} onChange={e => onChange({ ...value, [key]: e.target.value === "" ? null : Number(e.target.value) })} /></label>)}</div></details>
  </div>;
}

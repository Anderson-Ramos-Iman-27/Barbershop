"use client";

import { useState } from "react";
import LocationMap from "./LocationMap";
import { googleMapsRoute, hasPoint } from "@/features/addresses/types";

type Address = { address_line: string; district: string; reference: string | null; additional_instructions: string | null; latitude: number | null; longitude: number | null };
export default function BookingAddress({ address }: { address: Address }) {
  const [showMap, setShowMap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const route = hasPoint(address) ? googleMapsRoute(address) : null;
  const button = "inline-flex min-h-11 items-center rounded-md border border-brown/30 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown";
  return <section aria-label="Dirección del servicio" className="mt-5 min-w-0 border-t border-brown/15 pt-4"><h3 className="text-sm font-semibold">Dirección del servicio</h3><p className="mt-2 break-words text-sm">{address.address_line}, {address.district}</p>{address.reference && <p className="mt-2 break-words text-sm">Referencia: {address.reference}</p>}{address.additional_instructions && <p className="mt-2 break-words text-sm">Indicaciones: {address.additional_instructions}</p>}
    {route ? <><div className="mt-4 flex flex-wrap gap-3"><a href={route} target="_blank" rel="noopener noreferrer" className={button}>Ver ruta en Google Maps</a><button type="button" className={button} onClick={async () => { setCopied(false); try { await navigator.clipboard.writeText(route); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>Copiar enlace de ubicación</button><button type="button" className={button} aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>{showMap ? "Ocultar mapa" : "Mostrar mapa"}</button></div>{copied && <p role="status" className="mt-3 text-sm">Enlace copiado. Compártelo solo con quien deba atender esta cita.</p>}{copyError && <label className="mt-3 block text-sm">No se pudo copiar. Selecciona este enlace para compartirlo:<input readOnly value={route} onFocus={e => e.target.select()} className="mt-2 min-h-11 w-full min-w-0 rounded-md border border-brown/30 px-3 text-sm" /></label>}{showMap && hasPoint(address) && <div className="mt-4"><LocationMap point={{ latitude: address.latitude, longitude: address.longitude }} /></div>}</> : <p className="mt-3 text-xs text-brown">Esta reserva anterior no tiene un punto guardado en el mapa.</p>}
  </section>;
}

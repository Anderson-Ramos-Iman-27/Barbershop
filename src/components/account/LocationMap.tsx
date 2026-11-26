"use client";

import { useEffect, useRef, useState } from "react";
import type { MapPoint } from "@/features/addresses/types";
import "leaflet/dist/leaflet.css";

export default function LocationMap({ point, onChange }: { point: MapPoint | null; onChange?: (point: MapPoint) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const latest = useRef({ point, onChange });
  const controller = useRef<{ center: () => MapPoint; place: (p: MapPoint) => void; clear: () => void; destroy: () => void } | null>(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const latitude = point?.latitude;
  const longitude = point?.longitude;
  useEffect(() => {
    latest.current = { point, onChange };
  }, [point, onChange]);
  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) controller.current?.place({ latitude, longitude });
    else controller.current?.clear();
  }, [latitude, longitude]);
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then(L => {
      if (cancelled || !element.current) return;
      const initial = latest.current.point;
      const map = L.map(element.current, { scrollWheelZoom: false }).setView(initial ? [initial.latitude, initial.longitude] : [-9.19, -75.0152], initial ? 17 : 5);
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      tiles.on("tileerror", () => setError("No se pudo cargar una parte del mapa. Puedes reintentar o introducir las coordenadas manualmente."));
      let marker: ReturnType<typeof L.circleMarker> | undefined;
      const place = (p: MapPoint) => {
        const ll: [number, number] = [p.latitude, p.longitude];
        if (marker) marker.setLatLng(ll);
        else marker = L.circleMarker(ll, { radius: 10, color: "#493C36", fillColor: "#F6A35A", fillOpacity: 1, weight: 3 }).addTo(map);
        if (map.getZoom() < 15 || !map.getBounds().contains(ll)) map.setView(ll, 17, { animate: false });
      };
      if (initial) place(initial);
      map.on("click", event => { if (!element.current?.closest("fieldset[disabled]")) latest.current.onChange?.({ latitude: Number(event.latlng.lat.toFixed(7)), longitude: Number(event.latlng.lng.toFixed(7)) }); });
      controller.current = { place, clear: () => { marker?.remove(); marker = undefined; }, center: () => { const c = map.getCenter(); return { latitude: Number(c.lat.toFixed(7)), longitude: Number(c.lng.toFixed(7)) }; }, destroy: () => map.remove() };
      const resize = new ResizeObserver(() => map.invalidateSize());
      resize.observe(element.current);
      const destroy = controller.current.destroy;
      controller.current.destroy = () => { resize.disconnect(); destroy(); };
    }).catch(() => { if (!cancelled) setError("No se pudo abrir el mapa. Introduce las coordenadas o vuelve a intentarlo más tarde."); });
    return () => { cancelled = true; controller.current?.destroy(); controller.current = null; };
  }, []);

  function locate() {
    if (!navigator.geolocation) { setGeoError("Tu navegador no ofrece ubicación. Selecciona el punto manualmente."); return; }
    setLocating(true); setGeoError("");
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      onChange?.({ latitude: Number(position.coords.latitude.toFixed(7)), longitude: Number(position.coords.longitude.toFixed(7)) });
    }, () => { setLocating(false); setGeoError("No se obtuvo tu ubicación. Puedes elegir el punto en el mapa o escribir las coordenadas."); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  return <div className="min-w-0 space-y-3">
    {onChange && <p className="text-sm leading-relaxed text-brown">Señala la entrada de tu domicilio. Pulsa el mapa para mover el punto; también puedes desplazarlo con las flechas del teclado y elegir su centro. La vista inicial no es tu dirección.</p>}
    <div ref={element} role="region" aria-label={onChange ? "Mapa para elegir la ubicación del domicilio" : "Ubicación de la reserva"} className="relative z-0 isolate h-72 w-full rounded-md border border-brown/30 bg-cream-deep" />
    {error && <p role="status" className="text-sm text-brown">{error}</p>}
    {onChange && <div className="flex flex-wrap gap-3"><button type="button" disabled={locating} onClick={locate} className="min-h-11 rounded-md border border-brown/30 px-3 text-sm font-semibold disabled:opacity-60">{locating ? "Buscando ubicación…" : "Usar mi ubicación actual"}</button><button type="button" onClick={() => { const center = controller.current?.center(); if (center) onChange(center); }} className="min-h-11 rounded-md border border-brown/30 px-3 text-sm font-semibold">Elegir el centro del mapa</button></div>}
    {geoError && <p role="alert" className="text-sm text-brown">{geoError}</p>}
    <p aria-live="polite" className="text-xs text-brown">{point ? `Punto seleccionado: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}. Revisa que corresponda al domicilio.` : "Todavía no has elegido un punto."}</p>
  </div>;
}

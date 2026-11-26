"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { Service } from "@/features/services/types";
import type { PublicProfessional } from "@/features/professionals/queries";
import type { AvailableSlot } from "@/features/availability/types";
import { createClient } from "@/lib/supabase/browser";
import AddressFields from "@/components/account/AddressFields";
import LocationMap from "@/components/account/LocationMap";
import { emptyAddress, hasPoint, type AddressDraft, type SavedAddress } from "@/features/addresses/types";

type Mode = "local" | "domicilio";
const field = "mt-2 min-h-11 w-full rounded-md border border-brown/30 bg-white px-3 py-2 font-sans text-sm focus-visible:outline-2 focus-visible:outline-orange-text";
const formatSlot = (value: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

export default function BookingForm({ services, modes, professionals, assignmentMode, initialService, initialMode, addresses, addressError }: {
  services: Service[]; modes: Record<string, readonly Mode[]>; professionals: PublicProfessional[];
  assignmentMode: "customer_choice" | "automatic" | null; initialService?: string; initialMode?: string;
  addresses: SavedAddress[]; addressError?: boolean;
}) {
  const [serviceIds, setServiceIds] = useState<string[]>(initialService && services.some(s => s.id === initialService) ? [initialService] : []);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode === "domicilio" ? "domicilio" : "local");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState<AvailableSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState<AddressDraft>({ ...emptyAddress });
  const [addressId, setAddressId] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const destination = addresses.find(a => a.id === addressId) ?? address;
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const availableServices = useMemo(() => services.filter(s => (modes[s.id] ?? []).includes(mode)), [services, modes, mode]);
  const resetSelection = () => { setSlots([]); setSelected(null); setError(""); setHasSearched(false); request.current = null; };
  const selectedServices = services.filter(s => serviceIds.includes(s.id));
  const duration = selectedServices.reduce((total, s) => total + (s.durationMinutes ?? 0), 0);
  const validServices = serviceIds.length > 0 && selectedServices.every(s => (modes[s.id] ?? []).includes(mode));
  const fingerprint = JSON.stringify({ serviceIds: [...serviceIds].sort(), mode, startsAt: selected?.startsAt, professionalId: assignmentMode === "customer_choice" ? professionalId : null, destination: mode === "domicilio" ? destination : null, saveAddress: mode === "domicilio" && !addressId && saveAddress });

  async function loadSlots() {
    if (!validServices || !date || (assignmentMode === "customer_choice" && !professionalId)) { setError("Selecciona servicios, fecha y profesional cuando corresponda."); return; }
    setBusy(true); setError(""); setSelected(null); setHasSearched(false);
    try {
    const { data, error: queryError } = await createClient().rpc("get_booking_availability", { p_date: date, p_service_ids: serviceIds, p_mode: mode, p_professional_id: assignmentMode === "customer_choice" ? professionalId : null });
    if (queryError) setError("No fue posible consultar horarios. Inténtalo de nuevo.");
    else {
      const found = (data ?? []).map(s => ({ startsAt: s.starts_at, endsAt: s.ends_at, professionalId: s.professional_id }));
      setSlots(assignmentMode === "automatic" ? found.filter((slot, index) => found.findIndex(other => other.startsAt === slot.startsAt) === index) : found);
      setHasSearched(true);
    }
    } catch { setError("No se pudo conectar. Revisa tu conexión y vuelve a consultar."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!selected || !validServices) return;
    if (mode === "domicilio" && (!destination.address_line.trim() || !destination.district.trim() || !hasPoint(destination))) { setError("Completa dirección, distrito y selecciona el punto de llegada. La referencia es opcional."); return; }
    setBusy(true); setError("");
    try {
    if (!request.current || request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    const supabase = createClient();
    const hold = await supabase.rpc("request_booking_hold", { p_service_ids: serviceIds, p_mode: mode, p_starts_at: selected.startsAt, p_professional_id: assignmentMode === "customer_choice" ? professionalId : null, p_idempotency_key: request.current.key, p_request_fingerprint: fingerprint });
    if (hold.error || !hold.data) { setError(hold.error?.code === "23P01" ? "Ese horario acaba de ocuparse. Consulta otros horarios." : "No se pudo retener el horario. Revisa los datos e inténtalo otra vez."); setBusy(false); return; }
    const booking = await supabase.rpc("convert_hold_to_booking_with_address", { p_hold_id: hold.data, p_request_fingerprint: fingerprint, p_saved_address_id: mode === "domicilio" ? addressId || null : null, p_address_line: mode === "domicilio" ? destination.address_line.trim() : null, p_district: mode === "domicilio" ? destination.district.trim() : null, p_reference: mode === "domicilio" ? destination.reference.trim() || null : null, p_additional_instructions: mode === "domicilio" ? destination.additional_instructions.trim() || null : null, p_latitude: mode === "domicilio" ? destination.latitude : null, p_longitude: mode === "domicilio" ? destination.longitude : null, p_save_address: mode === "domicilio" && !addressId && saveAddress });
    if (booking.error || !booking.data) {
      if (booking.error?.code === "55000") { resetSelection(); setError("La retención venció o las reservas dejaron de estar disponibles. Consulta los horarios nuevamente."); }
      else if (booking.error?.code === "42501") setError("La dirección guardada ya no está disponible. Elige otra dirección o escribe una nueva.");
      else setError("No se pudo crear la solicitud. Revisa la dirección y el punto elegido. El horario se retiene hasta 10 minutos; puedes volver a intentarlo.");
      return;
    }
    router.push(`/mis-citas?created=${encodeURIComponent(booking.data)}`);
    } catch { setError("No se pudo conectar. Vuelve a intentarlo; no enviaremos una solicitud duplicada."); }
    finally { setBusy(false); }
  }

  return <fieldset disabled={busy} aria-busy={busy} className="mt-8 min-w-0 space-y-7 rounded-xl border border-brown/20 bg-white p-5 sm:p-8">
    <fieldset><legend className="font-heading text-2xl font-bold uppercase">1. Servicios</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{availableServices.map(s => <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-brown/20 p-3 font-sans text-sm"><input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => { setServiceIds(ids => ids.includes(s.id) ? ids.filter(id => id !== s.id) : [...ids, s.id]); resetSelection(); }} /> <span>{s.name} · {s.price} · {s.durationMinutes} min</span></label>)}</div>{availableServices.length === 0 && <p className="mt-3 text-sm text-brown">No hay servicios disponibles para esta modalidad.</p>}{duration > 0 && <p className="mt-3 text-sm font-semibold">Duración total: {duration} min</p>}</fieldset>
    <fieldset><legend className="font-heading text-2xl font-bold uppercase">2. Modalidad</legend><div className="mt-3 flex gap-5 font-sans text-sm">{(["local", "domicilio"] as const).map(value => <label key={value} className="cursor-pointer"><input type="radio" name="mode" checked={mode === value} onChange={() => { setMode(value); setServiceIds(ids => ids.filter(id => (modes[id] ?? []).includes(value))); resetSelection(); }} /> {value === "local" ? "En el local" : "A domicilio"}</label>)}</div></fieldset>
    {assignmentMode === "customer_choice" && <label className="block font-sans text-sm font-semibold">3. Profesional<select className={field} value={professionalId} onChange={e => { setProfessionalId(e.target.value); resetSelection(); }}><option value="">Selecciona un profesional</option>{professionals.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select></label>}
    <div><label className="block font-sans text-sm font-semibold">{assignmentMode === "customer_choice" ? "4" : "3"}. Fecha<input className={field} type="date" value={date} onChange={e => { setDate(e.target.value); resetSelection(); }} /></label><button type="button" onClick={loadSlots} disabled={busy || !validServices || !date} className="mt-3 min-h-11 rounded-full bg-charcoal px-5 py-2 font-sans text-sm font-semibold text-white disabled:opacity-50">{busy ? "Consultando…" : "Ver horarios"}</button></div>
    {slots.length > 0 && <fieldset><legend className="font-sans text-sm font-semibold">Horarios disponibles (America/Lima)</legend><div className="mt-3 flex flex-wrap gap-2">{slots.map(slot => <button key={`${slot.startsAt}-${slot.professionalId}`} type="button" onClick={() => setSelected(slot)} aria-pressed={selected?.startsAt === slot.startsAt && selected?.professionalId === slot.professionalId} className={`min-h-11 rounded-md border px-4 py-2 text-sm ${selected?.startsAt === slot.startsAt && selected?.professionalId === slot.professionalId ? "border-charcoal bg-charcoal text-white" : "border-brown/30"}`}>{formatSlot(slot.startsAt)}</button>)}</div></fieldset>}
    {hasSearched && slots.length === 0 && !busy && <p role="status" className="font-sans text-sm text-brown">No hay horarios disponibles para esta búsqueda. Prueba otra fecha o profesional.</p>}
    {mode === "domicilio" && <fieldset className="space-y-4"><legend className="font-heading text-2xl font-bold uppercase">Dirección de atención</legend>
      {addressError && <p role="status" className="text-sm text-brown">No pudimos cargar tus direcciones guardadas. Puedes escribir una nueva o volver a abrir esta página.</p>}
      {addresses.length > 0 && <label className="block text-sm font-semibold">Elige dónde recibir el servicio<select className={field} value={addressId} onChange={e => { setAddressId(e.target.value); request.current = null; }}><option value="">Usar una dirección nueva</option>{addresses.map(a => <option key={a.id} value={a.id}>{a.address_line} · {a.district}</option>)}</select></label>}
      {addressId ? <div className="space-y-3 rounded-md border border-brown/20 p-4"><p className="break-words text-sm font-semibold">{destination.address_line} · {destination.district}</p>{destination.reference && <p className="break-words text-sm">Referencia: {destination.reference}</p>}{destination.additional_instructions && <p className="break-words text-sm">{destination.additional_instructions}</p>}<LocationMap point={hasPoint(destination) ? { latitude: destination.latitude, longitude: destination.longitude } : null} /><Link href="/direcciones" className="inline-flex min-h-11 items-center text-sm underline">Administrar mis direcciones</Link></div> : <><AddressFields value={address} onChange={setAddress} /><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} />Guardar esta dirección en mi perfil para próximas citas</label></>}
    </fieldset>}
    {selected && <div className="space-y-3 rounded-md bg-cream p-4 font-sans text-sm"><p>Solicitud para el {date} a las {formatSlot(selected.startsAt)}. La cita quedará pendiente hasta que administración la apruebe.</p>{mode === "domicilio" && <div><p className="font-semibold">Domicilio del servicio</p><p className="mt-1 break-words">{destination.address_line || "Completa la dirección"} · {destination.district || "Completa el distrito"}</p>{destination.reference && <p className="mt-1 break-words">Referencia: {destination.reference}</p>}<p className="mt-1 text-brown">{hasPoint(destination) ? `Punto: ${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)}` : "Falta elegir el punto del domicilio."}</p><p className="mt-2">Revisa la dirección antes de enviar. Administración la recibirá para organizar la atención.</p></div>}</div>}
    {error && <p role="alert" className="font-sans text-sm font-semibold text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center gap-4"><button type="button" onClick={submit} disabled={!selected || busy} className="min-h-11 rounded-full bg-orange px-6 py-3 font-sans text-sm font-semibold text-charcoal disabled:opacity-50">{busy ? "Enviando solicitud…" : "Solicitar cita"}</button><Link href="/mis-citas" className="font-sans text-sm font-semibold underline">Ver mis citas</Link></div>
  </fieldset>;
}

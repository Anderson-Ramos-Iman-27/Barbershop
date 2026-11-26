import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { bookingStatusLabels, formatAppointment, formatPen } from "@/features/booking/presentation";
import CancelBookingButton from "@/components/booking/CancelBookingButton";

export const instant = false;
export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const identity = await supabase.auth.getClaims();
  if (identity.error || !identity.data?.claims.sub) redirect("/login?next=/mis-citas");
  const [actor, params, { data: bookings, error }] = await Promise.all([
    getCurrentActor(), searchParams,
    supabase.from("bookings").select("id, starts_at, status, mode, professional_name_snapshot, total_duration_minutes").eq("customer_profile_id", identity.data.claims.sub).order("starts_at", { ascending: false }),
  ]);
  if (!actor) redirect("/login?next=/mis-citas");
  const services = bookings?.length ? await supabase.from("booking_services").select("booking_id, service_name_snapshot, price_pen_centavos_snapshot").in("booking_id", bookings.map(b => b.id)).order("position") : { data: [], error: null };
  return <section><h2 className="font-heading text-3xl font-bold uppercase">Mis citas</h2><p className="mt-3 text-sm text-brown">Consulta tus solicitudes, servicios y estado de aprobación.</p>
    {params.created && <p role="status" className="mt-5 rounded-md bg-white p-4 text-sm">Solicitud enviada. Queda pendiente de aprobación administrativa.</p>}
    {params.error && <p role="alert" className="mt-5 text-sm text-red-700">No fue posible cancelar la cita. Comprueba el plazo permitido.</p>}
    {error || services.error ? <p role="alert" className="mt-6 text-sm">No fue posible consultar tus citas.</p> : bookings?.length ? <div className="mt-6 grid gap-4">{bookings.map(b => {
      const items = services.data?.filter(s => s.booking_id === b.id) ?? [];
      return <article key={b.id} className="rounded-xl border border-brown/20 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-heading text-2xl font-bold uppercase">{formatAppointment(b.starts_at)}</h3><p className="mt-2 text-sm">{b.professional_name_snapshot} · {b.mode === "local" ? "En local" : "A domicilio"} · {b.total_duration_minutes} min</p></div><span className="text-sm font-semibold">{bookingStatusLabels[b.status]}</span></div><ul className="mt-4 space-y-2">{items.map((s, index) => <li key={index} className="flex flex-wrap justify-between gap-2 text-sm"><span>{s.service_name_snapshot}</span><span>{formatPen(s.price_pen_centavos_snapshot)}</span></li>)}</ul><p className="mt-4 border-t border-brown/15 pt-3 text-sm font-semibold">Total: {formatPen(items.reduce((sum, s) => sum + s.price_pen_centavos_snapshot, 0))}</p>{["pending", "confirmed"].includes(b.status) && <CancelBookingButton bookingId={b.id} appointment={`${formatAppointment(b.starts_at)} · ${b.professional_name_snapshot}`} />}</article>;
    })}</div> : <p className="mt-6 text-sm">Todavía no tienes solicitudes. <Link href="/reservar" className="underline">Reservar cita</Link></p>}
  </section>;
}

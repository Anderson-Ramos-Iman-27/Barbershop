import { connection } from "next/server";
import Link from "next/link";
import { decideBooking } from "@/features/booking/actions";
import { requireAdministrator } from "@/features/auth/session";
import { getAdminBookings } from "@/features/admin/bookings";
import { formatAppointment, formatPen } from "@/features/booking/presentation";
import BookingStatusBadge from "@/components/admin/BookingStatusBadge";
import BookingDecisionButtons from "@/components/admin/BookingDecisionButtons";
import BookingAddress from "@/components/account/BookingAddress";

export const instant = false;
export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; id?: string }> }) {
  await connection();
  await requireAdministrator();
  const params = await searchParams;
  let bookings: Awaited<ReturnType<typeof getAdminBookings>> = [];
  let failed = false;
  try { bookings = await getAdminBookings(params.id); } catch { failed = true; }
  return <section>
    <p className="text-xs font-semibold uppercase tracking-widest text-orange-text">Operación</p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4"><h1 className="font-heading text-5xl font-bold uppercase">Reservas</h1><Link href="/admin/calendario" className="inline-flex min-h-11 items-center text-sm font-semibold underline">Ver calendario</Link></div>
    <p className="mt-4 text-sm text-brown">Las solicitudes requieren aprobación. Los horarios pendientes permanecen ocupados.</p>
    {params.id && <Link href="/admin/reservas" className="mt-4 inline-flex min-h-11 items-center text-sm underline">Ver todas las reservas</Link>}
    {params.error && <p role="alert" className="mt-5 text-sm text-orange-text">No fue posible realizar la operación. Revisa el plazo y el estado de la solicitud.</p>}
    {params.saved && <p role="status" className="mt-5 text-sm">Reserva actualizada.</p>}
    {failed ? <p role="alert" className="mt-6 text-sm">No fue posible cargar las reservas y sus detalles.</p> : !bookings.length ? <p className="mt-6 text-sm">No hay reservas para mostrar.</p> : <div className="mt-7 grid gap-5">{bookings.map(b => <article data-admin-card key={b.id} className="min-w-0 rounded-xl border border-brown/20 bg-white p-5 sm:p-6">
      <div data-admin-card-header className="flex flex-wrap justify-between gap-4"><div className="min-w-0"><h2 className="break-words font-heading text-3xl font-bold uppercase">{b.customerName}</h2><p className="mt-2 text-sm font-semibold">{formatAppointment(b.starts_at)}</p><p className="mt-1 text-sm text-brown">{b.professional_name_snapshot} · {b.mode === "local" ? "En local" : "A domicilio"} · {b.total_duration_minutes} min</p></div><div><BookingStatusBadge status={b.status} /><p className="mt-2 text-xl font-bold">{formatPen(b.totalCentavos)}</p><p className="text-xs text-brown">Total de la solicitud</p></div></div>
      <dl className="mt-5 grid gap-3 border-y border-brown/15 py-4 text-sm sm:grid-cols-2"><div><dt className="text-brown">Teléfono de contacto</dt><dd className="mt-1 font-medium">{b.customerPhone || "Pendiente de completar"}</dd></div><div><dt className="text-brown">Solicitud recibida</dt><dd className="mt-1">{formatAppointment(b.requested_at)}</dd></div></dl>
      <ul aria-label="Servicios y precios de la solicitud" className="mt-4 space-y-3">{b.services.map((service, index) => <li key={index} className="flex flex-wrap justify-between gap-2 text-sm"><span>{service.service_name_snapshot} <span className="text-brown">· {service.duration_minutes_snapshot} min</span></span><span className="font-semibold">{formatPen(service.price_pen_centavos_snapshot)}</span></li>)}</ul>
      <p className="mt-3 text-xs text-brown">Precios y duración conservados al solicitar la cita.</p>
      {b.mode === "domicilio" && b.address && <BookingAddress address={b.address} />}
      <p className="mt-4 text-xs text-brown">Referencia: {b.id.slice(0, 8)}{b.status === "pending" ? ` · Aprobar antes de ${formatAppointment(b.approval_deadline_at)}` : ""}</p>
      {b.status === "pending" && <form action={decideBooking} className="mt-5 flex flex-wrap gap-3"><input type="hidden" name="id" value={b.id} /><BookingDecisionButtons /></form>}
    </article>)}</div>}
  </section>;
}

import Link from "next/link";
import BookingStatusBadge from "@/components/admin/BookingStatusBadge";
import { connection } from "next/server";
import { calendarWeek, getCalendarData, shiftDate } from "@/features/admin/calendar";
import { decideBooking } from "@/features/booking/actions";
import BookingDecisionButtons from "@/components/admin/BookingDecisionButtons";

export const instant = false;
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", ...options }).format(new Date(`${date}T12:00:00-05:00`));
const timeLabel = (date: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(date));

export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; professional?: string; saved?: string; error?: string }> }) {
  await connection();
  const params = await searchParams;
  const week = calendarWeek(params.date);
  let data;
  try { data = await getCalendarData(week.start, week.end, params.professional); }
  catch { return <section><h1 className="font-heading text-4xl font-bold uppercase">Calendario</h1><p role="alert" className="mt-5 text-sm">No fue posible cargar la agenda. <Link href="/admin/calendario" className="font-semibold underline">Volver a intentarlo</Link></p></section>; }
  const href = (date: string) => `/admin/calendario?${new URLSearchParams({ date, ...(params.professional ? { professional: params.professional } : {}) })}`;
  const returnTo = href(week.start);
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-4xl font-bold uppercase sm:text-5xl">Calendario</h1><p className="mt-3 text-sm text-brown">Solicitudes y citas de la semana · hora de Lima</p></div><Link href="/admin/reservas" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Ver todas las reservas</Link></div>
    <form className="mt-7 flex flex-wrap items-end gap-4 rounded-xl border border-brown/20 bg-white p-4">
      <label className="text-sm font-semibold">Semana del<input type="date" name="date" defaultValue={week.start} className="mt-2 block min-h-11 rounded-md border border-brown/30 px-3 text-sm" /></label>
      <label className="min-w-0 flex-1 text-sm font-semibold">Profesional<select name="professional" defaultValue={params.professional ?? ""} className="mt-2 block min-h-11 w-full min-w-44 rounded-md border border-brown/30 bg-white px-3 text-sm"><option value="">Todos los profesionales</option>{data.professionals.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
      <button type="submit" className="min-h-11 rounded-md border border-orange bg-orange px-5 text-sm font-semibold text-charcoal transition-colors hover:border-brown hover:bg-brown hover:text-white">Ver agenda</button>
    </form>
    <nav aria-label="Cambiar semana" className="my-5 flex flex-wrap items-center justify-between gap-3"><Link href={href(shiftDate(week.start, -7))} className="inline-flex min-h-11 items-center rounded-md border border-brown/40 bg-white px-3 text-sm font-semibold text-brown hover:border-brown hover:bg-cream-deep">Anterior</Link><div className="text-center"><p className="text-sm font-semibold">{dateLabel(week.start, { day: "numeric", month: "short" })} – {dateLabel(week.days[6], { day: "numeric", month: "short", year: "numeric" })}</p><Link href={href(week.today)} className="inline-flex min-h-11 items-center text-sm underline">Esta semana</Link></div><Link href={href(shiftDate(week.start, 7))} className="inline-flex min-h-11 items-center rounded-md border border-brown/40 bg-white px-3 text-sm font-semibold text-brown hover:border-brown hover:bg-cream-deep">Siguiente</Link></nav>
    {params.saved && <p role="status" className="mb-5 text-sm font-semibold">Reserva actualizada.</p>}{params.error && <p role="alert" className="mb-5 text-sm font-semibold">No se pudo actualizar. Revisa el estado y el plazo de aprobación.</p>}
    <p className="mb-4 text-sm text-brown">{data.bookings.length} {data.bookings.length === 1 ? "cita" : "citas"} · Pendiente: requiere aprobación · Confirmada: aceptada</p>
    <div className="grid gap-4 xl:grid-cols-7 xl:gap-2">
      {week.days.map(day => {
        const appointments = data.bookings.filter(b => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(b.starts_at)) === day);
        return <section key={day} aria-label={dateLabel(day, { dateStyle: "full" })} className="min-w-0 rounded-xl border border-brown/20 bg-white">
          <h2 className={`rounded-t-xl border-b border-brown/15 px-3 py-3 text-sm font-semibold capitalize ${day === week.today ? "bg-orange text-charcoal" : "bg-brown text-white"}`}>{dateLabel(day, { weekday: "short", day: "numeric", month: "short" })}{day === week.today && <span className="ml-1 text-xs">· Hoy</span>}</h2>
          <div className="grid gap-3 p-3">{appointments.length ? appointments.map(b => <article key={b.id} className={`min-w-0 rounded-md border p-3 ${b.status === "pending" ? "border-dashed border-brown/50 bg-cream/40" : "border-brown/20"}`}>
            <p className="text-sm font-semibold tabular-nums">{timeLabel(b.starts_at)}–{timeLabel(b.ends_at)}</p><p className="mt-2 break-words text-sm font-semibold">{b.customerName}</p><p className="mt-1 break-words text-xs text-brown">{b.professional_name_snapshot}</p><p className="mt-2 break-words text-xs leading-relaxed">{b.services.join(" · ")}</p><p className="mt-2 text-xs">{b.mode === "local" ? "En local" : "A domicilio"}</p><div className="mt-2"><BookingStatusBadge status={b.status} /></div>
            <Link href={`/admin/reservas?id=${b.id}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-4">Ver detalle</Link>
            {b.status === "pending" && <form action={decideBooking} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="id" value={b.id} /><input type="hidden" name="returnTo" value={returnTo} /><BookingDecisionButtons /></form>}
          </article>) : <p className="py-4 text-xs text-brown">Sin citas pendientes o confirmadas.</p>}</div>
        </section>;
      })}
    </div>
  </section>;
}

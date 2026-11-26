import { connection } from "next/server";
import Link from "next/link";
import { requireAdministrator } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import WorkingHoursManager from "@/components/admin/WorkingHoursManager";

export const instant = false;

export default async function AdminHoursPage() {
  await connection();
  await requireAdministrator();
  const supabase = await createClient();
  const [professionals, hours] = await Promise.all([
    supabase.from("professionals").select("id,display_name,is_active,archived_at").order("display_name").order("id"),
    supabase.from("professional_working_hours").select("id,professional_id,weekday,starts_at,ends_at,effective_from,effective_until,is_active,archived_at").order("weekday").order("starts_at"),
  ]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-4xl font-bold uppercase leading-none sm:text-5xl">Horarios por profesional</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-brown">Organiza los días y turnos de cada integrante del equipo. Puedes crear varios turnos por día, editar su vigencia o retirarlos de la disponibilidad.</p></div><Link href="/admin/calendario" className="inline-flex min-h-11 items-center text-sm font-semibold text-brown underline underline-offset-4">Ver agenda de citas</Link></div>
    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brown">Los turnos no pueden cruzarse. Si un profesional tiene citas o retenciones futuras, el sistema protege su disponibilidad y puede impedir cambios hasta revisar la agenda.</p>
    {professionals.error || hours.error ? <div role="alert" className="mt-7 rounded-xl border border-brown/20 bg-white p-6"><p className="text-sm">No se pudieron cargar los profesionales y sus horarios.</p><Link href="/admin/horarios" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">Volver a intentarlo</Link></div> : <WorkingHoursManager professionals={professionals.data} hours={hours.data} today={today} />}
  </section>;
}

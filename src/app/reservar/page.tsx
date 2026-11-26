import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BookingForm from "@/components/booking/BookingForm";
import { getCurrentActor } from "@/features/auth/session";
import { getPublishedServices, getActiveServiceModes } from "@/features/services/queries";
import { getPublishedProfessionals } from "@/features/professionals/queries";
import { createClient } from "@/lib/supabase/server";
import { getOwnAddresses } from "@/features/addresses/queries";

export const instant = false;

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ service?: string; mode?: string }> }) {
  await connection();
  const params = await searchParams;
  const actor = await getCurrentActor();
  if (!actor) {
    const returnUrl = new URL("/reservar", "http://localhost");
    if (params.service && /^[0-9a-f-]{36}$/i.test(params.service)) returnUrl.searchParams.set("service", params.service);
    if (params.mode === "local" || params.mode === "domicilio") returnUrl.searchParams.set("mode", params.mode);
    redirect(`/login?next=${encodeURIComponent(returnUrl.pathname + returnUrl.search)}`);
  }
  const supabase = await createClient();
  const [services, modes, professionals, settingsResult] = await Promise.all([
    getPublishedServices(), getActiveServiceModes(), getPublishedProfessionals(),
    supabase.rpc("get_booking_public_settings"),
  ]);
  const settings = settingsResult.data?.[0];
  let addresses: Awaited<ReturnType<typeof getOwnAddresses>> = [];
  let addressError = false;
  try { addresses = await getOwnAddresses(); } catch { addressError = true; }
  return <main className="min-h-dvh bg-cream px-5 py-10 text-charcoal sm:px-8 lg:py-16">
    <div className="mx-auto max-w-4xl">
      <Link href="/" className="font-sans text-sm font-semibold underline underline-offset-4">← Volver al inicio</Link>
      <p className="mt-10 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text">Reserva tu cita</p>
      <h1 className="mt-3 font-heading text-5xl font-bold uppercase leading-none sm:text-6xl">Elige tu horario.</h1>
      <p className="mt-4 max-w-2xl font-sans text-sm text-brown">Selecciona servicios, modalidad y horario. Tu solicitud quedará pendiente de aprobación administrativa.</p>
      {!settingsResult.error && settings?.booking_enabled ? <BookingForm services={services.filter((service) => service.price && service.durationMinutes)} modes={Object.fromEntries(modes)} professionals={professionals} assignmentMode={settings.professional_assignment_mode} initialService={params.service} initialMode={params.mode} addresses={addresses} addressError={addressError} /> : <div className="mt-8 rounded-xl border border-brown/20 bg-white p-6 font-sans text-sm">Las reservas aún no están disponibles. Vuelve cuando se hayan configurado los horarios y la atención.</div>}
    </div>
  </main>;
}

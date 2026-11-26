import Link from "next/link";
import { connection } from "next/server";

import { getAdminSummary } from "@/features/admin/queries";

export const instant = false;

export default async function AdminPage() {
  await connection();
  const data = await getAdminSummary();

  const cards = [
    ["Servicios", data.services, "/admin/servicios"],
    ["Profesionales", data.professionals, "/admin/profesionales"],
    ["Galería", data.gallery, "/admin/galeria"],
  ] as const;

  return (
    <>
      <div className="max-w-3xl">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text">
          Resumen operativo
        </p>
        <h1 className="mt-3 font-heading text-5xl font-bold uppercase leading-[0.9] sm:text-6xl">
          Controla la operación.
        </h1>
        <p className="mt-4 font-sans text-base leading-relaxed text-brown">
          Crea borradores, configura el equipo y publica el catálogo que aparece en la portada. {data.settings?.bookingEnabled ? "La recepción de solicitudes está habilitada." : "La recepción de solicitudes está deshabilitada; revisa su configuración antes de habilitarla."}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <Link
            data-admin-metric
            key={href}
            href={href}
            className="rounded-2xl border border-brown/15 bg-white p-6 transition-colors hover:border-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown"
          >
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-brown">{label}</p>
            <p className="mt-3 font-heading text-5xl font-bold leading-none text-charcoal">{value}</p>
          </Link>
        ))}
      </div>

      <section data-admin-card className="mt-8 rounded-2xl border border-brown/15 bg-white p-6 sm:p-8">
        <h2 data-admin-card-header className="font-heading text-3xl font-bold uppercase">Configuración actual</h2>
        {data.settings ? (
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="font-semibold text-brown">Moneda</dt><dd>{data.settings.currencyCode}</dd></div>
            <div><dt className="font-semibold text-brown">Zona horaria</dt><dd>{data.settings.businessTimezone}</dd></div>
            <div><dt className="font-semibold text-brown">Reservas</dt><dd>{data.settings.bookingEnabled ? "Habilitadas" : "Deshabilitadas"}</dd></div>
            <div><dt className="font-semibold text-brown">Granularidad</dt><dd>{data.settings.bookingSlotIntervalMinutes} minutos</dd></div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-brown">No hay configuración disponible.</p>
        )}
      </section>
    </>
  );
}

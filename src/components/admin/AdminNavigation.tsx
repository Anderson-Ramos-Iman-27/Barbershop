"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { label: "Resumen", href: "/admin" },
  { label: "Reservas", href: "/admin/reservas" },
  { label: "Calendario", href: "/admin/calendario" },
  { label: "Servicios", href: "/admin/servicios" },
  { label: "Profesionales", href: "/admin/profesionales" },
  { label: "Horarios", href: "/admin/horarios" },
  { label: "Galería", href: "/admin/galeria" },
  { label: "Configuración", href: "/admin/configuracion" },
] as const;

function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span className="inline-flex w-4 shrink-0 items-center justify-center" aria-live="polite">{pending ? <><span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" /><span className="sr-only">Cargando sección…</span></> : null}</span>;
}

export default function AdminNavigation() {
  const pathname = usePathname();
  const [intent, setIntent] = useState<string | null>(null);
  return (
    <nav aria-label="Navegación administrativa" className="flex gap-1 overflow-x-auto px-4 py-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:py-6">
      {navigation.map(({ label, href }) => {
        const active = pathname === href;
        return <Link key={href} href={href} prefetch={intent === href ? true : "auto"} onMouseEnter={() => setIntent(href)} onFocus={() => setIntent(href)} onTouchStart={() => setIntent(href)} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-4 font-sans text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${active ? "bg-orange text-charcoal" : "text-white/80 hover:bg-brown hover:text-white"}`}>{label}<NavigationPending /></Link>;
      })}
    </nav>
  );
}

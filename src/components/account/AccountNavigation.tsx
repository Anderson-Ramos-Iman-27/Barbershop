"use client";

import Link, { useLinkStatus } from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import SignOutButton from "@/components/admin/SignOutButton";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status" className="ml-2 text-xs">Cargando…</span> : null;
}

export default function AccountNavigation() {
  const segment = useSelectedLayoutSegment();
  const pathname = segment ? `/${segment}` : null;
  return <aside><nav aria-label="Mi cuenta" className="flex flex-wrap gap-2 lg:flex-col">
    {[{ label: "Mi perfil", href: "/perfil" }, { label: "Mis direcciones", href: "/direcciones" }, { label: "Mis citas", href: "/mis-citas" }, { label: "Reservar cita", href: "/reservar" }].map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown ${pathname === item.href ? "bg-charcoal text-white" : "text-brown hover:bg-white"}`}>{item.label}<Pending /></Link>)}
  </nav><div className="mt-4 border-t border-brown/20 pt-3"><SignOutButton className="min-h-11 w-full border border-brown/30 px-4 text-left text-sm font-semibold text-brown" /></div></aside>;
}

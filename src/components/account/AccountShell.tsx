import Image from "next/image";
import Link from "next/link";
import AccountNavigation from "./AccountNavigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import type { CurrentActor } from "@/features/auth/session";

export default function AccountShell({ actor, avatarUrl, children }: {
  actor: CurrentActor; avatarUrl: string | null; children: React.ReactNode;
}) {
  const name = actor.fullName || "Mi cuenta";
  return <><Header isAuthenticated isAdmin={actor.role === "admin"} avatarUrl={avatarUrl} /><main className="bg-cream px-5 py-8 text-charcoal sm:px-8 lg:py-12">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="inline-flex min-h-11 items-center font-sans text-sm font-semibold underline underline-offset-4">Volver al inicio</Link>{actor.role === "admin" && <Link href="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold underline">Dashboard administrativo</Link>}</div>
      <header className="mt-6 flex min-w-0 items-center gap-4 border-b border-brown/20 pb-7">
        {avatarUrl ? <Image src={avatarUrl} alt="Tu foto de perfil" width={72} height={72} unoptimized className="size-16 shrink-0 rounded-full object-cover sm:size-[72px]" /> : <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brown font-sans text-2xl font-semibold text-white sm:size-[72px]">{name.charAt(0).toUpperCase()}</span>}
        <div className="min-w-0"><p className="font-sans text-sm text-brown">Tu espacio en Original Wave</p><h1 className="mt-1 break-words font-heading text-4xl font-bold uppercase leading-none sm:text-5xl">{name}</h1></div>
      </header>
      <div className="mt-7 grid min-w-0 gap-7 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <AccountNavigation />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  </main><Footer /></>;
}

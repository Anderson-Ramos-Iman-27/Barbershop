import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import AdminNavigation from "@/components/admin/AdminNavigation";
import { AdministratorRequiredError, AuthenticationRequiredError, requireAdministrator } from "@/features/auth/session";
import SignOutButton from "@/components/admin/SignOutButton";
import styles from "./admin-cursors.module.css";
import "./admin-surfaces.css";

export const instant = false;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  let administrator;
  try {
    administrator = await requireAdministrator();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login?next=/admin");
    if (error instanceof AdministratorRequiredError) redirect("/");
    throw error;
  }

  return (
    <div data-admin-theme className={`${styles.shell} min-h-dvh bg-cream text-charcoal lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]`}>
      <aside className="bg-charcoal text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-white/15 px-5 py-5 lg:block lg:px-6 lg:py-7">
          <Link href="/admin" className="font-heading text-2xl font-bold uppercase leading-none tracking-[0.02em] text-white focus-visible:outline-2 focus-visible:outline-orange">Original Wave</Link>
          <span className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-orange lg:mt-2 lg:block">Administración</span>
        </div>
        <AdminNavigation />
        <div className="hidden border-t border-white/15 px-6 py-5 lg:block">
          <p className="truncate font-sans text-xs text-white/70" title={administrator.email ?? undefined}>{administrator.email}</p>
          <SignOutButton className="mt-4 min-h-11 w-full rounded-md border border-white/40 px-4 py-2 text-left font-sans text-sm font-semibold text-white transition-colors hover:border-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange" />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-brown/15 bg-white px-5 sm:px-8 lg:px-10">
          <p className="font-sans text-sm font-semibold text-charcoal">Panel administrativo</p>
          <Link href="/" className="inline-flex min-h-11 items-center font-sans text-sm font-semibold text-brown underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">Ver sitio público ↗</Link>
        </header>
        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">{children}</main>
        <div className="px-5 pb-8 lg:hidden">
          <SignOutButton className="min-h-11 font-sans text-sm font-semibold text-brown underline" />
        </div>
      </div>
    </div>
  );
}

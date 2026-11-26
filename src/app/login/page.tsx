import { redirect } from "next/navigation";
import { connection } from "next/server";

import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import { getSafeNextPath } from "@/features/auth/redirect";
import { getCurrentActor } from "@/features/auth/session";

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export const instant = false;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await connection();
  const [actor, params] = await Promise.all([getCurrentActor(), searchParams]);
  const nextPath = getSafeNextPath(params.next);

  if (actor) {
    redirect(nextPath === "/" && actor.role === "admin" ? "/admin" : nextPath);
  }

  return (
    <AuthLayout>
      <section className="w-full max-w-[27rem] bg-cream py-2 sm:py-6 md:rounded-xl md:border md:border-brown/20 md:px-8 md:py-10 lg:px-11">
        <div className="h-0.5 w-10 bg-orange md:hidden" />
        <div className="mt-5 flex items-center gap-3 md:mt-0">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brown font-sans text-[0.6rem] font-semibold leading-none text-white">O<br />W</span>
          <p className="font-sans text-xs font-semibold uppercase leading-tight tracking-[0.12em] text-charcoal">Original Wave<br /><span className="text-[0.65rem]">Barbería · local y a domicilio</span></p>
        </div>
        <p className="mt-6 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-orange-text md:hidden">Acceso de clientes</p>
        <h1 className="mt-6 font-heading text-4xl font-bold uppercase leading-[0.92] text-charcoal sm:text-5xl">Bienvenido de nuevo.</h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-brown">Ingresa a tu cuenta para gestionar tus próximas citas.</p>
        <LoginForm
          nextPath={nextPath}
          initialError={params.error ? "No fue posible completar la autenticación. Inténtalo nuevamente." : undefined}
        />
      </section>
    </AuthLayout>
  );
}

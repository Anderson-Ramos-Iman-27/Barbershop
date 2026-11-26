import { connection } from "next/server";

import AuthLayout from "@/components/auth/AuthLayout";
import PasswordRecoveryRequestForm from "@/components/auth/PasswordRecoveryRequestForm";

interface PasswordRecoveryPageProps {
  searchParams: Promise<{ error?: string }>;
}

export const instant = false;

export default async function PasswordRecoveryPage({
  searchParams,
}: PasswordRecoveryPageProps) {
  await connection();
  const params = await searchParams;

  return (
    <AuthLayout>
      <section className="w-full max-w-[27rem] rounded-xl border border-brown/20 bg-cream px-6 py-8 sm:px-10 sm:py-10 md:px-11 md:py-10">
        <div className="h-0.5 w-10 bg-orange md:hidden" />
        <div className="mt-5 flex items-center gap-3 md:mt-0">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brown font-sans text-[0.6rem] font-semibold leading-none text-white">O<br />W</span>
          <p className="font-sans text-[0.65rem] font-semibold uppercase leading-tight tracking-[0.12em] text-charcoal">Original Wave<br /><span className="text-[0.55rem]">Barbería · local y a domicilio</span></p>
        </div>
        <p className="mt-6 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-orange md:hidden">Acceso de clientes</p>
        <h1 className="mt-6 font-heading text-4xl font-bold uppercase leading-[0.92] text-charcoal sm:text-5xl">Recupera tu acceso.</h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-brown">Ingresa tu correo electrónico para recibir instrucciones de recuperación.</p>
        {params.error ? (
          <p role="alert" className="mt-5 rounded-md border border-orange bg-white px-3 py-2 font-sans text-sm text-charcoal">El enlace de recuperación no es válido o venció. Solicita uno nuevo.</p>
        ) : null}
        <PasswordRecoveryRequestForm />
        <p className="mt-5 text-center font-sans text-[0.65rem] leading-relaxed text-brown">Por seguridad, no confirmaremos si el correo está registrado.</p>
      </section>
    </AuthLayout>
  );
}

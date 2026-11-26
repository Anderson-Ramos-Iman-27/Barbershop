import { redirect } from "next/navigation";
import { connection } from "next/server";

import AuthLayout from "@/components/auth/AuthLayout";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import { getCurrentActor } from "@/features/auth/session";

export const instant = false;

export default async function ResetPasswordPage() {
  await connection();
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/recuperar-acceso?error=invalid");
  }

  return (
    <AuthLayout>
      <section className="w-full max-w-[27rem] rounded-xl border border-brown/20 bg-cream px-6 py-8 sm:px-10 sm:py-10 md:px-11 md:py-10">
        <div className="h-0.5 w-10 bg-orange md:hidden" />
        <div className="mt-5 flex items-center gap-3 md:mt-0">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brown font-sans text-[0.6rem] font-semibold leading-none text-white">O<br />W</span>
          <p className="font-sans text-[0.65rem] font-semibold uppercase leading-tight tracking-[0.12em] text-charcoal">Original Wave<br /><span className="text-[0.55rem]">Barbería · local y a domicilio</span></p>
        </div>
        <h1 className="mt-7 font-heading text-4xl font-bold uppercase leading-[0.92] text-charcoal sm:text-5xl">Crea una nueva contraseña.</h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-brown">Elige una contraseña segura para continuar.</p>
        <PasswordResetForm />
      </section>
    </AuthLayout>
  );
}

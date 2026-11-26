import { redirect } from "next/navigation";
import { connection } from "next/server";

import AuthLayout from "@/components/auth/AuthLayout";
import RegisterForm from "@/components/auth/RegisterForm";
import { getSafeNextPath } from "@/features/auth/redirect";
import { getCurrentActor } from "@/features/auth/session";

interface RegisterPageProps {
  searchParams: Promise<{ next?: string; reason?: string }>;
}

export const instant = false;

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  await connection();
  const [actor, params] = await Promise.all([getCurrentActor(), searchParams]);
  const nextPath = getSafeNextPath(params.next ?? "/reservar");

  if (actor) {
    redirect(nextPath);
  }

  return (
    <AuthLayout>
      <section className="w-full max-w-[27rem] bg-cream py-2 sm:py-6 md:rounded-xl md:border md:border-brown/20 md:px-8 md:py-8 lg:px-10">
        <div className="h-0.5 w-10 bg-orange md:hidden" />
        <div className="mt-5 flex items-center gap-3 md:mt-0">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brown font-sans text-[0.6rem] font-semibold leading-none text-white">O<br />W</span>
          <p className="font-sans text-xs font-semibold uppercase leading-tight tracking-[0.12em] text-charcoal">Original Wave<br /><span className="text-[0.65rem]">Barbería · local y a domicilio</span></p>
        </div>
        <p className="mt-5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-orange-text md:hidden">Acceso de clientes</p>
        <h1 className="mt-5 font-heading text-4xl font-bold uppercase leading-[0.92] text-charcoal sm:text-5xl">Únete a Original Wave.</h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-brown">Crea tu cuenta y empieza a organizar tus próximas citas.</p>
        {params.reason && <p role="status" className="mt-4 rounded-md border border-brown/25 bg-white p-3 font-sans text-sm">{params.reason === "not_registered" ? "Primero crea tu cuenta. Puedes registrarte con este formulario o con Google." : params.reason === "google_email" ? "Escribe el correo de tu cuenta Google antes de continuar con Google." : "No se pudo completar el registro con Google. Comprueba el correo y vuelve a intentarlo."}</p>}
        <RegisterForm nextPath={nextPath} />
      </section>
    </AuthLayout>
  );
}

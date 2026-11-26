import Link from "next/link";

import AuthLayout from "@/components/auth/AuthLayout";

export default function CheckYourEmailPage() {
  return (
    <AuthLayout>
      <section className="w-full max-w-[27rem] rounded-xl border border-brown/20 bg-cream px-6 py-8 sm:px-10 sm:py-10 md:px-11 md:py-10">
        <div className="h-0.5 w-10 bg-orange md:hidden" />
        <div className="mt-5 flex items-center gap-3 md:mt-0">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brown font-sans text-[0.6rem] font-semibold leading-none text-white">O<br />W</span>
          <p className="font-sans text-[0.65rem] font-semibold uppercase leading-tight tracking-[0.12em] text-charcoal">Original Wave<br /><span className="text-[0.55rem]">Barbería · local y a domicilio</span></p>
        </div>
        <div className="mt-7 flex size-9 items-center justify-center rounded-md border border-orange text-orange" aria-hidden="true">✉</div>
        <h1 className="mt-6 font-heading text-4xl font-bold uppercase leading-[0.92] text-charcoal sm:text-5xl">Revisa tu correo.</h1>
        <p className="mt-4 font-sans text-sm leading-relaxed text-brown">Si existe una cuenta asociada al correo ingresado, recibirás instrucciones para recuperar el acceso.</p>
        <p className="mt-4 font-sans text-[0.65rem] leading-relaxed text-brown">Este mensaje protege la privacidad y evita revelar qué correos están registrados.</p>
        <Link href="/login" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-orange px-5 py-3 font-sans text-sm font-semibold text-charcoal transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">Volver a iniciar sesión</Link>
      </section>
    </AuthLayout>
  );
}

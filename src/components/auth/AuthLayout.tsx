import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="min-h-dvh bg-cream md:grid md:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)]">
      <aside className="hidden min-h-dvh bg-brown px-10 py-12 text-white md:flex md:flex-col lg:px-14 lg:py-16">
        <div className="inline-flex w-fit rounded-full border border-orange px-4 py-3 font-sans text-xs font-semibold uppercase tracking-[0.02em] text-white">
          Original Wave · logo
        </div>

        <div className="mt-10 max-w-md lg:mt-14">
          <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-orange">
            Acceso de clientes · 01
          </p>
          <h1 className="mt-7 font-heading text-5xl font-bold uppercase leading-[0.92] tracking-[-0.02em] text-white lg:text-6xl">
            Tu estilo
            <br />
            comienza aquí.
          </h1>
          <p className="mt-6 max-w-sm font-sans text-base leading-relaxed text-cream lg:text-lg">
            Gestiona tus próximas citas y mantén tus datos de contacto en un
            solo lugar.
          </p>
        </div>

        <div className="mt-7 flex min-h-72 max-w-md items-center justify-center rounded-xl border border-orange bg-charcoal px-6 py-16 text-center lg:mt-8 lg:min-h-80">
          <div>
            <div className="mx-auto flex size-7 items-center justify-center rounded-sm border border-orange text-orange" aria-hidden="true">
              ◇
            </div>
            <p className="mt-4 font-sans text-xs font-semibold uppercase text-white">
              Fotografía oficial del negocio
            </p>
            <p className="mt-2 font-sans text-[0.65rem] text-white/65">
              Contenedor editable · pendiente de material del cliente
            </p>
          </div>
        </div>
        <div className="mt-6 h-1 w-20 bg-orange" />
      </aside>

      <section className="flex min-h-dvh items-start justify-center px-6 py-7 sm:px-10 sm:py-10 md:items-center md:px-8 md:py-10 lg:px-14">
        {children}
      </section>
    </main>
  );
}

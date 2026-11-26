import Container from "@/components/ui/Container";
import Link from "next/link";

const serviceModes = [
  {
    id: "local",
    label: "Modalidad 01",
    title: "En nuestro local",
    description: "Atención presencial en el establecimiento",
    action: "Reservar en el local",
    cardClassName: "bg-brown text-white",
    eyebrowClassName: "text-orange",
    descriptionClassName: "text-cream",
    actionClassName: "bg-white text-charcoal",
  },
  {
    id: "domicilio",
    label: "Modalidad 02",
    title: "A domicilio",
    description: "Atención personalizada en la ubicación del cliente",
    action: "Solicitar a domicilio",
    cardClassName: "bg-orange text-charcoal",
    eyebrowClassName: "text-charcoal",
    descriptionClassName: "text-brown",
    actionClassName: "bg-charcoal text-white",
  },
] as const;

export default function ServiceModes() {
  return (
    <section aria-labelledby="service-modes-title" className="bg-cream">
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text sm:text-sm">
            Dos formas de atenderte
          </p>
          <h2
            id="service-modes-title"
            className="mt-4 font-heading text-5xl font-bold uppercase leading-[0.88] tracking-[-0.025em] text-charcoal sm:text-6xl lg:text-7xl"
          >
            Elige dónde vivir la experiencia.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-2">
          {serviceModes.map((mode) => (
            <article
              key={mode.id}
              data-service-mode={mode.id}
              className={`flex min-h-80 flex-col rounded-[1.5rem] p-7 transition-[transform,box-shadow] duration-[180ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none motion-reduce:duration-200 sm:min-h-[22rem] sm:p-9 lg:p-10 ${mode.cardClassName}`}
            >
              <p
                className={`font-sans text-xs font-semibold uppercase tracking-[0.18em] ${mode.eyebrowClassName}`}
              >
                {mode.label}
              </p>
              <h3 className="mt-5 font-heading text-5xl font-bold uppercase leading-[0.88] tracking-[-0.025em] sm:text-6xl">
                {mode.title}
              </h3>
              <p
                className={`mt-5 max-w-sm font-sans text-base leading-relaxed sm:text-lg ${mode.descriptionClassName}`}
              >
                {mode.description}
              </p>
              <Link href={`/reservar?mode=${mode.id}`}
                className={`mt-auto inline-flex min-h-11 w-fit items-center justify-center rounded-full px-5 py-3 font-sans text-xs font-semibold uppercase tracking-[0.08em] ${mode.actionClassName}`}
              >
                {mode.action}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-7 max-w-2xl font-sans text-sm leading-relaxed text-brown sm:mt-8">
          Las condiciones, zonas de cobertura y costos de traslado están
          pendientes de definición.
        </p>
      </Container>
    </section>
  );
}

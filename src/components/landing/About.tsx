import Container from "@/components/ui/Container";

export default function About() {
  return (
    <section aria-labelledby="about-title" className="bg-white">
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-x-20 lg:gap-y-8">
          <div className="lg:col-start-2">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text sm:text-sm">
              Sobre Original Wave
            </p>
            <h2
              id="about-title"
              className="mt-4 max-w-[12ch] font-heading text-5xl font-bold uppercase leading-[0.9] tracking-[-0.025em] text-charcoal sm:text-6xl lg:mt-5 lg:text-7xl"
            >
              Un espacio para definir tu estilo.
            </h2>
          </div>

          <div
            aria-label="Espacio reservado para fotografía del ambiente de barbería"
            role="img"
            className="relative min-h-[19rem] overflow-hidden rounded-[1.5rem] bg-cream-deep lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-0 lg:aspect-[5/6]"
          >
            <div className="absolute inset-0 border border-brown/10" />
            <p className="absolute bottom-5 left-5 max-w-[12rem] font-sans text-xs font-semibold uppercase leading-relaxed tracking-[0.14em] text-brown">
              Fotografía del ambiente pendiente
            </p>
          </div>

          <div className="lg:col-start-2">
            <div className="h-px w-full bg-brown/20" />
            <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-brown sm:text-lg">
              Un espacio pensado para que cada corte, barba y detalle hablen de
              tu estilo. La información e imágenes oficiales de Original Wave
              están pendientes de confirmación.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

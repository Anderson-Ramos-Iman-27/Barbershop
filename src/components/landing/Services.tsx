import type { Service } from "@/features/services/types";
import Container from "@/components/ui/Container";

import ServiceCard from "./ServiceCard";

interface ServicesProps {
  services: readonly Service[];
}

export default function Services({ services }: ServicesProps) {
  const activeServices = services.filter((service) => service.isActive);

  return (
    <section aria-labelledby="services-title" className="bg-charcoal">
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-2xl">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange sm:text-sm">
            Servicios
          </p>
          <h2
            id="services-title"
            className="mt-4 font-heading text-5xl font-bold uppercase leading-[0.88] tracking-[-0.025em] text-white sm:text-6xl lg:text-7xl"
          >
            Elige tu próximo look.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-3">
          {activeServices.length === 0 && <p className="font-sans text-base text-cream">Los servicios se publicarán aquí cuando estén disponibles.</p>}
          {activeServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </Container>
    </section>
  );
}

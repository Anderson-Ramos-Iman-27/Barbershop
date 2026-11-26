import Image from "next/image";
import Link from "next/link";

import type { Service } from "@/features/services/types";

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const priceLabel = service.price ?? "Precio por definir";

  return (
    <article className="group overflow-hidden rounded-[1.5rem] bg-white transition-[transform,box-shadow] duration-[180ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none motion-reduce:duration-200">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-deep">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.imageAlt ?? `Fotografía del servicio ${service.name}`}
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:duration-200"
          />
        ) : (
          <div
            aria-label={`Imagen de ${service.name} pendiente`}
            role="img"
            className="absolute inset-0 flex items-end border border-brown/10 p-5"
          >
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-brown">
              Imagen pendiente
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-64 flex-col p-6 sm:p-7">
        <h3 className="font-heading text-4xl font-bold uppercase leading-[0.9] text-charcoal">
          {service.name}
        </h3>
        <p className="mt-4 font-sans text-sm leading-relaxed text-brown">
          {service.description}
        </p>
        <div className="mt-auto flex items-end justify-between gap-4 pt-7">
          <p className="font-sans text-sm font-semibold text-charcoal">
            {priceLabel}
          </p>
          <Link href={`/reservar?service=${service.id}`}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-orange px-4 py-2 font-sans text-xs font-semibold text-charcoal"
          >
            Reservar
          </Link>
        </div>
      </div>
    </article>
  );
}

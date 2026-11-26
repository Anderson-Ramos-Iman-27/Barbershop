"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import Container from "@/components/ui/Container";

const heroStripItems = ["Corte", "Barba", "Estilo", "Local", "Domicilio"];

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const revealClass = (delay: string) =>
    `transition-[opacity,transform] duration-[360ms] ease-out motion-reduce:translate-y-0 motion-reduce:duration-200 ${delay} ${
      isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`;

  return (
    <section aria-labelledby="hero-title" className="overflow-hidden bg-cream">
      <Container className="py-10 sm:py-14 lg:py-14 xl:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-12 xl:gap-16">
          <div className="min-w-0">
            <p
              className={`font-sans text-xs font-semibold uppercase tracking-[0.16em] text-orange-text sm:text-sm ${revealClass("delay-0")}`}
            >
              Barbería · Local y a domicilio
            </p>

            <h1
              id="hero-title"
              className={`mt-5 font-heading text-[3.75rem] font-bold uppercase leading-[0.82] tracking-[-0.035em] text-charcoal sm:text-[5.25rem] lg:mt-6 lg:text-[clamp(5.25rem,8vw,8rem)] ${revealClass("delay-75")}`}
            >
              <span className="block whitespace-nowrap">Tu estilo.</span>
              <span className="block whitespace-nowrap">Tu esencia.</span>
            </h1>

            <p
              className={`mt-6 max-w-xl font-sans text-base leading-relaxed text-brown sm:text-lg lg:mt-5 ${revealClass("delay-150")}`}
            >
              Descubre una nueva experiencia de barbería. Cortes, estilo y
              atención personalizada en nuestro local o donde tú estés.
            </p>

            <div
              className={`mt-7 flex items-center gap-3 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-charcoal sm:mt-8 lg:mt-6 ${revealClass("delay-200")}`}
            >
              <span aria-hidden="true" className="h-px w-10 bg-orange sm:w-14" />
              <span>Precisión en cada detalle</span>
            </div>

            <div
              className={`mt-8 flex flex-wrap gap-3 sm:mt-10 lg:mt-8 ${revealClass("delay-300")}`}
            >
              <Link href="/reservar"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-orange px-6 py-3 font-sans text-sm font-semibold text-charcoal"
              >
                Reservar cita
              </Link>
              <Link href="/#services-title"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-brown bg-cream px-6 py-3 font-sans text-sm font-semibold text-charcoal"
              >
                Ver servicios
              </Link>
            </div>

            <p
              className={`mt-9 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-brown sm:mt-12 lg:mt-9 ${revealClass("delay-[350ms]")}`}
            >
              Degradados · Clásicos · Estilo
            </p>
          </div>

          <figure
            className={`relative min-h-[20rem] overflow-hidden rounded-[1.75rem] bg-cream-deep sm:min-h-[28rem] lg:min-h-0 lg:aspect-[5/4] ${revealClass("delay-150")}`}
          >
            <Image
              src="/images/hero/barber-hero.jpg"
              alt="Escena de barbería utilizada como fotografía de referencia"
              fill
              priority
              sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw"
              className="object-cover object-[60%_center]"
            />
            <figcaption className="absolute bottom-4 left-4 rounded-full bg-cream px-3 py-2 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-charcoal sm:bottom-5 sm:left-5">
              Fotografía de referencia
            </figcaption>
          </figure>
        </div>
      </Container>

      <div className="bg-charcoal">
        <Container>
          <ul className="grid grid-cols-5 divide-x divide-white/20 text-center">
            {heroStripItems.map((item) => (
              <li
                key={item}
                className="py-4 font-heading text-lg font-semibold uppercase tracking-[0.08em] text-white sm:py-5 sm:text-2xl"
              >
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </section>
  );
}

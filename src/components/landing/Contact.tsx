import Container from "@/components/ui/Container";

interface ContactDetail {
  id: string;
  desktopLabel: string;
  mobileLabel: string;
  desktopValue: string;
  mobileValue: string;
}

const contactDetails: ContactDetail[] = [
  {
    id: "address",
    desktopLabel: "Dirección",
    mobileLabel: "Dirección",
    desktopValue: "Dirección por definir",
    mobileValue: "Por definir",
  },
  {
    id: "phone",
    desktopLabel: "Teléfono",
    mobileLabel: "Teléfono",
    desktopValue: "Número por definir",
    mobileValue: "Por definir",
  },
  {
    id: "hours",
    desktopLabel: "Horarios",
    mobileLabel: "Horarios",
    desktopValue: "Horarios por definir",
    mobileValue: "Por definir",
  },
  {
    id: "social",
    desktopLabel: "Redes sociales",
    mobileLabel: "Redes",
    desktopValue: "Instagram · TikTok · Facebook — enlaces por definir",
    mobileValue: "Enlaces por definir",
  },
];

export default function Contact() {
  return (
    <section aria-labelledby="contact-title" className="bg-cream">
      <Container className="px-8 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-20">
          <div>
            <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-orange-text sm:text-xs">
              Contacto
            </p>
            <h2
              id="contact-title"
              className="mt-6 font-heading text-5xl font-bold uppercase leading-[0.88] tracking-[-0.025em] text-charcoal sm:mt-8 sm:text-6xl lg:text-7xl"
            >
              Encuéntranos.
            </h2>

            <dl className="mt-8 sm:mt-9">
              {contactDetails.map((detail) => (
                <div
                  key={detail.id}
                  className="border-b border-brown/20 py-4 first:pt-0 sm:py-4"
                >
                  <dt className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-brown">
                    <span className="sm:hidden">{detail.mobileLabel}</span>
                    <span className="hidden sm:inline">{detail.desktopLabel}</span>
                  </dt>
                  <dd className="mt-2 font-sans text-xs leading-relaxed text-charcoal sm:text-sm">
                    <span className="sm:hidden">{detail.mobileValue}</span>
                    <span className="hidden sm:inline">{detail.desktopValue}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            aria-label="Ubicación pendiente de confirmación"
            role="img"
            className="relative flex aspect-[4/3] flex-col items-center justify-center bg-cream-deep px-6 text-center lg:aspect-[21/12]"
          >
            <svg
              aria-hidden="true"
              className="size-9 text-brown sm:size-10"
              fill="none"
              viewBox="0 0 40 40"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="20" cy="20" r="9" />
              <path strokeLinecap="round" d="M20 4v8M20 28v8M4 20h8M28 20h8" />
            </svg>
            <p className="mt-5 font-heading text-3xl font-bold uppercase leading-none text-charcoal sm:text-4xl">
              <span className="sm:hidden">Mapa</span>
              <span className="hidden sm:inline">Mapa / ubicación</span>
            </p>
            <p className="mt-3 hidden font-sans text-xs text-brown sm:block">
              Insertar mapa cuando la dirección sea confirmada.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

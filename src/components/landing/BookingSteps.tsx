import Container from "@/components/ui/Container";

interface BookingStep {
  number: string;
  desktopLabel: string;
  mobileLabel: string;
  isHighlighted?: boolean;
}

const bookingSteps: BookingStep[] = [
  {
    number: "01",
    desktopLabel: "Elige tu servicio",
    mobileLabel: "Elige tu servicio",
  },
  {
    number: "02",
    desktopLabel: "Selecciona local o domicilio",
    mobileLabel: "Selecciona modalidad",
  },
  {
    number: "03",
    desktopLabel: "Escoge fecha y horario",
    mobileLabel: "Escoge fecha y horario",
  },
  {
    number: "04",
    desktopLabel: "Envía tu solicitud",
    mobileLabel: "Envía tu solicitud",
  },
  {
    number: "05",
    desktopLabel: "Recibe la confirmación",
    mobileLabel: "Recibe la confirmación",
    isHighlighted: true,
  },
];

export default function BookingSteps() {
  return (
    <section aria-labelledby="booking-steps-title" className="bg-white">
      <Container className="py-16 sm:py-20 lg:py-24">
        <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-orange-text sm:text-xs">
          <span className="sm:hidden">Reserva</span>
          <span className="hidden sm:inline">Reserva paso a paso</span>
        </p>
        <h2
          id="booking-steps-title"
          className="mt-7 font-heading text-5xl font-bold uppercase leading-[0.88] tracking-[-0.025em] text-charcoal sm:mt-9 sm:text-6xl lg:text-7xl"
        >
          <span className="sm:hidden">Cinco pasos.</span>
          <span className="hidden sm:inline">Solicita tu cita en cinco pasos.</span>
        </h2>

        <ol className="mt-9 grid gap-3 sm:mt-10 sm:grid-cols-5 sm:gap-3 lg:gap-4">
          {bookingSteps.map((step) => (
            <li
              key={step.number}
              className={`flex min-h-16 items-center gap-5 px-4 py-3 sm:min-h-44 sm:flex-col sm:items-start sm:gap-3 sm:p-4 lg:p-5 ${
                step.isHighlighted ? "bg-orange" : "bg-cream-deep"
              }`}
            >
              <span className="font-heading text-3xl font-bold leading-none text-charcoal sm:text-4xl">
                {step.number}
              </span>
              <span className="font-sans text-xs leading-relaxed text-charcoal sm:hidden">
                {step.mobileLabel}
              </span>
              <span className="hidden font-sans text-xs leading-relaxed text-charcoal sm:block">
                {step.desktopLabel}
              </span>
            </li>
          ))}
        </ol>

        <aside className="mt-6 bg-charcoal px-5 py-5 sm:flex sm:items-center sm:gap-5 sm:py-4 lg:px-6">
          <p className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-orange sm:hidden">
            Cita pendiente
          </p>
          <p className="hidden font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-orange sm:block">
            Pendiente
          </p>
          <p className="mt-2 max-w-3xl font-sans text-xs leading-relaxed text-white sm:mt-0">
            <span className="sm:hidden">
              Queda confirmada cuando el administrador la acepta.
            </span>
            <span className="hidden sm:inline">
              La cita se confirma únicamente después de ser aceptada por el
              administrador.
            </span>
          </p>
        </aside>
      </Container>
    </section>
  );
}

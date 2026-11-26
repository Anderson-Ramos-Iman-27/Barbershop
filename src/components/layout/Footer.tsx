import Container from "@/components/ui/Container";

const primaryNavigation = [
  "Inicio",
  "Servicios",
  "Galería",
  "Nosotros",
  "Contacto",
];

const legalNavigation = ["Privacidad", "Términos"];
const mobileSecondaryNavigation = [...legalNavigation, "Redes sociales"];

function NavigationReference({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-white/80">
      {items.map((item, index) => (
        <li key={item} className="flex items-center gap-x-2">
          <span title="Destino disponible próximamente">{item}</span>
          {index < items.length - 1 && <span aria-hidden="true">·</span>}
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white">
      <Container className="px-8 py-8 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <p className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-orange">
          Logo Original Wave — reemplazar
        </p>

        <p className="mt-6 font-heading text-3xl font-bold uppercase leading-[0.86] tracking-[-0.02em] text-white sm:mt-7 sm:text-4xl">
          <span className="block sm:inline">Barbería</span>
          <span className="block sm:ml-2 sm:inline">Original Wave</span>
        </p>

        <nav
          aria-label="Navegación secundaria"
          className="mt-5 sm:mt-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2"
        >
          <NavigationReference items={primaryNavigation} />
          <span aria-hidden="true" className="hidden text-white/80 sm:inline">
            ·
          </span>
          <div className="mt-3 sm:hidden">
            <NavigationReference items={mobileSecondaryNavigation} />
          </div>
          <div className="hidden sm:block">
            <NavigationReference items={legalNavigation} />
          </div>
        </nav>

        <div className="mt-5 sm:mt-7">
          <p className="font-sans text-[0.625rem] text-on-charcoal-muted">
            <span className="sm:hidden">© Año por definir</span>
            <span className="hidden sm:inline">
              © Año por definir — Barbería Original Wave
            </span>
          </p>
        </div>
      </Container>
    </footer>
  );
}

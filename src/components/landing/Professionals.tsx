import Container from "@/components/ui/Container";
import type { PublicProfessional } from "@/features/professionals/queries";

export default function Professionals({ professionals }: { professionals: readonly PublicProfessional[] }) {
  if (professionals.length === 0) return null;
  return <section aria-labelledby="professionals-title" className="bg-white"><Container className="py-16 sm:py-20 lg:py-24"><p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text">El equipo</p><h2 id="professionals-title" className="mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-charcoal sm:text-6xl">Profesionales.</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{professionals.map(person => <article key={person.id} className="rounded-xl border border-brown/20 bg-cream p-6"><h3 className="font-heading text-3xl font-bold uppercase text-charcoal">{person.displayName}</h3>{person.bio && <p className="mt-3 font-sans text-sm leading-relaxed text-brown">{person.bio}</p>}</article>)}</div></Container></section>;
}

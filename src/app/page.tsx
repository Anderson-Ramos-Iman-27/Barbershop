
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { connection } from "next/server";
import About from "@/components/landing/About";
import BookingSteps from "@/components/landing/BookingSteps";
import Contact from "@/components/landing/Contact";
import Gallery from "@/components/landing/Gallery";
import Hero from "@/components/landing/Hero";
import ServiceModes from "@/components/landing/ServiceModes";
import Services from "@/components/landing/Services";
import { CatalogQueryError, getPublishedServices } from "@/features/services/queries";
import { mockGalleryItems } from "@/features/gallery/mockGalleryItems";
import { getPublishedGalleryItems } from "@/features/gallery/queries";
import { getCurrentActor } from "@/features/auth/session";
import { getOwnAvatarUrl } from "@/features/profile/queries";

// Con cacheComponents, `instant = false` habilita el render de solicitud para
// esta ruta que depende de la sesión y del catálogo protegido por RLS.
export const instant = false;

export default async function Home() {
  // El catálogo se consulta con las políticas RLS en cada solicitud; no debe
  // prerenderizarse junto a una cookie de sesión potencialmente distinta.
  await connection();
  const actorTask = getCurrentActor();
  const [actor, avatarUrl, [servicesResult, galleryResult]] = await Promise.all([
    actorTask,
    actorTask.then(actor => getOwnAvatarUrl(actor?.avatarPath ?? null)),
    Promise.allSettled([getPublishedServices(), getPublishedGalleryItems()]),
  ]);
  if (servicesResult.status === "rejected" && !(servicesResult.reason instanceof CatalogQueryError)) throw servicesResult.reason;
  if (process.env.NODE_ENV === "production") {
    if (servicesResult.status === "rejected") console.error("[catalog] No se pudo cargar el catálogo publicado.", servicesResult.reason);
    if (galleryResult.status === "rejected") console.error("[gallery] No se pudo cargar la galería publicada.", galleryResult.reason);
  }
  const publishedServices = servicesResult.status === "fulfilled" ? servicesResult.value : [];
  const publishedGallery = galleryResult.status === "fulfilled" ? galleryResult.value : [];

  return (
    <>
      <Header isAdmin={actor?.role === "admin"} isAuthenticated={Boolean(actor)} avatarUrl={avatarUrl} />
      <main>
        <Hero />
        <About />
        <Services services={publishedServices} />
        <ServiceModes />
        <Gallery items={publishedGallery.length > 0 ? publishedGallery : mockGalleryItems} />
        <BookingSteps />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

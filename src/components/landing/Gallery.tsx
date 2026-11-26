import type { GalleryItemData } from "@/features/gallery/types";
import Container from "@/components/ui/Container";

import GalleryItem from "./GalleryItem";

interface GalleryProps {
  items: readonly GalleryItemData[];
}

const getItemLayout = (index: number) => {
  if (index === 0) {
    return "col-span-2 aspect-[4/3] lg:col-span-3";
  }

  if (index === 1) {
    return "col-span-1 aspect-square lg:col-span-3 lg:aspect-[4/3]";
  }

  return "col-span-1 aspect-square lg:col-span-2 lg:aspect-[4/3]";
};

export default function Gallery({ items }: GalleryProps) {
  const publishedItems = items.filter((item) => item.isPublished).slice(0, 5);

  return (
    <section aria-labelledby="gallery-title" className="bg-brown">
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-2xl">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange sm:text-sm">
            Galería de trabajos
          </p>
          <h2
            id="gallery-title"
            className="mt-4 font-heading text-5xl font-bold uppercase leading-[0.88] tracking-[-0.025em] text-white sm:text-6xl lg:text-7xl"
          >
            Cortes con carácter.
          </h2>
          <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-cream sm:text-lg">
            {publishedItems.some((item) => item.imageUrl)
              ? "Fotografías publicadas por Original Wave."
              : "Referencias visuales provisionales. Las fotografías oficiales de trabajos de Original Wave están pendientes de incorporación."}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-6 lg:gap-6">
          {publishedItems.map((item, index) => (
            <GalleryItem
              key={item.id}
              item={item}
              className={getItemLayout(index)}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

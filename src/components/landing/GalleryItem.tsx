import Image from "next/image";

import type { GalleryItemData } from "@/features/gallery/types";

interface GalleryItemProps {
  item: GalleryItemData;
  className: string;
}

export default function GalleryItem({ item, className }: GalleryItemProps) {
  return (
    <figure
      className={`group relative overflow-hidden rounded-[1.25rem] bg-cream-deep ${className}`}
    >
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.alt}
          fill
          unoptimized
          sizes="(min-width: 1024px) 33vw, 50vw"
          className="object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:duration-200"
        />
      ) : (
        <div
          aria-label={item.alt}
          role="img"
          className="absolute inset-0 flex items-end border border-white/15 p-4"
        >
          <span className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-brown">
            Fotografía pendiente
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-charcoal/0 transition-colors duration-[220ms] ease-out group-hover:bg-charcoal/15 motion-reduce:duration-200" />
    </figure>
  );
}

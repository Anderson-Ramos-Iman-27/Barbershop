
import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={className}>
      {eyebrow && (
        <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-orange">
          {eyebrow}
        </p>
      )}

      <h2 className="font-heading text-4xl font-bold uppercase leading-none text-charcoal sm:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-brown">
          {description}
        </p>
      )}

      {children}
    </div>
  );
}

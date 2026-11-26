"use client";

import { useFormStatus } from "react-dom";

export default function FormProgress({ message = "Guardando cambios…" }: { message?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/35 px-5" role="status" aria-live="polite" aria-busy="true">
      <div className="flex w-full max-w-xs items-center gap-4 rounded-xl border border-brown/20 bg-cream px-5 py-5 shadow-lg">
        <span aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brown/25 border-t-orange-text motion-reduce:animate-none" />
        <span className="font-sans text-sm font-semibold text-charcoal">{message}</span>
      </div>
    </div>
  );
}

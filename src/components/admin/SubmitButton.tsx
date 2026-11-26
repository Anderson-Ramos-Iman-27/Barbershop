"use client";

import { useFormStatus } from "react-dom";
import FormProgress from "./FormProgress";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <><button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center cursor-pointer rounded-md border border-orange bg-orange px-5 py-2 font-sans text-sm font-bold text-charcoal transition-colors hover:border-brown hover:bg-brown hover:text-white motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">{pending ? "Guardando…" : children}</button><FormProgress /></>;
}

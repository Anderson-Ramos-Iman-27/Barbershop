"use client";

import { useFormStatus } from "react-dom";

export default function BookingDecisionButtons() {
  const { pending, data } = useFormStatus();
  const confirming = data?.get("decision") === "confirm";
  return <>
    <button name="decision" value="confirm" disabled={pending} className="min-h-11 rounded-md border border-orange bg-orange text-charcoal transition-colors hover:border-brown hover:bg-brown hover:text-white motion-reduce:transition-none px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:cursor-wait disabled:opacity-60">{pending && confirming ? "Confirmando…" : "Confirmar"}</button>
    <button name="decision" value="reject" disabled={pending} className="min-h-11 rounded-md border border-brown/60 bg-white text-brown transition-colors hover:bg-cream motion-reduce:transition-none px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:cursor-wait disabled:opacity-60">{pending && !confirming ? "Rechazando…" : "Rechazar"}</button>
    {pending && <span role="status" className="sr-only">Actualizando reserva…</span>}
  </>;
}

"use client";

import { useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { cancelBooking } from "@/features/booking/actions";

function Confirmation({ appointment }: { appointment: string }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);
  const { pending } = useFormStatus();
  useEffect(() => {
    if (pending) submitted.current = true;
    else if (submitted.current) {
      submitted.current = false;
      dialog.current?.close();
    }
  }, [pending]);
  const button = "min-h-11 cursor-pointer rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:cursor-wait disabled:opacity-60";

  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" disabled={pending} className={`${button} bg-orange hover:brightness-95`} onClick={() => { dialog.current?.showModal(); keep.current?.focus(); }}>Cancelar cita</button>
    <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description ${id}-appointment`} onCancel={event => { if (pending) event.preventDefault(); }} onClose={() => trigger.current?.focus()} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-xl bg-cream p-6 text-charcoal shadow-xl backdrop:bg-charcoal/60 sm:p-8">
      <h2 id={`${id}-title`} className="font-heading text-3xl font-bold uppercase">¿Cancelar esta cita?</h2>
      <p id={`${id}-description`} className="mt-3 text-sm leading-relaxed text-brown">¿Estás seguro de que quieres cancelar? Solo se cancelará cuando confirmes esta acción.</p>
      <p id={`${id}-appointment`} className="mt-4 break-words rounded-md border border-brown/20 bg-white p-3 text-sm font-semibold">{appointment}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button ref={keep} type="button" disabled={pending} className={`${button} border border-brown/40 hover:bg-brown/10`} onClick={() => dialog.current?.close()}>Conservar cita</button>
        <button type="submit" disabled={pending} className={`${button} bg-orange hover:brightness-95`}>{pending ? "Cancelando…" : "Sí, cancelar cita"}</button>
      </div>
      {pending && <p role="status" className="mt-4 text-sm text-brown">Cancelando tu cita…</p>}
    </dialog>
  </>;
}

export default function CancelBookingButton({ bookingId, appointment }: { bookingId: string; appointment: string }) {
  return <form action={cancelBooking} className="mt-4">
    <input type="hidden" name="id" value={bookingId} />
    <Confirmation appointment={appointment} />
  </form>;
}

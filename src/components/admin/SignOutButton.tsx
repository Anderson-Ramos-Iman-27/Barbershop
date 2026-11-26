"use client";

import { useActionState, useId, useRef } from "react";
import { signOutAction } from "@/features/auth/signOutAction";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(signOutAction, { error: "" });

  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" disabled={pending} onClick={() => { dialog.current?.showModal(); cancel.current?.focus(); }} className={`${className} cursor-pointer rounded-md transition-colors hover:bg-orange hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none`}>Cerrar sesión</button>
    <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { if (pending) event.preventDefault(); }} onClose={() => trigger.current?.focus()} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-xl bg-cream p-6 text-charcoal shadow-xl backdrop:bg-charcoal/60 sm:p-8">
      <h2 id={`${id}-title`} className="font-heading text-3xl font-bold uppercase">¿Cerrar sesión?</h2>
      <p id={`${id}-description`} className="mt-3 font-sans text-sm leading-relaxed text-brown">Cerrarás tu sesión en Original Wave. Necesitarás iniciar sesión para volver a entrar.</p>
      {state.error && <p role="alert" className="mt-4 text-sm font-semibold text-charcoal">{state.error}</p>}
      <form action={action} className="mt-6 flex flex-wrap justify-end gap-3">
        <button ref={cancel} type="button" disabled={pending} onClick={() => dialog.current?.close()} className="min-h-11 cursor-pointer rounded-md border border-brown/40 px-4 text-sm font-semibold transition-colors hover:bg-brown/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none">Cancelar</button>
        <button type="submit" disabled={pending} className="min-h-11 cursor-pointer rounded-md bg-orange px-4 text-sm font-semibold transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none">{pending ? "Cerrando sesión…" : "Sí, cerrar sesión"}</button>
      </form>
    </dialog>
  </>;
}

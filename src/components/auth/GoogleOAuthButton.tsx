"use client";

import { useFormStatus } from "react-dom";
import Image from "next/image";

import { signInWithGoogle } from "@/features/auth/actions";

function SubmitGoogleButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={signInWithGoogle}
      formNoValidate
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-brown/30 bg-white px-5 py-3 font-sans text-sm font-semibold text-charcoal transition-colors duration-150 hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-wait disabled:opacity-70"
    >
      <Image src="/images/auth/google-g.png" alt="" width={20} height={20} className="shrink-0" />
      {pending ? "Conectando con Google…" : "Continuar con Google"}
    </button>
  );
}

export default function GoogleOAuthButton() {
  return (
    <div className="pt-1">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-brown/20" />
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.14em] text-brown">o</span>
        <span className="h-px flex-1 bg-brown/20" />
      </div>
      <div className="mt-4">
        <SubmitGoogleButton />
      </div>
    </div>
  );
}

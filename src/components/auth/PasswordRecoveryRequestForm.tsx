"use client";

import Link from "next/link";

import { requestPasswordReset } from "@/features/auth/actions";

import AuthSubmitButton from "./AuthSubmitButton";

export default function PasswordRecoveryRequestForm() {
  return (
    <form action={requestPasswordReset} className="mt-7 space-y-4">
      <div>
        <label htmlFor="email" className="font-sans text-xs font-semibold text-charcoal">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nombre@correo.com"
          className="mt-2 min-h-11 w-full rounded-md border border-orange bg-transparent px-3 font-sans text-sm text-charcoal outline-none transition-colors placeholder:text-brown/80 focus:ring-1 focus:ring-orange"
        />
      </div>
      <AuthSubmitButton pendingLabel="Enviando enlace…">Enviar enlace</AuthSubmitButton>
      <p className="text-center font-sans text-sm">
        <Link href="/login" className="font-semibold text-charcoal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-orange">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

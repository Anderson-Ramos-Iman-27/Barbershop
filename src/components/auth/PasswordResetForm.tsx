"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updatePassword } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/state";

import AuthSubmitButton from "./AuthSubmitButton";
import PasswordField from "./PasswordField";

export default function PasswordResetForm() {
  const [state, formAction] = useActionState(updatePassword, initialAuthActionState);

  if (state.status === "success") {
    return (
      <div className="mt-7 rounded-md border border-brown/20 bg-white px-4 py-5" role="status">
        <p className="font-sans text-sm leading-relaxed text-charcoal">{state.message}</p>
        <Link href="/login" className="mt-5 inline-flex font-sans text-sm font-semibold text-charcoal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-orange">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-7 space-y-4" noValidate>
      <PasswordField
        id="password"
        name="password"
        label="Nueva contraseña"
        placeholder="Crea una contraseña segura"
        autoComplete="new-password"
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar contraseña"
        placeholder="Repite tu contraseña"
        autoComplete="new-password"
      />
      {state.status === "error" ? (
        <p role="alert" className="rounded-md border border-orange bg-white px-3 py-2 font-sans text-sm text-charcoal">
          {state.message}
        </p>
      ) : null}
      <AuthSubmitButton pendingLabel="Actualizando contraseña…">Actualizar contraseña</AuthSubmitButton>
    </form>
  );
}

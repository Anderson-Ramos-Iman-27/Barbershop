"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInWithPassword } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/state";

import AuthSubmitButton from "./AuthSubmitButton";
import GoogleOAuthButton from "./GoogleOAuthButton";
import PasswordField from "./PasswordField";

interface LoginFormProps {
  nextPath: string;
  initialError?: string;
}

export default function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const [state, formAction] = useActionState(
    signInWithPassword,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="mt-7 space-y-4" noValidate>
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="authIntent" value="login" />
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
          className="mt-2 min-h-11 w-full rounded-md border border-brown/25 bg-transparent px-3 font-sans text-sm text-charcoal outline-none transition-colors placeholder:text-brown/80 focus:border-orange focus:ring-1 focus:ring-orange"
        />
      </div>

      <PasswordField
        id="password"
        name="password"
        label="Contraseña"
        placeholder="Introduce tu contraseña"
        autoComplete="current-password"
      />

      <p className="-mt-1 text-right font-sans text-xs">
        <Link href="/recuperar-acceso" className="font-semibold text-charcoal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-orange">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      {state.status === "error" || initialError ? (
        <p role="alert" className="rounded-md border border-orange bg-white px-3 py-2 font-sans text-sm text-charcoal">
          {state.message ?? initialError}
        </p>
      ) : null}

      <AuthSubmitButton pendingLabel="Iniciando sesión…">
        Iniciar sesión
      </AuthSubmitButton>

      <GoogleOAuthButton />

      <p className="pt-1 text-center font-sans text-sm text-brown">
        ¿Todavía no tienes cuenta?{" "}
        <Link href={`/registro?next=${encodeURIComponent(nextPath === "/" ? "/reservar" : nextPath)}`} className="font-semibold text-charcoal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-orange">
          Crear cuenta
        </Link>
      </p>
      <p className="text-center font-sans text-sm">
        <Link href="/" className="font-semibold text-charcoal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-orange">
          ← Volver al inicio
        </Link>
      </p>
    </form>
  );
}

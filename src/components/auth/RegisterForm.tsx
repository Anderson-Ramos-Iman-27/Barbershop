"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpWithPassword } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/state";

import AuthSubmitButton from "./AuthSubmitButton";
import GoogleOAuthButton from "./GoogleOAuthButton";
import PasswordField from "./PasswordField";

interface RegisterFormProps {
  nextPath: string;
}

const inputClassName = "mt-2 min-h-11 w-full rounded-md border border-brown/25 bg-transparent px-3 font-sans text-sm text-charcoal outline-none transition-colors placeholder:text-brown/80 focus:border-orange focus:ring-1 focus:ring-orange";

export default function RegisterForm({ nextPath }: RegisterFormProps) {
  const [state, formAction] = useActionState(
    signUpWithPassword,
    initialAuthActionState,
  );

  if (state.status === "success") {
    return (
      <div className="mt-7 rounded-md border border-brown/20 bg-white px-4 py-5" role="status">
        <p className="font-sans text-sm leading-relaxed text-charcoal">{state.message}</p>
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="mt-5 inline-flex font-sans text-sm font-semibold text-charcoal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-orange">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-5 space-y-3" noValidate>
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="authIntent" value="register" />
      <div>
        <label htmlFor="fullName" className="font-sans text-xs font-semibold text-charcoal">Nombre completo</label>
        <input id="fullName" name="fullName" type="text" autoComplete="name" required placeholder="Escribe tu nombre completo" className={inputClassName} />
      </div>
      <div>
        <label htmlFor="email" className="font-sans text-xs font-semibold text-charcoal">Correo electrónico</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="nombre@correo.com" className={inputClassName} />
      </div>
      <div>
        <label htmlFor="phone" className="font-sans text-xs font-semibold text-charcoal">Número de teléfono</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="Número de teléfono" className={inputClassName} />
      </div>
      <PasswordField id="password" name="password" label="Contraseña" placeholder="Crea una contraseña segura" autoComplete="new-password" />
      <div className="rounded-md bg-white px-3 py-2 font-sans text-xs leading-relaxed text-brown">
        <p className="font-semibold text-charcoal">La contraseña debe incluir:</p>
        <ul className="mt-1 space-y-0.5" aria-label="Requisitos de contraseña">
          <li>• 8 caracteres como mínimo</li>
          <li>• Una combinación de letras y números</li>
          <li>• Evita datos personales fáciles de adivinar</li>
        </ul>
      </div>
      <PasswordField id="confirmPassword" name="confirmPassword" label="Confirmar contraseña" placeholder="Repite tu contraseña" autoComplete="new-password" />
      <label className="flex cursor-pointer items-start gap-2 pt-1 font-sans text-xs leading-relaxed text-charcoal">
        <input name="acceptTerms" type="checkbox" required className="mt-0.5 size-4 rounded border-brown/30 accent-orange" />
        <span>Acepto los Términos y la Política de privacidad. Estos enlaces son provisionales.</span>
      </label>
      {state.status === "error" ? (
        <p role="alert" className="rounded-md border border-orange bg-white px-3 py-2 font-sans text-sm text-charcoal">{state.message}</p>
      ) : null}
      <AuthSubmitButton pendingLabel="Creando cuenta…">Crear cuenta</AuthSubmitButton>
      <GoogleOAuthButton />
      <p className="text-center font-sans text-xs leading-relaxed text-brown">Para registrarte con Google, escribe arriba el correo de esa cuenta y selecciónala al continuar.</p>
      <p className="text-center font-sans text-sm text-brown">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-charcoal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-orange">Iniciar sesión</Link>
      </p>
    </form>
  );
}

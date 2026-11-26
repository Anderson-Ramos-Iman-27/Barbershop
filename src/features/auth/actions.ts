"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/features/auth/redirect";
import { getCurrentActor } from "@/features/auth/session";
import { accountExists } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";

import type { AuthActionState } from "./state";

function getText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (!/[a-záéíóúñ]/i.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir letras y números.";
  }

  return null;
}

function validateEmailPassword(email: string, password: string): string | null {
  if (!email || !email.includes("@")) {
    return "Ingresa un correo válido.";
  }

  return validatePassword(password);
}

async function getApplicationOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("No se pudo determinar el origen de la aplicación.");
  }

  return `${protocol}://${host}`;
}

export async function signUpWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const fullName = getText(formData, "fullName");
  const phone = getText(formData, "phone");
  const confirmPassword = getText(formData, "confirmPassword");
  const acceptedTerms = formData.get("acceptTerms") === "on";
  const nextPath = getSafeNextPath(getText(formData, "next") || "/reservar");
  const validationError = validateEmailPassword(email, password);

  if (validationError) {
    return { status: "error", message: validationError };
  }

  if (!fullName) {
    return { status: "error", message: "Ingresa tu nombre completo." };
  }

  if (password !== confirmPassword) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  if (!acceptedTerms) {
    return { status: "error", message: "Debes aceptar los términos para crear tu cuenta." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || undefined,
        phone: phone || undefined,
      },
      emailRedirectTo: `${await getApplicationOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    return { status: "error", message: "No fue posible crear la cuenta." };
  }

  if (data.session) {
    redirect(nextPath);
  }

  return {
    status: "success",
    message: "Revisa tu correo para completar el registro.",
  };
}

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const nextPath = getSafeNextPath(getText(formData, "next"));
  const validationError = validateEmailPassword(email, password);

  if (validationError) {
    return { status: "error", message: validationError };
  }

  let exists: boolean;
  try { exists = await accountExists(email); }
  catch { return { status: "error", message: "No se pudo verificar el acceso. Inténtalo nuevamente." }; }
  if (!exists) redirect(`/registro?reason=not_registered&next=${encodeURIComponent(nextPath === "/" ? "/reservar" : nextPath)}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Correo o contraseña no válidos." };
  }

  const actor = await getCurrentActor();
  redirect(nextPath === "/" && actor?.role === "admin" ? "/admin" : nextPath);
}

export async function signInWithGoogle(formData: FormData): Promise<never> {
  const nextPath = getSafeNextPath(getText(formData, "next"));
  const registering = getText(formData, "authIntent") === "register";
  const supabase = await createClient();
  const email = getText(formData, "email").toLowerCase();
  if (registering) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/registro?reason=google_email&next=${encodeURIComponent(nextPath)}`);
    const { error } = await supabase.rpc("begin_google_registration", { p_email: email });
    if (error) redirect(`/registro?reason=google_unavailable&next=${encodeURIComponent(nextPath)}`);
  }
  const cookieStore = await cookies();
  cookieStore.set("ow-google-intent", registering ? "register" : "login", { httpOnly: true, secure: (await getApplicationOrigin()).startsWith("https:"), sameSite: "lax", path: "/auth/callback", maxAge: 600 });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await getApplicationOrigin()}/auth/oauth-return?next=${encodeURIComponent(nextPath)}`,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account", ...(registering ? { login_hint: email } : {}) },
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=oauth&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(data.url);
}

export async function requestPasswordReset(formData: FormData): Promise<never> {
  const email = getText(formData, "email");

  if (email && email.includes("@")) {
    const supabase = await createClient();
    // La respuesta se mantiene indistinguible para no revelar qué correos existen.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await getApplicationOrigin()}/auth/callback?next=${encodeURIComponent("/restablecer-contrasena")}`,
    });
  }

  redirect("/revisa-tu-correo");
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = getText(formData, "password");
  const confirmPassword = getText(formData, "confirmPassword");
  const validationError = validatePassword(password);

  if (validationError) {
    return { status: "error", message: validationError };
  }

  if (password !== confirmPassword) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "error", message: "El enlace de recuperación no es válido o venció." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: "error", message: "No fue posible actualizar la contraseña. Solicita un nuevo enlace." };
  }

  await supabase.auth.signOut({ scope: "others" });
  return { status: "success", message: "Tu contraseña fue actualizada correctamente." };
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

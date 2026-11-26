"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<{ error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: "No se pudo cerrar la sesión. Inténtalo de nuevo." };
  redirect("/");
}

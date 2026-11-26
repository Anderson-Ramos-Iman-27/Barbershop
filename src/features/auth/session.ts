import "server-only";
import { cache } from "react";

import type { AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export interface CurrentActor {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string | null;
  phone: string | null;
  avatarPath: string | null;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Autenticación requerida.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AdministratorRequiredError extends Error {
  constructor() {
    super("Se requiere autorización administrativa.");
    this.name = "AdministratorRequiredError";
  }
}

// Memoization lives only within this render request, never across users/sessions.
export const getCurrentActor = cache(async (): Promise<CurrentActor | null> => {
  const supabase = await createClient();
  // getClaims verifies the JWT signature/expiry (ES256 in this project).
  // Authorization still comes from the current profile under database RLS.
  const { data, error: identityError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (identityError || !claims?.sub) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, avatar_path")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return {
    id: profile.id,
    email: typeof claims.email === "string" ? claims.email : null,
    role: profile.role,
    fullName: profile.full_name,
    phone: profile.phone,
    avatarPath: profile.avatar_path,
  };
});

export async function requireCurrentActor(): Promise<CurrentActor> {
  const actor = await getCurrentActor();
  if (!actor) {
    throw new AuthenticationRequiredError();
  }

  return actor;
}

export async function requireAdministrator(): Promise<CurrentActor> {
  const actor = await requireCurrentActor();
  if (actor.role !== "admin") {
    throw new AdministratorRequiredError();
  }

  return actor;
}

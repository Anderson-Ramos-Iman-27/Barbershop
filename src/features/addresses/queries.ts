import "server-only";
import { AuthenticationRequiredError } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { SavedAddress } from "./types";

export async function getOwnAddresses(): Promise<SavedAddress[]> {
  const supabase = await createClient();
  const identity = await supabase.auth.getClaims();
  if (identity.error || !identity.data?.claims.sub) throw new AuthenticationRequiredError();
  // Own-row RLS is authoritative; profile rendering can run in parallel.
  const { data, error } = await supabase.from("customer_addresses").select("id,address_line,district,reference,additional_instructions,latitude,longitude").eq("customer_profile_id", identity.data.claims.sub).order("updated_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar tus direcciones.");
  return data.map(a => ({ ...a, reference: a.reference ?? "", additional_instructions: a.additional_instructions ?? "" }));
}

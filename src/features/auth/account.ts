import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Isolated server credential; never imported by Client Components. */
export async function accountExists(email: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVER_SECRET_KEY;
  if (!url || !secret) throw new Error("Falta la configuración privada de verificación de cuentas.");
  const client = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("auth_account_exists", { p_email: email });
  if (error) throw new Error("No fue posible verificar la cuenta.");
  return data === true;
}

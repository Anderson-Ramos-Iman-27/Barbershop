"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentActor } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasPoint, type AddressDraft } from "./types";

export async function saveAddress(id: string | null, input: AddressDraft) {
  const actor = await requireCurrentActor();
  if (!hasPoint(input) || !input.address_line.trim() || input.address_line.trim().length > 300 || !input.district.trim() || input.district.trim().length > 120 || input.reference.length > 500 || input.additional_instructions.length > 1000) return { error: "Completa la dirección, el distrito y un punto válido en el mapa." };
  const values = { address_line: input.address_line.trim(), district: input.district.trim(), reference: input.reference.trim() || null, additional_instructions: input.additional_instructions.trim() || null, latitude: input.latitude, longitude: input.longitude };
  const supabase = await createClient();
  const result = id ? await supabase.from("customer_addresses").update(values).eq("id", id).eq("customer_profile_id", actor.id).select("id").single() : await supabase.from("customer_addresses").insert({ ...values, customer_profile_id: actor.id }).select("id").single();
  if (result.error) return { error: "No se pudo guardar la dirección. Revisa los datos e inténtalo de nuevo." };
  revalidatePath("/direcciones"); revalidatePath("/reservar");
  return { success: true };
}

export async function deleteAddress(id: string) {
  const actor = await requireCurrentActor();
  const { data, error } = await (await createClient()).from("customer_addresses").delete().eq("id", id).eq("customer_profile_id", actor.id).select("id").single();
  if (error || !data) return { error: "No se pudo eliminar la dirección." };
  revalidatePath("/direcciones"); revalidatePath("/reservar");
  return { success: true };
}

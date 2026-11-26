"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentActor } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function cancelBooking(form: FormData) {
  await requireCurrentActor();
  const id = String(form.get("id") ?? "");
  if (!uuid.test(id)) redirect("/mis-citas?error=1");
  const { error } = await (await createClient()).rpc("cancel_own_booking", { p_booking_id: id });
  revalidatePath("/mis-citas");
  revalidatePath("/admin/calendario");
  redirect(error ? "/mis-citas?error=1" : "/mis-citas");
}

export async function decideBooking(form: FormData) {
  const { requireAdministrator } = await import("@/features/auth/session");
  await requireAdministrator();
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  const requestedReturn = String(form.get("returnTo") ?? "");
  const returnTo = requestedReturn.startsWith("/admin/calendario?") && !/[\\\r\n]/.test(requestedReturn) ? requestedReturn : "/admin/reservas";
  if (!uuid.test(id) || !["confirm", "reject"].includes(decision)) redirect("/admin/reservas?error=1");
  const supabase = await createClient();
  const { error } = decision === "confirm"
    ? await supabase.rpc("admin_confirm_booking", { p_booking_id: id })
    : await supabase.rpc("admin_reject_booking", { p_booking_id: id, p_customer_reason: null, p_internal_note: null });
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/calendario");
  revalidatePath("/mis-citas");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}${error ? "error=1" : "saved=1"}`);
}

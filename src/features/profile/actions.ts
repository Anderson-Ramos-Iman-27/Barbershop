"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentActor } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { avatarBucket } from "./queries";

export async function saveProfile(form: FormData) {
  const actor = await requireCurrentActor();
  const supabase = await createClient();
  let uploaded: string | null = null;
  let saved = false;
  let failure: string | undefined;
  try {
    const name = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!name || name.length > 120) throw new Error("Escribe un nombre de hasta 120 caracteres.");
    if (phone.length > 30 || (phone && !/^[+\d\s().-]{6,30}$/.test(phone))) throw new Error("Revisa el teléfono de contacto.");
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
      if (!extensions[file.type] || file.size > 5 * 1024 * 1024) throw new Error("La foto debe ser JPG, PNG o WebP y pesar hasta 5 MB.");
      const path = `${actor.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const { error } = await supabase.storage.from(avatarBucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("No se pudo subir la foto. Inténtalo de nuevo.");
      uploaded = path;
    }
    const result = await supabase.from("profiles").update({ full_name: name, phone: phone || null, ...(uploaded ? { avatar_path: uploaded } : {}) }).eq("id", actor.id).select("id").single();
    if (result.error) throw new Error("No se pudo guardar tu perfil.");
    saved = true;
    if (uploaded && actor.avatarPath) await supabase.storage.from(avatarBucket).remove([actor.avatarPath]);
  } catch (error) {
    failure = error instanceof Error ? error.message : "No se pudo guardar tu perfil.";
    if (uploaded && !saved) await supabase.storage.from(avatarBucket).remove([uploaded]);
  }
  for (const path of ["/perfil", "/mis-citas", "/", "/admin/reservas", "/admin/calendario"]) revalidatePath(path);
  revalidatePath("/(account)", "layout");
  redirect(failure ? `/perfil?error=${encodeURIComponent(failure)}` : "/perfil?saved=1");
}

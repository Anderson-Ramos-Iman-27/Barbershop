"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdministrator } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const galleryBucket = "original-wave-gallery";
const serviceBucket = "original-wave-services";

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}
function optional(data: FormData, key: string) {
  return value(data, key) || null;
}
function integer(data: FormData, key: string): number | null {
  const raw = value(data, key);
  if (!raw) return null;
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error(`Valor inválido: ${key}.`);
  return Number(raw);
}
function cents(data: FormData): number | null {
  const raw = value(data, "price");
  if (!raw) return null;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) throw new Error("El precio debe estar en PEN con hasta dos decimales.");
  const [whole, fraction = ""] = raw.replace(",", ".").split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error("El precio debe ser positivo.");
  return result;
}
function outcome(path: string, error?: string): never {
  revalidatePath(path);
  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`${path}?${error ? `error=${encodeURIComponent(error)}` : "saved=1"}`);
}
function safeError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo guardar. Revisa los datos e inténtalo de nuevo.";
}

export async function saveService(data: FormData) {
  await requireAdministrator();
  const path = "/admin/servicios";
  let failure: string | undefined;
  let uploadedPath: string | null = null;
  let serviceSaved = false;
  try {
    const supabase = await createClient();
    const id = value(data, "id");
    if (id && !uuid.test(id)) throw new Error("Servicio inválido.");
    const name = value(data, "name");
    if (!name) throw new Error("Indica el nombre del servicio.");
    const price = cents(data);
    const duration = integer(data, "duration");
    const active = data.get("active") === "on";
    const published = data.get("published") === "on";
    if (active && (!price || !duration)) throw new Error("Para activar, indica precio y duración.");
    if (published && (!active || !value(data, "description"))) throw new Error("Para publicar, activa el servicio y añade una descripción.");
    const file = data.get("image");
    const hasFile = file instanceof File && file.size > 0;
    const imageAlt = optional(data, "image_alt");
    if (hasFile && (!imageAlt || !(file instanceof File) || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) throw new Error("La imagen requiere descripción y debe ser JPG, PNG o WebP de máximo 5 MB.");
    let oldPath: string | null = null;
    if (id) {
      const { data: existing, error } = await supabase.from("services").select("image_path").eq("id", id).single();
      if (error) throw new Error("No se encontró el servicio.");
      oldPath = existing.image_path;
    }
    if (oldPath && !imageAlt) throw new Error("La imagen existente requiere una descripción.");
    const extension = hasFile && file instanceof File ? ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[file.type] : null;
    const imagePath = hasFile ? `${crypto.randomUUID()}.${extension}` : oldPath;
    if (hasFile && file instanceof File && imagePath) {
      const upload = await supabase.storage.from(serviceBucket).upload(imagePath, file, { contentType: file.type, upsert: false });
      if (upload.error) throw new Error("No fue posible subir la fotografía del servicio.");
      uploadedPath = imagePath;
    }
    const payload = { name, description: optional(data, "description"), price_pen_centavos: price, duration_minutes: duration, image_bucket: imagePath ? serviceBucket : null, image_path: imagePath, image_alt: imagePath ? imageAlt : null, is_active: active, is_published: published, sort_order: integer(data, "sort_order") ?? 0 };
    const result = id
      ? await supabase.from("services").update(payload).eq("id", id).select("id").single()
      : await supabase.from("services").insert(payload).select("id").single();
    if (result.error || !result.data) throw new Error("No se pudo guardar el servicio.");
    serviceSaved = true;
    const serviceId = result.data.id;
    for (const mode of ["local", "domicilio"] as const) {
      const { error } = await supabase.from("service_modes").upsert({ service_id: serviceId, mode, is_active: data.get(`mode_${mode}`) === "on" });
      if (error) throw new Error("El servicio se guardó, pero no fue posible actualizar sus modalidades.");
    }
    if (uploadedPath && oldPath) await supabase.storage.from(serviceBucket).remove([oldPath]);
  } catch (error) {
    failure = safeError(error);
    if (uploadedPath && !serviceSaved) {
      const supabase = await createClient();
      await supabase.storage.from(serviceBucket).remove([uploadedPath]);
    }
  }
  outcome(path, failure);
}

export async function archiveService(data: FormData) {
  await requireAdministrator();
  const path = "/admin/servicios";
  const id = value(data, "id");
  if (!uuid.test(id)) outcome(path, "Servicio inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ is_active: false, is_published: false, archived_at: new Date().toISOString() }).eq("id", id);
  outcome(path, error ? "No se pudo archivar el servicio." : undefined);
}

export async function saveProfessional(data: FormData) {
  await requireAdministrator();
  const path = "/admin/profesionales";
  let failure: string | undefined;
  try {
    const supabase = await createClient();
    const id = value(data, "id");
    if (id && !uuid.test(id)) throw new Error("Profesional inválido.");
    const displayName = value(data, "display_name");
    if (!displayName) throw new Error("Indica el nombre del profesional.");
    const active = data.get("active") === "on";
    const published = data.get("published") === "on";
    if (published && !active) throw new Error("Activa al profesional antes de publicarlo.");
    const payload = { display_name: displayName, bio: optional(data, "bio"), is_active: active, is_published: published, sort_order: integer(data, "sort_order") ?? 0 };
    const result = id
      ? await supabase.from("professionals").update(payload).eq("id", id).select("id").single()
      : await supabase.from("professionals").insert(payload).select("id").single();
    if (result.error || !result.data) throw new Error("No se pudo guardar el profesional.");
    const professionalId = result.data.id;
    const { data: services, error: servicesError } = await supabase.from("services").select("id").is("archived_at", null);
    if (servicesError) throw new Error("No se pudieron leer los servicios asignables.");
    for (const service of services) {
      const { error } = await supabase.from("professional_services").upsert({ professional_id: professionalId, service_id: service.id, is_active: data.getAll("service_ids").includes(service.id) });
      if (error) throw new Error("El profesional se guardó, pero no fue posible actualizar sus servicios.");
    }
  } catch (error) { failure = safeError(error); }
  outcome(path, failure);
}

export async function archiveProfessional(data: FormData) {
  await requireAdministrator();
  const path = "/admin/profesionales";
  const id = value(data, "id");
  if (!uuid.test(id)) outcome(path, "Profesional inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("professionals").update({ is_active: false, is_published: false, archived_at: new Date().toISOString() }).eq("id", id);
  outcome(path, error ? "No se pudo archivar el profesional. Comprueba sus reservas futuras." : undefined);
}

export async function saveGalleryItem(data: FormData) {
  await requireAdministrator();
  const path = "/admin/galeria";
  let failure: string | undefined;
  let uploadedPath: string | null = null;
  try {
    const supabase = await createClient();
    const id = value(data, "id");
    if (id && !uuid.test(id)) throw new Error("Elemento inválido.");
    const alt = optional(data, "alt_text");
    const published = data.get("published") === "on";
    const file = data.get("image");
    const hasFile = file instanceof File && file.size > 0;
    if (published && !alt) throw new Error("Añade texto alternativo antes de publicar.");
    if (published && !hasFile && !id) throw new Error("Sube una imagen antes de publicar.");
    let existing: { storage_path: string | null; storage_bucket: string | null } | null = null;
    if (id) {
      const result = await supabase.from("gallery_items").select("storage_path, storage_bucket").eq("id", id).single();
      if (result.error) throw new Error("No se encontró el elemento de galería.");
      existing = result.data;
    }
    if (published && !hasFile && !existing?.storage_path) throw new Error("Sube una imagen antes de publicar.");
    if (hasFile && file instanceof File && (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) throw new Error("Usa JPG, PNG o WebP de máximo 5 MB.");
    const extension = hasFile && file instanceof File ? ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[file.type] : null;
    const storagePath = hasFile ? `${crypto.randomUUID()}.${extension}` : existing?.storage_path ?? null;
    if (hasFile && file instanceof File && storagePath) {
      const upload = await supabase.storage.from(galleryBucket).upload(storagePath, file, { contentType: file.type, upsert: false });
      if (upload.error) throw new Error("No fue posible subir la imagen.");
      uploadedPath = storagePath;
    }
    const payload = { storage_bucket: storagePath ? galleryBucket : null, storage_path: storagePath, alt_text: alt, caption: optional(data, "caption"), is_published: published, published_at: published ? new Date().toISOString() : null, sort_order: integer(data, "sort_order") ?? 0, ...(hasFile && file instanceof File ? { mime_type: file.type, file_size_bytes: file.size } : {}) };
    const result = id ? await supabase.from("gallery_items").update(payload).eq("id", id) : await supabase.from("gallery_items").insert(payload);
    if (result.error) throw new Error("No fue posible guardar la galería.");
    if (uploadedPath && existing?.storage_path) {
      await supabase.storage.from(galleryBucket).remove([existing.storage_path]);
    }
  } catch (error) {
    failure = safeError(error);
    if (uploadedPath) {
      const supabase = await createClient();
      await supabase.storage.from(galleryBucket).remove([uploadedPath]);
    }
  }
  outcome(path, failure);
}

export async function archiveGalleryItem(data: FormData) {
  await requireAdministrator();
  const path = "/admin/galeria";
  const id = value(data, "id");
  if (!uuid.test(id)) outcome(path, "Elemento inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").update({ is_published: false, published_at: null, archived_at: new Date().toISOString() }).eq("id", id);
  outcome(path, error ? "No se pudo archivar la imagen." : undefined);
}

export async function saveBusinessSettings(data: FormData) {
  await requireAdministrator();
  const path = "/admin/configuracion";
  let failure: string | undefined;
  try {
    const mode = value(data, "assignment_mode");
    const interval = integer(data, "slot_interval");
    if (mode && !["customer_choice", "automatic"].includes(mode)) throw new Error("Modo de asignación inválido.");
    if (![15, 30, 60].includes(interval ?? 0)) throw new Error("La granularidad debe ser 15, 30 o 60 minutos.");
    const notice = integer(data, "minimum_notice");
    const horizon = integer(data, "booking_horizon");
    if (!notice || !horizon) throw new Error("Indica anticipación y horizonte positivos.");
    const supabase = await createClient();
    const enabled = data.get("booking_enabled") === "on";
    if (enabled && (!mode || !integer(data, "approval_max") || !integer(data, "approval_cutoff") || !integer(data, "cancellation_notice") || !integer(data, "reschedule_ttl"))) throw new Error("Completa las reglas operativas antes de habilitar reservas.");
    const { error } = await supabase.from("business_settings").update({
      booking_enabled: enabled,
      professional_assignment_mode: (mode || null) as "customer_choice" | "automatic" | null,
      booking_slot_interval_minutes: interval!,
      minimum_notice_minutes: notice,
      booking_horizon_days: horizon,
      approval_max_pending_minutes: integer(data, "approval_max"),
      approval_cutoff_before_start_minutes: integer(data, "approval_cutoff"),
      cancellation_notice_minutes: integer(data, "cancellation_notice"),
      reschedule_proposal_ttl_minutes: integer(data, "reschedule_ttl"),
    }).eq("id", 1);
    if (error) throw new Error("No se pudo guardar la configuración operativa.");
  } catch (error) { failure = safeError(error); }
  outcome(path, failure);
}

export async function createWorkingHours(data: FormData) {
  await requireAdministrator();
  const path = "/admin/horarios";
  let failure: string | undefined;
  try {
    const professionalId = value(data, "professional_id");
    const weekdays = data.getAll("weekdays").map(day => String(day));
    const startsAt = value(data, "starts_at");
    const endsAt = value(data, "ends_at");
    const effectiveFrom = value(data, "effective_from");
    if (!weekdays.length || weekdays.length > 7 || weekdays.some(day => !/^[1-7]$/.test(day)) || new Set(weekdays).size !== weekdays.length) throw new Error("Selecciona al menos un día de trabajo válido.");
    if (!uuid.test(professionalId) || !/^\d{2}:\d{2}$/.test(startsAt) || !/^\d{2}:\d{2}$/.test(endsAt) || startsAt >= endsAt || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) throw new Error("Comprueba el profesional, las fechas y las horas de inicio y fin.");
    const { error } = await (await createClient()).rpc("admin_create_working_hours_batch", { p_professional_id: professionalId, p_weekdays: weekdays.map(Number).sort((a, b) => a - b), p_starts_at: startsAt, p_ends_at: endsAt, p_effective_from: effectiveFrom, p_effective_until: optional(data, "effective_until") });
    if (error) throw new Error(error.code === "23P01" ? "Uno de los días coincide con un turno existente. No se guardó ningún día; revisa la selección." : "No se pudieron guardar los horarios. Revisa intervalos y vigencias; no se guardó ningún día.");
    revalidatePath("/reservar");
    revalidatePath("/admin/calendario");
  } catch (error) { failure = safeError(error); }
  outcome(path, failure);
}

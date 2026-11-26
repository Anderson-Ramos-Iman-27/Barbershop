import "server-only";

import { requireAdministrator } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

import type {
  AdminBusinessSettings,
  AdminDashboardData,
  AdminGalleryItem,
  AdminProfessional,
  AdminService,
} from "./types";

export class AdminQueryError extends Error {
  constructor(resource: string) {
    super(`No fue posible cargar ${resource}.`);
    this.name = "AdminQueryError";
  }
}

type Resource = "services" | "professionals" | "galleryItems" | "settings";

// Count on PostgreSQL instead of downloading every catalog row for three numbers.
// No shared cache: each request still validates the actor and uses their RLS session.
export async function getAdminSummary() {
  await requireAdministrator();
  const supabase = await createClient();
  const [services, professionals, gallery, configuration] = await Promise.all([
    supabase.from("services").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("professionals").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("gallery_items").select("id", { count: "exact", head: true }).eq("is_published", true),
    getAdminDashboardData(["settings"]),
  ]);
  if (services.error || professionals.error || gallery.error) throw new AdminQueryError("el resumen del catálogo");
  return { services: services.count ?? 0, professionals: professionals.count ?? 0, gallery: gallery.count ?? 0, settings: configuration.settings };
}

export async function getAdminDashboardData(resources: readonly Resource[] = ["services", "professionals", "galleryItems", "settings"]): Promise<AdminDashboardData> {
  const actor = await requireAdministrator();
  const supabase = await createClient();

  const [servicesResult, professionalsResult, galleryResult, settingsResult] =
    await Promise.all([
      resources.includes("services") ? supabase
        .from("services")
        .select(
          "id, name, description, price_pen_centavos, duration_minutes, image_path, image_alt, is_active, is_published, sort_order, archived_at",
        )
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }) : Promise.resolve({ data: [], error: null }),
      resources.includes("professionals") ? supabase
        .from("professionals")
        .select("id, display_name, bio, is_active, is_published, sort_order, archived_at")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }) : Promise.resolve({ data: [], error: null }),
      resources.includes("galleryItems") ? supabase
        .from("gallery_items")
        .select("id, storage_path, mime_type, alt_text, caption, is_published, sort_order, archived_at")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }) : Promise.resolve({ data: [], error: null }),
      resources.includes("settings") ? supabase
        .from("business_settings")
        .select(
          "currency_code, business_timezone, booking_enabled, professional_assignment_mode, minimum_notice_minutes, booking_horizon_days, approval_max_pending_minutes, approval_cutoff_before_start_minutes, cancellation_notice_minutes, reschedule_proposal_ttl_minutes, booking_slot_interval_minutes",
        )
        .eq("id", 1)
        .maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);

  if (servicesResult.error) throw new AdminQueryError("los servicios");
  if (professionalsResult.error) throw new AdminQueryError("los profesionales");
  if (galleryResult.error) throw new AdminQueryError("la galería");
  if (settingsResult.error) throw new AdminQueryError("la configuración operativa");

  const services: AdminService[] = servicesResult.data.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    pricePenCentavos: service.price_pen_centavos,
    durationMinutes: service.duration_minutes,
    imagePath: service.image_path,
    imageAlt: service.image_alt,
    isActive: service.is_active,
    isPublished: service.is_published,
    sortOrder: service.sort_order,
    archivedAt: service.archived_at,
  }));

  const professionals: AdminProfessional[] = professionalsResult.data.map((professional) => ({
    id: professional.id,
    displayName: professional.display_name,
    bio: professional.bio,
    isActive: professional.is_active,
    isPublished: professional.is_published,
    sortOrder: professional.sort_order,
    archivedAt: professional.archived_at,
  }));

  const galleryItems: AdminGalleryItem[] = galleryResult.data.map((item) => ({
    id: item.id,
    storagePath: item.storage_path,
    mimeType: item.mime_type,
    altText: item.alt_text,
    caption: item.caption,
    isPublished: item.is_published,
    sortOrder: item.sort_order,
    archivedAt: item.archived_at,
  }));

  const rawSettings = settingsResult.data;
  const settings: AdminBusinessSettings | null = rawSettings
    ? {
        currencyCode: rawSettings.currency_code,
        businessTimezone: rawSettings.business_timezone,
        bookingEnabled: rawSettings.booking_enabled,
        assignmentMode: rawSettings.professional_assignment_mode,
        minimumNoticeMinutes: rawSettings.minimum_notice_minutes,
        bookingHorizonDays: rawSettings.booking_horizon_days,
        approvalMaxPendingMinutes: rawSettings.approval_max_pending_minutes,
        approvalCutoffBeforeStartMinutes: rawSettings.approval_cutoff_before_start_minutes,
        cancellationNoticeMinutes: rawSettings.cancellation_notice_minutes,
        rescheduleProposalTtlMinutes: rawSettings.reschedule_proposal_ttl_minutes,
        bookingSlotIntervalMinutes: rawSettings.booking_slot_interval_minutes,
      }
    : null;

  return { services, professionals, galleryItems, settings, role: actor.role };
}

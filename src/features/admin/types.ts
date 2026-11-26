import type { AppRole, ServiceMode } from "@/lib/supabase/database.types";

export interface AdminService {
  id: string;
  name: string;
  description: string | null;
  pricePenCentavos: number | null;
  durationMinutes: number | null;
  imagePath: string | null;
  imageAlt: string | null;
  isActive: boolean;
  isPublished: boolean;
  sortOrder: number;
  archivedAt: string | null;
}

export interface AdminProfessional {
  id: string;
  displayName: string;
  bio: string | null;
  isActive: boolean;
  isPublished: boolean;
  sortOrder: number;
  archivedAt: string | null;
}

export interface AdminGalleryItem {
  id: string;
  storagePath: string | null;
  mimeType: string | null;
  altText: string | null;
  caption: string | null;
  isPublished: boolean;
  sortOrder: number;
  archivedAt: string | null;
}

export interface AdminBusinessSettings {
  currencyCode: string;
  businessTimezone: string;
  bookingEnabled: boolean;
  assignmentMode: "customer_choice" | "automatic" | null;
  minimumNoticeMinutes: number;
  bookingHorizonDays: number;
  approvalMaxPendingMinutes: number | null;
  approvalCutoffBeforeStartMinutes: number | null;
  cancellationNoticeMinutes: number | null;
  rescheduleProposalTtlMinutes: number | null;
  bookingSlotIntervalMinutes: number;
}

export interface AdminDashboardData {
  services: AdminService[];
  professionals: AdminProfessional[];
  galleryItems: AdminGalleryItem[];
  settings: AdminBusinessSettings | null;
  role: AppRole;
}

export type AdminServiceMode = ServiceMode;

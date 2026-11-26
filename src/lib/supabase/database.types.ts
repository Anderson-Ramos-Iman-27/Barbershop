export type ServiceMode = "local" | "domicilio";
export type AppRole = "customer" | "admin";

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_path: string | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        },
        { id: string; full_name?: string | null; phone?: string | null; role?: AppRole },
        { full_name?: string | null; phone?: string | null; avatar_path?: string | null }
      >;
      services: Table<{
        id: string;
        name: string;
        description: string | null;
        price_pen_centavos: number | null;
        duration_minutes: number | null;
        image_bucket: string | null;
        image_path: string | null;
        image_alt: string | null;
        is_active: boolean;
        is_published: boolean;
        sort_order: number;
        archived_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      service_modes: Table<{
        service_id: string;
        mode: ServiceMode;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      professionals: Table<{
        id: string;
        display_name: string;
        bio: string | null;
        image_bucket: string | null;
        image_path: string | null;
        image_alt: string | null;
        is_active: boolean;
        is_published: boolean;
        sort_order: number;
        archived_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      professional_services: Table<{
        professional_id: string;
        service_id: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      gallery_items: Table<{
        id: string;
        storage_bucket: string | null;
        storage_path: string | null;
        mime_type: string | null;
        file_size_bytes: number | null;
        width_px: number | null;
        height_px: number | null;
        alt_text: string | null;
        caption: string | null;
        is_published: boolean;
        published_at: string | null;
        sort_order: number;
        archived_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      business_settings: Table<{
        id: number;
        currency_code: string;
        business_timezone: string;
        booking_enabled: boolean;
        professional_assignment_mode: "customer_choice" | "automatic" | null;
        minimum_notice_minutes: number;
        booking_horizon_days: number;
        approval_max_pending_minutes: number | null;
        approval_cutoff_before_start_minutes: number | null;
        cancellation_notice_minutes: number | null;
        reschedule_proposal_ttl_minutes: number | null;
        booking_slot_interval_minutes: number;
        updated_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      bookings: Table<{
        id: string; customer_profile_id: string; professional_id: string; professional_name_snapshot: string;
        mode: ServiceMode; assignment_mode_snapshot: "customer_choice" | "automatic";
        starts_at: string; ends_at: string; total_duration_minutes: number;
        status: "pending" | "confirmed" | "rejected" | "expired" | "cancelled";
        business_timezone_snapshot: string; minimum_notice_minutes_snapshot: number;
        booking_horizon_days_snapshot: number; cancellation_notice_minutes_snapshot: number;
        approval_deadline_at: string; requested_at: string; created_at: string; updated_at: string;
      }>;
      booking_services: Table<{
        booking_id: string; service_id: string; position: number; service_name_snapshot: string;
        price_pen_centavos_snapshot: number; duration_minutes_snapshot: number;
      }>;
      customer_addresses: Table<{
        id: string; customer_profile_id: string; address_line: string; district: string;
        reference: string | null; additional_instructions: string | null;
        latitude: number; longitude: number; created_at: string; updated_at: string;
      }>;
      booking_addresses: Table<{
        booking_id: string; address_line: string; district: string; reference: string | null;
        latitude: number | null; longitude: number | null;
        additional_instructions: string | null; created_at: string; updated_at: string;
      }>;
      professional_working_hours: Table<{
        id: string; professional_id: string; weekday: number; starts_at: string; ends_at: string;
        effective_from: string; effective_until: string | null; is_active: boolean;
        archived_at: string | null; created_at: string; updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      convert_hold_to_booking_with_address: { Args: {
        p_hold_id: string; p_request_fingerprint: string; p_saved_address_id?: string | null;
        p_address_line?: string | null; p_district?: string | null; p_reference?: string | null;
        p_additional_instructions?: string | null; p_latitude?: number | null; p_longitude?: number | null;
        p_save_address?: boolean;
      }; Returns: string };
      auth_account_exists: { Args: { p_email: string }; Returns: boolean };
      begin_google_registration: { Args: { p_email: string }; Returns: undefined };
      get_booking_public_settings: { Args: Record<string, never>; Returns: {
        booking_enabled: boolean;
        professional_assignment_mode: "customer_choice" | "automatic" | null;
        business_timezone: string;
      }[] };
      request_booking_hold: { Args: {
        p_service_ids: string[]; p_mode: ServiceMode; p_starts_at: string;
        p_professional_id: string | null; p_idempotency_key: string; p_request_fingerprint: string;
      }; Returns: string };
      convert_hold_to_booking: { Args: {
        p_hold_id: string; p_request_fingerprint: string; p_address_line?: string | null;
        p_district?: string | null; p_reference?: string | null; p_additional_instructions?: string | null;
      }; Returns: string };
      cancel_own_booking: { Args: { p_booking_id: string }; Returns: undefined };
      admin_confirm_booking: { Args: { p_booking_id: string }; Returns: undefined };
      admin_reject_booking: { Args: { p_booking_id: string; p_customer_reason: string | null; p_internal_note: string | null }; Returns: undefined };
      admin_create_working_hours: { Args: {
        p_professional_id: string; p_weekday: number; p_starts_at: string; p_ends_at: string;
        p_effective_from: string; p_effective_until: string | null;
      }; Returns: string };
      admin_create_working_hours_batch: { Args: {
        p_professional_id: string; p_weekdays: number[]; p_starts_at: string; p_ends_at: string;
        p_effective_from: string; p_effective_until: string | null;
      }; Returns: string[] };
      admin_update_working_hours: { Args: {
        p_working_hours_id: string; p_starts_at: string; p_ends_at: string;
        p_effective_from: string; p_effective_until: string | null;
        p_is_active: boolean; p_archived_at?: string | null;
      }; Returns: undefined };
      get_booking_availability: {
        Args: {
          p_date: string;
          p_service_ids: string[];
          p_mode: ServiceMode;
          p_professional_id?: string | null;
        };
        Returns: {
          starts_at: string;
          ends_at: string;
          professional_id: string;
        }[];
      };
    };
    Enums: {
      app_role: AppRole;
      service_mode: ServiceMode;
    };
    CompositeTypes: Record<string, never>;
  };
};

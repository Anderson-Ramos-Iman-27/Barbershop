export type BookingMode = "local" | "domicilio";

export interface AvailabilityRequest {
  date: string;
  serviceIds: readonly string[];
  mode: BookingMode;
  professionalId?: string;
}

export interface AvailableSlot {
  startsAt: string;
  endsAt: string;
  professionalId: string;
}

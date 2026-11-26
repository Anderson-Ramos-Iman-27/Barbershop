import "server-only";

import type { AvailabilityRequest, AvailableSlot } from "@/features/availability/types";
import { createClient } from "@/lib/supabase/server";

export class AvailabilityQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvailabilityQueryError";
  }
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateRequest(request: AvailabilityRequest) {
  if (!isoDatePattern.test(request.date)) {
    throw new AvailabilityQueryError("La fecha de disponibilidad no es válida.");
  }

  if (request.serviceIds.length === 0 || new Set(request.serviceIds).size !== request.serviceIds.length) {
    throw new AvailabilityQueryError("Selecciona servicios válidos sin duplicados.");
  }

  if (!request.serviceIds.every((id) => uuidPattern.test(id))) {
    throw new AvailabilityQueryError("Uno o más servicios no son válidos.");
  }

  if (request.professionalId && !uuidPattern.test(request.professionalId)) {
    throw new AvailabilityQueryError("El profesional seleccionado no es válido.");
  }
}

/**
 * Consulta no vinculante. La RPC de hold vuelve a validar disponibilidad y
 * concurrencia, por lo que ningún resultado garantiza una reserva futura.
 */
export async function getBookingAvailability(
  request: AvailabilityRequest,
): Promise<AvailableSlot[]> {
  validateRequest(request);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_booking_availability", {
    p_date: request.date,
    p_service_ids: [...request.serviceIds],
    p_mode: request.mode,
    p_professional_id: request.professionalId ?? null,
  });

  if (error) {
    throw new AvailabilityQueryError("No fue posible consultar disponibilidad.");
  }

  return data.map((slot) => ({
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    professionalId: slot.professional_id,
  }));
}

import "server-only";
import { requireAdministrator } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function getAdminBookings(id?: string) {
  await requireAdministrator();
  const supabase = await createClient();
  let query = supabase.from("bookings").select("id, customer_profile_id, professional_name_snapshot, starts_at, ends_at, total_duration_minutes, status, mode, requested_at, approval_deadline_at").order("starts_at", { ascending: false }).limit(100);
  if (id && /^[0-9a-f-]{36}$/i.test(id)) query = query.eq("id", id);
  const { data, error } = await query;
  if (error) throw new Error("No fue posible cargar las reservas.");
  if (!data.length) return [];
  const ids = data.map(item => item.id);
  const [services, customers, addresses] = await Promise.all([
    supabase.from("booking_services").select("booking_id, service_name_snapshot, price_pen_centavos_snapshot, duration_minutes_snapshot").in("booking_id", ids).order("position"),
    supabase.from("profiles").select("id, full_name, phone").in("id", [...new Set(data.map(item => item.customer_profile_id))]),
    supabase.from("booking_addresses").select("booking_id, address_line, district, reference, additional_instructions, latitude, longitude").in("booking_id", ids),
  ]);
  if (services.error || customers.error || addresses.error) throw new Error("No fue posible cargar los detalles de las reservas.");
  const customerById = new Map(customers.data.map(item => [item.id, item]));
  const addressByBooking = new Map(addresses.data.map(item => [item.booking_id, item]));
  const servicesByBooking = new Map<string, typeof services.data>();
  for (const item of services.data) {
    const group = servicesByBooking.get(item.booking_id) ?? [];
    group.push(item);
    servicesByBooking.set(item.booking_id, group);
  }
  return data.map(booking => {
    const customer = customerById.get(booking.customer_profile_id);
    const items = servicesByBooking.get(booking.id) ?? [];
    return { ...booking, customerName: customer?.full_name || "Nombre pendiente de completar", customerPhone: customer?.phone, services: items, totalCentavos: items.reduce((sum, item) => sum + item.price_pen_centavos_snapshot, 0), address: addressByBooking.get(booking.id) };
  });
}

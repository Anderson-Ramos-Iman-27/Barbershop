import "server-only";

import { requireAdministrator } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function calendarWeek(value?: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const valid = value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100 && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
  const date = valid ? value : today;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  const start = shiftDate(date, 1 - weekday);
  return { today, start, days: Array.from({ length: 7 }, (_, i) => shiftDate(start, i)), end: shiftDate(start, 7) };
}

export async function getCalendarData(start: string, end: string, professionalId?: string) {
  await requireAdministrator();
  const supabase = await createClient();
  let query = supabase.from("bookings")
    .select("id, customer_profile_id, professional_id, professional_name_snapshot, starts_at, ends_at, status, mode")
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", `${start}T00:00:00-05:00`)
    .lt("starts_at", `${end}T00:00:00-05:00`)
    .order("starts_at");
  if (professionalId && /^[0-9a-f-]{36}$/i.test(professionalId)) query = query.eq("professional_id", professionalId);
  const [bookings, professionals] = await Promise.all([
    query,
    supabase.from("professionals").select("id, display_name").order("sort_order").order("display_name"),
  ]);
  if (bookings.error || professionals.error) throw new Error("No fue posible cargar el calendario.");
  const ids = bookings.data.map(b => b.id);
  const customers = [...new Set(bookings.data.map(b => b.customer_profile_id))];
  const [services, profiles] = ids.length ? await Promise.all([
    supabase.from("booking_services").select("booking_id, service_name_snapshot").in("booking_id", ids).order("position"),
    supabase.from("profiles").select("id, full_name").in("id", customers),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (services.error || profiles.error) throw new Error("No fue posible cargar el detalle de las citas.");
  return {
    professionals: professionals.data,
    bookings: bookings.data.map(b => ({ ...b,
      customerName: profiles.data?.find(p => p.id === b.customer_profile_id)?.full_name || "Cliente",
      services: services.data?.filter(s => s.booking_id === b.id).map(s => s.service_name_snapshot) ?? [],
    })),
  };
}

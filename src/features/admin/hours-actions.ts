"use server";

import { revalidatePath } from "next/cache";
import { requireAdministrator } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string; success: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
function failure(code?: string, message = "") {
  if (code === "23P01") return message.includes("ocupacion activa") ? "Este profesional tiene citas o retenciones futuras. No se modificó el turno; revisa su agenda antes de cambiar su disponibilidad." : "El turno se cruza con otro horario del mismo profesional durante esa vigencia. Revisa los días, las horas y las fechas.";
  if (code === "42501") return "No tienes permisos para gestionar horarios. Inicia sesión como administrador.";
  if (code === "P0002") return "El turno ya no está disponible. Actualiza la página.";
  return "No se pudo guardar. Comprueba que la hora final sea posterior al inicio y que la vigencia sea válida.";
}
function refresh() {
  for (const path of ["/admin/horarios", "/admin/calendario", "/reservar"]) revalidatePath(path);
}

export async function saveWorkingHours(_previous: Result, form: FormData): Promise<Result> {
  try {
    await requireAdministrator();
    const supabase = await createClient();
    const id = text(form, "id");
    const start = text(form, "starts_at"), end = text(form, "ends_at");
    const from = text(form, "effective_from"), until = text(form, "effective_until") || null;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) return { error: "Indica una hora de fin posterior al inicio. El turno debe terminar el mismo día.", success: "" };
    if (!validDate(from) || (until && (!validDate(until) || until <= from))) return { error: "Revisa la vigencia: la fecha final debe ser posterior a la inicial y no se incluye en el turno.", success: "" };
    if (id) {
      if (!uuid.test(id)) return { error: "El turno no es válido.", success: "" };
      const current = await supabase.from("professional_working_hours").select("id,is_active,archived_at").eq("id", id).single();
      if (current.error || !current.data || current.data.archived_at) return { error: "El turno no está disponible para editar. Si fue eliminado, restáuralo primero.", success: "" };
      const result = await supabase.rpc("admin_update_working_hours", { p_working_hours_id: id, p_starts_at: start, p_ends_at: end, p_effective_from: from, p_effective_until: until, p_is_active: current.data.is_active, p_archived_at: null });
      if (result.error) return { error: failure(result.error.code, result.error.message), success: "" };
    } else {
      const professional = text(form, "professional_id");
      const days = form.getAll("weekdays").map(String);
      if (!uuid.test(professional) || !days.length || days.length > 7 || new Set(days).size !== days.length || days.some(day => !/^[1-7]$/.test(day))) return { error: "Selecciona un profesional y al menos un día válido.", success: "" };
      const professionalResult = await supabase.from("professionals").select("id").eq("id", professional).eq("is_active", true).is("archived_at", null).single();
      if (professionalResult.error || !professionalResult.data) return { error: "Selecciona un profesional activo.", success: "" };
      const result = await supabase.rpc("admin_create_working_hours_batch", { p_professional_id: professional, p_weekdays: days.map(Number).sort((a,b) => a-b), p_starts_at: start, p_ends_at: end, p_effective_from: from, p_effective_until: until });
      if (result.error) return { error: `${failure(result.error.code, result.error.message)} No se guardó ninguno de los días seleccionados.`, success: "" };
    }
    refresh();
    return { error: "", success: id ? "Turno actualizado correctamente." : "Horarios creados para los días seleccionados." };
  } catch { return { error: "No se pudo completar la operación. Comprueba tu sesión y conexión e inténtalo de nuevo.", success: "" }; }
}

export async function changeWorkingHoursState(_previous: Result, form: FormData): Promise<Result> {
  try {
    await requireAdministrator();
    const id = text(form, "id"), operation = text(form, "operation");
    if (!uuid.test(id) || !["activate", "deactivate", "archive"].includes(operation)) return { error: "La operación no es válida.", success: "" };
    const supabase = await createClient();
    const current = await supabase.from("professional_working_hours").select("starts_at,ends_at,effective_from,effective_until").eq("id", id).single();
    if (current.error || !current.data) return { error: "El turno ya no está disponible. Actualiza la página.", success: "" };
    const h = current.data;
    const result = await supabase.rpc("admin_update_working_hours", { p_working_hours_id: id, p_starts_at: h.starts_at, p_ends_at: h.ends_at, p_effective_from: h.effective_from, p_effective_until: h.effective_until, p_is_active: operation === "activate", p_archived_at: operation === "archive" ? new Date().toISOString() : null });
    if (result.error) return { error: failure(result.error.code, result.error.message), success: "" };
    refresh();
    return { error: "", success: operation === "archive" ? "Turno eliminado de la disponibilidad. Se conserva su historial." : operation === "activate" ? "Turno activado." : "Turno desactivado." };
  } catch { return { error: "No se pudo completar la operación. Comprueba tu sesión y conexión e inténtalo de nuevo.", success: "" }; }
}

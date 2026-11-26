"use client";

import { useActionState, useState } from "react";
import WeekdayPicker from "./WeekdayPicker";
import SubmitButton from "./SubmitButton";
import { saveWorkingHours, changeWorkingHoursState } from "@/features/admin/hours-actions";

export type HoursProfessional = { id: string; display_name: string; is_active: boolean; archived_at: string | null };
export type WorkingHours = { id: string; professional_id: string; weekday: number; starts_at: string; ends_at: string; effective_from: string; effective_until: string | null; is_active: boolean; archived_at: string | null };
const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const field = "mt-2 min-h-11 w-full min-w-0 rounded-md border border-brown/30 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brown";
const control = "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";
const button = `${control} border-brown/40 bg-white text-brown hover:border-brown hover:bg-cream`;
const primaryButton = `${control} border-orange bg-orange text-charcoal hover:border-brown hover:bg-brown hover:text-white`;
const dangerButton = `${control} border-brown bg-brown text-white hover:border-charcoal hover:bg-charcoal`;
const initial = { error: "", success: "" };
const date = (value: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date(`${value}T12:00:00Z`));
const time = (value: string) => value.slice(0, 5);

function Editor({ professionals, hour, professionalId = "" }: { professionals: HoursProfessional[]; hour?: WorkingHours; professionalId?: string }) {
  const [state, action, pending] = useActionState(async (previous: typeof initial, form: FormData) => {
    try { return await saveWorkingHours(previous, form); }
    catch { return { error: "No se pudo conectar. Tus datos siguen en el formulario; vuelve a intentarlo.", success: "" }; }
  }, initial);
  const [professional, setProfessional] = useState(professionals.some(p => p.id === professionalId && p.is_active && !p.archived_at) ? professionalId : "");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [start, setStart] = useState(hour ? time(hour.starts_at) : "");
  const [end, setEnd] = useState(hour ? time(hour.ends_at) : "");
  const [from, setFrom] = useState(hour?.effective_from ?? "");
  const [until, setUntil] = useState(hour?.effective_until ?? "");
  return <form action={action} className="mt-5" aria-busy={pending}>
    {hour && <input type="hidden" name="id" value={hour.id} />}
    <fieldset disabled={pending} className="grid min-w-0 gap-5 sm:grid-cols-2">
      {!hour && <><label className="text-sm font-semibold">Profesional<select name="professional_id" required value={professional} onChange={e => setProfessional(e.target.value)} className={field}><option value="">Selecciona un profesional</option>{professionals.filter(p => p.is_active && !p.archived_at).map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label><WeekdayPicker value={weekdays} onChange={setWeekdays} /></>}
      {hour && <p className="text-sm text-brown sm:col-span-2">Editando el turno del {days[hour.weekday-1].toLowerCase()}. El profesional y el día se conservan; para otro día, crea un turno nuevo.</p>}
      <label className="text-sm font-semibold">Hora de inicio<input type="time" step="60" name="starts_at" required value={start} onChange={e => setStart(e.target.value)} className={field} /></label>
      <label className="text-sm font-semibold">Hora de fin<input type="time" step="60" name="ends_at" required value={end} onChange={e => setEnd(e.target.value)} className={field} /></label>
      <label className="text-sm font-semibold">Vigente desde<input type="date" name="effective_from" required value={from} onChange={e => setFrom(e.target.value)} className={field} /></label>
      <label className="text-sm font-semibold">Vigente hasta (opcional)<input type="date" name="effective_until" value={until} onChange={e => setUntil(e.target.value)} className={field} /><span className="mt-2 block text-xs font-normal leading-relaxed text-brown">La fecha final no se incluye. Déjala vacía si el turno no tiene fecha de fin.</span></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><SubmitButton>{hour ? "Guardar cambios del turno" : "Crear horarios"}</SubmitButton><p className="text-xs text-brown">Las horas corresponden a Lima. El turno debe terminar el mismo día.</p></div>
    </fieldset>
    {state.error && <p role="alert" className="mt-4 text-sm font-semibold text-orange-text">{state.error}</p>}
    {state.success && <p role="status" className="mt-4 text-sm font-semibold text-brown">{state.success}</p>}
  </form>;
}

function HourActions({ hour, onSaved }: { hour: WorkingHours; onSaved: (message: string) => void }) {
  const [state, action, pending] = useActionState(async (previous: typeof initial, form: FormData) => {
    try { const result = await changeWorkingHoursState(previous, form); if (result.success) onSaved(result.success); return result; }
    catch { return { error: "No se pudo conectar. Vuelve a intentarlo; no se confirmó el cambio.", success: "" }; }
  }, initial);
  const [confirm, setConfirm] = useState(false);
  return <form action={action} className="mt-3" aria-busy={pending}>
    <input type="hidden" name="id" value={hour.id} />
    <div className="flex flex-wrap gap-2">
      <button type="submit" name="operation" value={hour.archived_at || !hour.is_active ? "activate" : "deactivate"} disabled={pending} className={button}>{pending ? "Actualizando…" : hour.archived_at ? "Restaurar turno" : hour.is_active ? "Desactivar" : "Activar"}</button>
      {!hour.archived_at && <button type="button" disabled={pending} className={`${control} border-transparent text-brown underline underline-offset-4 hover:border-brown/30 hover:bg-cream`} aria-expanded={confirm} onClick={() => setConfirm(!confirm)}>Eliminar turno</button>}
    </div>
    {confirm && !hour.archived_at && <div className="mt-4 rounded-md bg-cream p-4"><p className="text-sm font-semibold">¿Eliminar el turno del {days[hour.weekday-1].toLowerCase()}, de {time(hour.starts_at)} a {time(hour.ends_at)}?</p><p className="mt-2 text-sm leading-relaxed text-brown">Dejará de ofrecerse para nuevas reservas. Se conserva el historial y podrás restaurarlo desde «Ver turnos desactivados y eliminados». Si tiene citas o retenciones futuras, el cambio será rechazado.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={pending} className={button} onClick={() => setConfirm(false)}>Conservar turno</button><button type="submit" name="operation" value="archive" disabled={pending} className={dangerButton}>{pending ? "Eliminando…" : "Sí, eliminar turno"}</button></div></div>}
    {state.error && <p role="alert" className="mt-3 text-sm font-semibold text-orange-text">{state.error}</p>}
    {state.success && <p role="status" className="mt-3 text-sm text-brown">{state.success}</p>}
  </form>;
}

function status(hour: WorkingHours, today: string) {
  if (hour.archived_at) return "Eliminado";
  if (!hour.is_active) return "Desactivado";
  if (hour.effective_until && hour.effective_until <= today) return "Vencido";
  if (hour.effective_from > today) return "Próximo";
  return "Vigente";
}

export default function WorkingHoursManager({ professionals, hours, today }: { professionals: HoursProfessional[]; hours: WorkingHours[]; today: string }) {
  const [professional, setProfessional] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [creating, setCreating] = useState(hours.length === 0);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const visible = hours.filter(h => showInactive || h.is_active && !h.archived_at);
  const groups = professionals.filter(p => (!professional || p.id === professional) && (!p.archived_at || hours.some(h => h.professional_id === p.id)));
  const canCreate = professionals.some(p => p.is_active && !p.archived_at);
  return <div className="mt-7 min-w-0 space-y-7">
    {notice && <p role="status" className="rounded-md border border-brown/20 bg-white p-4 text-sm font-semibold text-brown">{notice}</p>}
    <div className="flex flex-wrap items-end justify-between gap-4"><label className="w-full text-sm font-semibold sm:w-72">Ver horarios de<select value={professional} onChange={e => setProfessional(e.target.value)} className={field}><option value="">Todos los profesionales</option>{professionals.map(p => <option key={p.id} value={p.id}>{p.display_name}{p.is_active && !p.archived_at ? "" : " (inactivo)"}</option>)}</select></label><button type="button" disabled={!canCreate} onClick={() => setCreating(!creating)} aria-expanded={creating} aria-controls="working-hours-create" className={primaryButton}>{creating ? "Cerrar formulario" : "Nuevo horario"}</button></div>
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-brown"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />Ver turnos desactivados y eliminados</label>
    {!canCreate && <p className="text-sm text-brown">Para crear horarios, activa o registra un profesional en el apartado Profesionales.</p>}
    {creating && canCreate && <section id="working-hours-create" className="rounded-xl border border-brown/20 bg-white p-5 sm:p-6"><h2 className="font-heading text-2xl font-bold uppercase">Crear turnos de trabajo</h2><p className="mt-2 text-sm leading-relaxed text-brown">Selecciona varios días para repetir el mismo turno. Para un segundo turno o una jornada distinta, crea otro horario.</p><Editor key={professional || "all"} professionals={professionals} professionalId={professional} /></section>}
    <div className="space-y-6">{groups.map(p => {
      const all = hours.filter(h => h.professional_id === p.id);
      const shown = visible.filter(h => h.professional_id === p.id);
      return <section key={p.id} aria-label={`Horarios de ${p.display_name}`} className="overflow-hidden rounded-xl border border-brown/20 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brown bg-brown px-5 py-5 text-white sm:px-6">
          <div className="min-w-0">
            <h2 id={`professional-${p.id}`} className="break-words font-heading text-3xl font-bold uppercase">{p.display_name}</h2>
            <p className="mt-1 text-sm text-cream">{p.archived_at ? "Profesional archivado" : !p.is_active ? "Profesional inactivo" : "Profesional activo"} · {all.filter(h => h.is_active && !h.archived_at).length} turnos habilitados</p>
          </div>
          <span className="rounded-full border border-orange/60 px-3 py-1 text-xs text-cream">Hora de Lima</span>
        </header>
        <p id={`week-help-${p.id}`} className="border-b border-brown/20 bg-cream px-5 py-3 text-xs leading-relaxed text-brown sm:px-6">Semana de lunes a domingo. Si no ves todos los días, desliza horizontalmente para consultar el resto.</p>
        <div role="region" aria-labelledby={`professional-${p.id}`} aria-describedby={`week-help-${p.id}`} tabIndex={0} className="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brown">
          <div className="grid min-w-[70rem] grid-cols-7 gap-px bg-brown/25">
            {days.map((day, index) => {
              const turns = shown.filter(h => h.weekday === index+1).sort((a,b) => a.starts_at.localeCompare(b.starts_at) || a.effective_from.localeCompare(b.effective_from));
              return <section key={day} className="min-w-0 bg-white">
                <h3 className={`border-b border-brown/25 px-4 py-4 text-center text-sm font-semibold ${turns.length ? "bg-cream-deep text-charcoal" : "bg-cream text-brown"}`}>{day}</h3>
                <div className="min-h-44 space-y-5 p-4">
                  {turns.length ? turns.map(h => {
                    const currentStatus = status(h,today);
                    const badge = currentStatus === "Vigente" ? "border-brown bg-brown text-white" : currentStatus === "Próximo" ? "border-orange bg-orange text-charcoal" : "border-brown/30 bg-cream text-brown";
                    return <div key={h.id} className="min-w-0 border-b border-brown/20 pb-5 last:border-b-0 last:pb-0">
                      <p className="whitespace-nowrap text-base font-semibold tabular-nums">{time(h.starts_at)} – {time(h.ends_at)}</p>
                      <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs ${badge}`}>{currentStatus}</span>
                      <p className="mt-3 text-xs leading-relaxed text-brown">Desde {date(h.effective_from)}<br />{h.effective_until ? `Hasta antes del ${date(h.effective_until)}` : "Sin fecha de fin"}</p>
                      {!h.archived_at && <button type="button" aria-expanded={editing === h.id} aria-controls={`edit-turn-${h.id}`} onClick={() => setEditing(editing === h.id ? null : h.id)} className={`${primaryButton} mt-4 w-full`}>{editing === h.id ? "Cerrar edición" : "Editar turno"}</button>}
                      <HourActions hour={h} onSaved={setNotice} />
                    </div>;
                  }) : <p className="text-sm leading-relaxed text-brown">{all.some(h => h.weekday===index+1) && !showInactive ? "Sin turnos habilitados. Puedes consultar los desactivados." : "Sin turno configurado"}</p>}
                </div>
              </section>;
            })}
          </div>
        </div>
        {shown.filter(h => h.id === editing && !h.archived_at).map(h => <section key={h.id} id={`edit-turn-${h.id}`} aria-label={`Editar turno del ${days[h.weekday-1]}`} className="border-t border-brown/30 bg-cream p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-heading text-2xl font-bold uppercase">Editar horario · {days[h.weekday-1]}</h3><button type="button" className={button} onClick={() => setEditing(null)}>Cerrar edición</button></div>
          <Editor professionals={professionals} hour={h} />
        </section>)}
      </section>;
    })}</div>
    {!groups.length && <p role="status" className="rounded-xl border border-brown/20 bg-white p-6 text-sm text-brown">No hay profesionales para mostrar con este filtro.</p>}
  </div>;
}

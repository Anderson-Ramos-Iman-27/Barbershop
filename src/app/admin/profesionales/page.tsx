import { connection } from "next/server";
import ActionNotice from "@/components/admin/ActionNotice";
import ArchiveForm from "@/components/admin/ArchiveForm";
import SubmitButton from "@/components/admin/SubmitButton";
import { archiveProfessional, saveProfessional } from "@/features/admin/actions";
import { getAdminDashboardData } from "@/features/admin/queries";
import { createClient } from "@/lib/supabase/server";
import type { AdminProfessional, AdminService } from "@/features/admin/types";

export const instant = false;
const input = "mt-1 min-h-11 w-full rounded-md border border-brown/30 bg-white px-3 py-2 font-sans text-sm focus-visible:outline-2 focus-visible:outline-orange-text";

function Editor({ professional, services, selected }: { professional?: AdminProfessional; services: AdminService[]; selected: string[] }) {
  return <form action={saveProfessional} className="grid gap-4 sm:grid-cols-2">
    {professional && <input type="hidden" name="id" value={professional.id} />}
    <label className="font-sans text-sm font-semibold">Nombre visible<input className={input} name="display_name" maxLength={120} defaultValue={professional?.displayName} required /></label>
    <label className="font-sans text-sm font-semibold">Orden<input className={input} type="number" name="sort_order" min="0" defaultValue={professional?.sortOrder ?? 0} /></label>
    <label className="font-sans text-sm font-semibold sm:col-span-2">Presentación<textarea className={input} name="bio" rows={3} defaultValue={professional?.bio ?? ""} /></label>
    <fieldset className="sm:col-span-2"><legend className="font-sans text-sm font-semibold">Servicios que puede realizar</legend><div className="mt-2 flex flex-wrap gap-4">{services.filter(s => !s.archivedAt).map(s => <label key={s.id} className="font-sans text-sm"><input type="checkbox" name="service_ids" value={s.id} defaultChecked={selected.includes(s.id)} /> {s.name}</label>)}</div></fieldset>
    <div className="flex flex-wrap gap-5 sm:col-span-2"><label className="font-sans text-sm"><input type="checkbox" name="active" defaultChecked={professional?.isActive} /> Activo</label><label className="font-sans text-sm"><input type="checkbox" name="published" defaultChecked={professional?.isPublished} /> Visible públicamente</label></div>
    <div className="sm:col-span-2"><SubmitButton>{professional ? "Guardar profesional" : "Crear profesional"}</SubmitButton></div>
  </form>;
}

export default async function AdminProfessionalsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const [data, params, { data: relations }] = await Promise.all([getAdminDashboardData(["professionals", "services"]), searchParams, supabase.from("professional_services").select("professional_id, service_id, is_active")]);
  return <section>
    <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text">Equipo</p>
    <h1 className="mt-3 font-heading text-5xl font-bold uppercase leading-[0.9]">Profesionales</h1>
    <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-brown">Gestiona quién está disponible para cada servicio. Las cuentas de clientes no están vinculadas a estos perfiles.</p>
    <ActionNotice saved={params.saved} error={params.error} />
    <details data-admin-editor className="mt-8 rounded-xl border border-brown/20 bg-white p-5" open={data.professionals.length === 0}><summary className="cursor-pointer font-heading text-2xl font-bold uppercase">Nuevo profesional</summary><div className="mt-5"><Editor services={data.services} selected={[]} /></div></details>
    <div className="mt-7 grid gap-4">{data.professionals.filter(p => !p.archivedAt).map(p => <article data-admin-card key={p.id} className="rounded-xl border border-brown/20 bg-white p-5"><div data-admin-card-header className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-heading text-2xl font-bold uppercase">{p.displayName}</h2><p className="font-sans text-xs text-brown">{p.isPublished ? "Visible" : p.isActive ? "Activo, sin publicar" : "Borrador"}</p></div><ArchiveForm action={archiveProfessional} id={p.id} subject={p.displayName} /></div><details data-admin-edit className="mt-4 border-t border-brown/15 pt-4"><summary className="cursor-pointer font-sans text-sm font-semibold">Editar profesional</summary><div className="mt-5"><Editor professional={p} services={data.services} selected={(relations ?? []).filter(r => r.professional_id === p.id && r.is_active).map(r => r.service_id)} /></div></details></article>)}</div>
  </section>;
}

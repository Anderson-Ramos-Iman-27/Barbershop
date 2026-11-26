import { connection } from "next/server";
import ActionNotice from "@/components/admin/ActionNotice";
import ArchiveForm from "@/components/admin/ArchiveForm";
import SubmitButton from "@/components/admin/SubmitButton";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { archiveService, saveService } from "@/features/admin/actions";
import { getAdminDashboardData } from "@/features/admin/queries";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
const input = "mt-1 min-h-11 w-full rounded-md border border-brown/30 bg-white px-3 py-2 font-sans text-sm focus-visible:outline-2 focus-visible:outline-orange-text";
type ServiceEditor = { id: string; name: string; description: string | null; pricePenCentavos: number | null; durationMinutes: number | null; imagePath: string | null; imageAlt: string | null; isActive: boolean; isPublished: boolean; sortOrder: number };

function Editor({ service, modes }: { service?: ServiceEditor; modes: string[] }) {
  return <form action={saveService} className="grid gap-4 sm:grid-cols-2">
    {service && <input type="hidden" name="id" value={service.id} />}
    <label className="font-sans text-sm font-semibold">Nombre<input className={input} name="name" defaultValue={service?.name} maxLength={120} required /></label>
    <label className="font-sans text-sm font-semibold">Precio base (PEN)<input className={input} name="price" type="text" inputMode="decimal" placeholder="Por definir" defaultValue={service?.pricePenCentavos ? (service.pricePenCentavos / 100).toFixed(2) : ""} /></label>
    <label className="font-sans text-sm font-semibold sm:col-span-2">Descripción<textarea className={input} name="description" rows={3} defaultValue={service?.description ?? ""} /></label>
    <ImageUploadField label="Fotografía del servicio" inputClassName={input} currentFileName={service?.imagePath} />
    <label className="font-sans text-sm font-semibold sm:col-span-2">Descripción de la imagen<input className={input} name="image_alt" defaultValue={service?.imageAlt ?? ""} maxLength={300} placeholder="Describe la fotografía para lectores de pantalla" /></label>
    <label className="font-sans text-sm font-semibold">Duración (minutos)<input className={input} name="duration" type="number" min="1" defaultValue={service?.durationMinutes ?? ""} /></label>
    <label className="font-sans text-sm font-semibold">Orden<input className={input} name="sort_order" type="number" min="0" defaultValue={service?.sortOrder ?? 0} /></label>
    <fieldset className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2"><legend className="mb-2 font-sans text-sm font-semibold">Modalidades disponibles</legend><label className="font-sans text-sm"><input type="checkbox" name="mode_local" defaultChecked={modes.includes("local")} /> En local</label><label className="font-sans text-sm"><input type="checkbox" name="mode_domicilio" defaultChecked={modes.includes("domicilio")} /> A domicilio</label></fieldset>
    <div className="flex flex-wrap gap-5 sm:col-span-2"><label className="font-sans text-sm"><input type="checkbox" name="active" defaultChecked={service?.isActive} /> Activo</label><label className="font-sans text-sm"><input type="checkbox" name="published" defaultChecked={service?.isPublished} /> Publicado en la portada</label></div>
    <div className="sm:col-span-2"><SubmitButton>{service ? "Guardar servicio" : "Crear servicio"}</SubmitButton></div>
  </form>;
}

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const [{ services }, params, { data: relations }] = await Promise.all([getAdminDashboardData(["services"]), searchParams, supabase.from("service_modes").select("service_id, mode, is_active")]);
  return <section>
    <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text">Catálogo</p>
    <h1 className="mt-3 font-heading text-5xl font-bold uppercase leading-[0.9]">Servicios</h1>
    <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-brown">Crea borradores, configura modalidades y publica servicios completos en la portada. Archivar conserva las referencias históricas.</p>
    <ActionNotice saved={params.saved} error={params.error} />
    <details data-admin-editor className="mt-8 rounded-xl border border-brown/20 bg-white p-5" open={services.length === 0}><summary className="cursor-pointer font-heading text-2xl font-bold uppercase">Nuevo servicio</summary><div className="mt-5"><Editor modes={[]} /></div></details>
    <div className="mt-7 grid gap-4">{services.filter(s => !s.archivedAt).map(service => <article data-admin-card key={service.id} className="rounded-xl border border-brown/20 bg-white p-5"><div data-admin-card-header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading text-2xl font-bold uppercase">{service.name}</h2><p className="font-sans text-xs text-brown">{service.isPublished ? "Publicado" : service.isActive ? "Activo, sin publicar" : "Borrador"} · {service.pricePenCentavos ? `S/ ${(service.pricePenCentavos / 100).toFixed(2)}` : "Precio pendiente"} · {service.durationMinutes ?? "Duración pendiente"} min</p></div><ArchiveForm action={archiveService} id={service.id} subject={service.name} /></div><details data-admin-edit className="mt-4 border-t border-brown/15 pt-4"><summary className="cursor-pointer font-sans text-sm font-semibold">Editar servicio</summary><div className="mt-5"><Editor service={service} modes={(relations ?? []).filter(r => r.service_id === service.id && r.is_active).map(r => r.mode)} /></div></details></article>)}</div>
  </section>;
}

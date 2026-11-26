import { connection } from "next/server";
import ActionNotice from "@/components/admin/ActionNotice";
import ArchiveForm from "@/components/admin/ArchiveForm";
import SubmitButton from "@/components/admin/SubmitButton";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { archiveGalleryItem, saveGalleryItem } from "@/features/admin/actions";
import { getAdminDashboardData } from "@/features/admin/queries";
import type { AdminGalleryItem } from "@/features/admin/types";

export const instant = false;
const input = "mt-1 min-h-11 w-full rounded-md border border-brown/30 bg-white px-3 py-2 font-sans text-sm focus-visible:outline-2 focus-visible:outline-orange-text";

function Editor({ item }: { item?: AdminGalleryItem }) {
  return <form action={saveGalleryItem} className="grid gap-4 sm:grid-cols-2">
    {item && <input type="hidden" name="id" value={item.id} />}
    <ImageUploadField label="Fotografía oficial" inputClassName={input} required={!item?.storagePath} currentFileName={item?.storagePath} />
    <label className="font-sans text-sm font-semibold sm:col-span-2">Texto alternativo<input className={input} name="alt_text" defaultValue={item?.altText ?? ""} maxLength={300} placeholder="Describe lo que aparece en la fotografía" /></label>
    <label className="font-sans text-sm font-semibold">Pie de foto<input className={input} name="caption" defaultValue={item?.caption ?? ""} maxLength={300} /></label>
    <label className="font-sans text-sm font-semibold">Orden<input className={input} name="sort_order" type="number" min="0" defaultValue={item?.sortOrder ?? 0} /></label>
    <label className="font-sans text-sm sm:col-span-2"><input type="checkbox" name="published" defaultChecked={item?.isPublished} /> Publicar en la portada</label>
    <div className="sm:col-span-2"><SubmitButton>{item ? "Guardar imagen" : "Añadir imagen"}</SubmitButton></div>
  </form>;
}

export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await connection();
  const [{ galleryItems }, params] = await Promise.all([getAdminDashboardData(["galleryItems"]), searchParams]);
  return <section>
    <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-orange-text">Contenido</p>
    <h1 className="mt-3 font-heading text-5xl font-bold uppercase leading-[0.9]">Galería</h1>
    <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-brown">Sube fotografías oficiales, añade texto alternativo y publícalas. Los archivos se guardan en un bucket privado; la portada recibe enlaces temporales.</p>
    <ActionNotice saved={params.saved} error={params.error} />
    <details data-admin-editor className="mt-8 rounded-xl border border-brown/20 bg-white p-5" open={galleryItems.length === 0}><summary className="cursor-pointer font-heading text-2xl font-bold uppercase">Nueva fotografía</summary><div className="mt-5"><Editor /></div></details>
    <div className="mt-7 grid gap-4">{galleryItems.filter(i => !i.archivedAt).map(item => <article data-admin-card key={item.id} className="rounded-xl border border-brown/20 bg-white p-5"><div data-admin-card-header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate font-heading text-2xl font-bold uppercase">{item.altText ?? "Imagen sin descripción"}</h2><p className="break-all font-sans text-xs text-brown">{item.storagePath ?? "Sin archivo"} · {item.isPublished ? "Publicado" : "Borrador"}</p></div><ArchiveForm action={archiveGalleryItem} id={item.id} subject="esta imagen" /></div><details data-admin-edit className="mt-4 border-t border-brown/15 pt-4"><summary className="cursor-pointer font-sans text-sm font-semibold">Editar imagen</summary><div className="mt-5"><Editor item={item} /></div></details></article>)}</div>
  </section>;
}

import { connection } from "next/server";
import { redirect } from "next/navigation";
import ImageUploadField from "@/components/admin/ImageUploadField";
import SubmitButton from "@/components/admin/SubmitButton";
import { getCurrentActor } from "@/features/auth/session";
import { saveProfile } from "@/features/profile/actions";

export const instant = false;
const field = "mt-2 min-h-11 w-full rounded-md border border-brown/30 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brown";
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor) redirect("/login?next=/perfil");
  const params = await searchParams;
  return <section><h2 className="font-heading text-3xl font-bold uppercase">Mi perfil</h2><p className="mt-3 text-sm leading-relaxed text-brown">Actualiza tu nombre, foto y teléfono de contacto para tus próximas citas.</p>
      {params.saved && <p role="status" className="mt-5 rounded-md bg-white p-4 text-sm font-semibold">Tu perfil se guardó correctamente.</p>}
      {params.error && <p role="alert" className="mt-5 rounded-md border border-orange-text bg-white p-4 text-sm">{params.error}</p>}
      <form action={saveProfile} className="mt-6 grid gap-5 rounded-xl border border-brown/20 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <label className="text-sm font-semibold sm:col-span-2">Nombre completo<input name="full_name" autoComplete="name" required maxLength={120} defaultValue={actor.fullName ?? ""} className={field} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Correo electrónico<input type="email" readOnly value={actor.email ?? ""} aria-describedby="profile-email-help" className={`${field} cursor-default bg-cream/50 text-brown`} /><span id="profile-email-help" className="mt-2 block text-xs font-normal text-brown">Tu correo de acceso no se puede modificar.</span></label>
        <label className="text-sm font-semibold sm:col-span-2">Teléfono de contacto (opcional)<input type="tel" name="phone" autoComplete="tel" maxLength={30} defaultValue={actor.phone ?? ""} className={field} /></label>
        <ImageUploadField label={actor.avatarPath ? "Cambiar foto de perfil" : "Foto de perfil"} inputClassName={field} />
        <div className="sm:col-span-2"><SubmitButton>Guardar mi perfil</SubmitButton></div>
      </form>
    </section>;
}

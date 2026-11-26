import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import AddressBook from "@/components/account/AddressBook";
import { getCurrentActor } from "@/features/auth/session";
import { getOwnAddresses } from "@/features/addresses/queries";

export const instant = false;

export default async function AddressesPage() {
  await connection();
  const [actor, result] = await Promise.all([getCurrentActor(), getOwnAddresses().then(data => ({ data, failed: false }), () => ({ data: [], failed: true }))]);
  if (!actor) redirect("/login?next=/direcciones");
  const { data: addresses, failed } = result;
  return <>
    {failed ? <section><h2 className="font-heading text-3xl font-bold uppercase">Mis direcciones</h2><p role="alert" className="mt-4 text-sm text-orange-text">No se pudieron cargar tus direcciones.</p><Link href="/direcciones" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">Volver a intentarlo</Link></section> : <AddressBook addresses={addresses} />}
  </>;
}

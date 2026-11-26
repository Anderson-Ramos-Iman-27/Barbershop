"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AddressFields from "./AddressFields";
import { saveAddress, deleteAddress } from "@/features/addresses/actions";
import { emptyAddress, hasPoint, type AddressDraft, type SavedAddress } from "@/features/addresses/types";

export default function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [value, setValue] = useState<AddressDraft>({ ...emptyAddress });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const button = "inline-flex min-h-11 items-center rounded-md border border-brown/30 px-4 text-sm font-semibold disabled:opacity-50";
  return <section><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="font-heading text-3xl font-bold uppercase">Mis direcciones</h2><button className={button} disabled={pending} onClick={() => { setEditing(null); setValue({ ...emptyAddress }); setMessage(""); setError(""); }}>Agregar dirección</button></div>
    <p className="mt-3 text-sm leading-relaxed text-brown">Guarda el punto de llegada para tus citas a domicilio. Podrás elegir una de estas direcciones al reservar. Cambiarla aquí no modifica citas anteriores.</p>
    {message && <p role="status" className="mt-4 text-sm font-semibold">{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-orange-text">{error}</p>}
    <ul className="mt-5 grid gap-4">{addresses.map(a => <li key={a.id} className="min-w-0 rounded-xl border border-brown/20 bg-white p-5"><p className="break-words text-sm font-semibold">{a.address_line}</p><p className="mt-1 text-sm text-brown">{a.district}</p>{a.reference && <p className="mt-2 break-words text-sm">Referencia: {a.reference}</p>}<div className="mt-3 flex flex-wrap gap-3"><button className={button} disabled={pending} onClick={() => { setEditing(a.id); setValue({ ...a }); setError(""); setMessage(""); }}>Editar</button><button className={button} disabled={pending} onClick={() => setRemoving(removing === a.id ? null : a.id)}>Eliminar</button></div>{removing === a.id && <div className="mt-4 border-t border-brown/20 pt-4"><p className="text-sm">¿Eliminar esta dirección guardada? Las citas existentes conservarán su domicilio.</p><div className="mt-2 flex flex-wrap gap-3"><button className={button} disabled={pending} onClick={() => startTransition(async () => { try { const result = await deleteAddress(a.id); if (result.error) setError(result.error); else { setRemoving(null); if (editing === a.id) setEditing(undefined); setMessage("Dirección eliminada."); router.refresh(); } } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } })}>Confirmar eliminación</button><button className={button} disabled={pending} onClick={() => setRemoving(null)}>Conservar dirección</button></div></div>}</li>)}</ul>
    {!addresses.length && <p className="mt-4 text-sm text-brown">Todavía no tienes direcciones guardadas.</p>}
    {editing !== undefined && <form className="mt-5 rounded-xl border border-brown/20 bg-white p-5 sm:p-7" onSubmit={e => { e.preventDefault(); setError(""); if (!hasPoint(value)) { setError("Selecciona un punto válido para el domicilio."); return; } startTransition(async () => { try { const result = await saveAddress(editing, value); if (result.error) setError(result.error); else { setEditing(undefined); setMessage("Dirección guardada correctamente."); router.refresh(); } } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } }); }}><fieldset disabled={pending}><legend className="mb-5 font-heading text-2xl font-bold uppercase">{editing ? "Editar dirección" : "Nueva dirección"}</legend><AddressFields value={value} onChange={setValue} /><div className="mt-5 flex flex-wrap gap-3"><button className={`${button} border-transparent bg-orange`} type="submit">{pending ? "Guardando…" : "Guardar dirección"}</button><button type="button" className={button} onClick={() => setEditing(undefined)}>Cancelar</button></div></fieldset></form>}
  </section>;
}

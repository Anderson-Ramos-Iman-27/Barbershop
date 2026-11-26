"use client";

import { useFormStatus } from "react-dom";
import FormProgress from "./FormProgress";

function ArchiveSubmit() {
  const { pending } = useFormStatus();
  return <><button disabled={pending} className="inline-flex min-h-11 items-center rounded-md border border-brown/35 bg-cream px-4 font-sans text-sm font-semibold text-brown transition-colors hover:border-orange hover:bg-orange hover:text-charcoal motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-orange-text disabled:cursor-wait disabled:opacity-60" type="submit">{pending ? "Archivando…" : "Archivar"}</button><FormProgress message="Archivando elemento…" /></>;
}

export default function ArchiveForm({ id, subject, action }: { id: string; subject: string; action: (data: FormData) => Promise<void> }) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm(`¿Archivar ${subject}? Dejará de mostrarse públicamente.`)) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><ArchiveSubmit /></form>;
}

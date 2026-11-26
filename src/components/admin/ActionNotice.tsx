export default function ActionNotice({ saved, error }: { saved?: string; error?: string }) {
  if (!saved && !error) return null;
  return <p role={error ? "alert" : "status"} className={`mt-5 rounded-md border px-4 py-3 font-sans text-sm ${error ? "border-orange-text bg-cream text-orange-text" : "border-brown bg-brown text-white"}`}><strong>{error ? "Revisa la operación: " : "Guardado: "}</strong>{error ?? "Cambios guardados correctamente."}</p>;
}

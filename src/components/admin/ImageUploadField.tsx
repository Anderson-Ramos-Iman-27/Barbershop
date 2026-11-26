"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Preview = { url: string; name: string; size: number };

export default function ImageUploadField({ label, inputClassName, required = false, currentFileName }: {
  label: string; inputClassName: string; required?: boolean; currentFileName?: string | null;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const { pending } = useFormStatus();
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview.url);
  }, [preview]);
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => { setPreview(null); setError(""); input.current?.setCustomValidity(""); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  function clear() {
    if (input.current) { input.current.value = ""; input.current.setCustomValidity(""); }
    setPreview(null); setError("");
  }

  return <div className="min-w-0 sm:col-span-2">
    <label htmlFor={id} className="font-sans text-sm font-semibold">{label}</label>
    <input ref={input} id={id} name="image" type="file" accept="image/jpeg,image/png,image/webp" required={required} disabled={pending} aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} aria-invalid={!!error} className={inputClassName} onChange={event => {
      const file = event.target.files?.[0];
      event.target.setCustomValidity(""); setError(""); setPreview(null);
      if (!file) return;
      const invalid = !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0;
      if (invalid) {
        const message = "Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.";
        event.target.value = ""; event.target.setCustomValidity(message); setError(message);
        return;
      }
      setPreview({ url: URL.createObjectURL(file), name: file.name, size: file.size });
    }} />
    <p id={`${id}-help`} className="mt-2 font-sans text-xs text-brown">JPG, PNG o WebP, máximo 5 MB. La imagen se subirá al guardar.</p>
    {currentFileName && !preview && <p className="mt-2 break-all font-sans text-xs text-brown">Archivo actual: {currentFileName}</p>}
    {preview && <figure className="mt-3 flex min-w-0 items-center gap-4">
      <Image src={preview.url} alt="Vista previa de la imagen seleccionada" width={160} height={120} unoptimized className="h-24 w-32 shrink-0 rounded-md bg-cream-deep object-contain" onError={() => { const message = "No se pudo leer esta imagen. Elige otro archivo."; input.current?.setCustomValidity(message); setError(message); }} />
      <figcaption className="min-w-0 font-sans text-xs text-brown"><span className="block font-semibold text-charcoal">Vista previa</span><span className="mt-1 block break-all">{preview.name}</span><span className="mt-1 block">{(preview.size / 1024 / 1024).toFixed(2)} MB</span></figcaption>
    </figure>}
    {error && <p id={`${id}-error`} role="alert" className="mt-2 font-sans text-sm font-semibold text-orange-text">{error}</p>}
    {(preview || error) && <button type="button" onClick={clear} disabled={pending} className="mt-2 min-h-11 font-sans text-xs font-semibold text-brown underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:opacity-60">Quitar selección</button>}
  </div>;
}

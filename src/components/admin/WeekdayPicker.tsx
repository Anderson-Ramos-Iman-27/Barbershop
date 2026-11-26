"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const days = [
  ["Lun", "Lunes"], ["Mar", "Martes"], ["Mié", "Miércoles"],
  ["Jue", "Jueves"], ["Vie", "Viernes"], ["Sáb", "Sábado"], ["Dom", "Domingo"],
] as const;

export default function WeekdayPicker({ value, onChange }: { value?: number[]; onChange?: (value: number[]) => void } = {}) {
  const [localSelected, setSelected] = useState<number[]>([]);
  const selected = value ?? localSelected;
  const group = useRef<HTMLFieldSetElement>(null);
  const { pending } = useFormStatus();
  useEffect(() => {
    const form = group.current?.closest("form");
    const reset = () => { if (!onChange) setSelected([]); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [onChange]);
  return <fieldset ref={group} disabled={pending} className="min-w-0">
    <legend className="text-sm font-semibold">Días de trabajo</legend>
    <div className="mt-3 flex flex-wrap gap-2">
      {days.map(([short, full], index) => {
        const value = index + 1;
        return <label key={value} title={full} className="relative cursor-pointer">
          <input type="checkbox" name="weekdays" value={value} checked={selected.includes(value)} required={index === 0 && selected.length === 0} onChange={event => { const next = event.target.checked ? [...selected, value] : selected.filter(day => day !== value); if (onChange) onChange(next); else setSelected(next); }} className="peer sr-only" />
          <span className="sr-only">{full}</span>
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full border border-brown/30 bg-white text-xs font-semibold text-brown transition-colors hover:border-brown peer-checked:border-orange peer-checked:bg-orange peer-checked:text-charcoal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brown peer-disabled:cursor-wait peer-disabled:opacity-60">{short}</span>
        </label>;
      })}
    </div>
    <p className="mt-2 text-xs leading-relaxed text-brown">El mismo turno se aplicará a todos los días seleccionados.</p>
  </fieldset>;
}

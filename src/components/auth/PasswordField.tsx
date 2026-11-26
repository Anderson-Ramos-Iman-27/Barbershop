"use client";

import { useState } from "react";

interface PasswordFieldProps {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  autoComplete: string;
}

export default function PasswordField({
  id,
  label,
  name,
  placeholder,
  autoComplete,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="font-sans text-xs font-semibold text-charcoal">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-md border border-brown/25 bg-transparent px-3 pr-12 font-sans text-sm text-charcoal outline-none transition-colors placeholder:text-brown/80 focus:border-orange focus:ring-1 focus:ring-orange"
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center text-brown transition-colors hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-orange"
          aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={isVisible}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.7">
            <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

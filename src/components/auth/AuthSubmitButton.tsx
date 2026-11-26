"use client";

import { useFormStatus } from "react-dom";

interface AuthSubmitButtonProps {
  children: string;
  pendingLabel: string;
}

export default function AuthSubmitButton({
  children,
  pendingLabel,
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-orange px-5 py-3 font-sans text-sm font-semibold text-charcoal transition-[background-color,transform] duration-150 hover:brightness-95 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

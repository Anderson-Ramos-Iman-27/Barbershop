"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Supabase can return OAuth failures in the fragment, which a server cannot read. */
export default function OAuthReturnPage() {
  const router = useRouter();
  useEffect(() => {
    const current = new URL(window.location.href);
    const fragment = new URLSearchParams(current.hash.slice(1));
    const target = new URL("/auth/callback", current.origin);
    for (const name of ["next", "code", "error", "error_code", "error_description"]) {
      const value = current.searchParams.get(name) ?? fragment.get(name);
      if (value) target.searchParams.set(name, value);
    }
    router.replace(target.pathname + target.search);
  }, [router]);
  return <main className="flex min-h-dvh items-center justify-center bg-cream px-5 text-charcoal"><p role="status" className="font-sans text-sm">Completando el acceso con Google…</p></main>;
}

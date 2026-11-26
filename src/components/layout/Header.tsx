"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import Container from "@/components/ui/Container";

const navigationItems = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/#services-title" },
  { label: "Galería", href: "/#gallery-title" },
  { label: "Nosotros", href: "/#about-title" },
  { label: "Contacto", href: "/#contact-title" },
] as const;

const drawerId = "mobile-navigation";

export default function Header({ isAdmin = false, isAuthenticated = false, avatarUrl = null }: { isAdmin?: boolean; isAuthenticated?: boolean; avatarUrl?: string | null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef(true);

  const closeAfterNavigation = () => {
    restoreFocusRef.current = false;
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        return;
      }
      if (event.key === "Tab") {
        const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (restoreFocusRef.current) menuButton?.focus({ preventScroll: true });
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-brown/20 bg-cream">
      <Container className="flex min-h-[72px] items-center justify-between gap-6 py-3 lg:min-h-24 lg:py-5">
        <Link href="/" aria-label="Barbería Original Wave — volver al inicio" className="inline-flex min-h-11 shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">
          <Image
            src="/images/branding/logo_barberia_o_wave_header.png"
            alt="Barbería Original Wave"
            width={2172}
            height={724}
            sizes="(min-width: 1280px) 176px, (min-width: 640px) 144px, 128px"
            className="h-auto w-32 sm:w-36 xl:w-44"
          />
        </Link>

        <nav aria-label="Navegación principal" className="hidden lg:block">
          <ul className="flex items-center gap-6 xl:gap-8">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-sans text-sm font-medium text-brown underline-offset-4 transition-colors hover:text-charcoal hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {isAdmin ? (
            <Link href="/admin" className="font-sans text-sm font-semibold text-brown underline-offset-4 transition-colors hover:text-charcoal hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">
              Dashboard
            </Link>
          ) : null}
          <Link href={isAuthenticated ? "/perfil" : "/login"} className="inline-flex min-h-11 items-center gap-2 font-sans text-sm font-semibold text-brown underline-offset-4 transition-colors hover:text-charcoal hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">
            {isAuthenticated && avatarUrl && <Image src={avatarUrl} alt="" width={32} height={32} unoptimized className="size-8 rounded-full object-cover" />}
            {isAuthenticated ? "Mi perfil" : "Iniciar sesión"}
          </Link>
          <Link href="/reservar" className="inline-flex min-h-11 items-center justify-center rounded-full bg-orange px-6 py-3 font-sans text-sm font-semibold text-charcoal">
            Reservar cita
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <Link href="/reservar" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-orange px-4 py-2 font-sans text-xs font-semibold text-charcoal">
            Reservar
          </Link>
          <button ref={menuButtonRef} type="button" aria-controls={drawerId} aria-expanded={isMenuOpen} aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} onClick={() => { restoreFocusRef.current = true; setIsMenuOpen((isOpen) => !isOpen); }} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-charcoal text-white transition-[background-color,transform] duration-150 ease-out hover:brightness-125 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown motion-reduce:transform-none">
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {isMenuOpen ? <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /> : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </Container>

      <div aria-hidden="true" className={`fixed inset-0 z-40 bg-charcoal/30 transition-opacity duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] motion-reduce:duration-200 ${isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />

      <aside ref={drawerRef} id={drawerId} aria-label="Menú de navegación móvil" aria-modal="true" aria-hidden={!isMenuOpen} inert={!isMenuOpen} role="dialog" className={`fixed inset-y-0 right-0 z-50 flex w-[min(82vw,20rem)] flex-col bg-cream px-6 pb-8 pt-5 shadow-2xl transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-opacity motion-reduce:duration-200 ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-brown/20 pb-5">
          <p className="font-heading text-2xl font-bold uppercase tracking-[0.08em] text-charcoal">Menú</p>
          <button ref={closeButtonRef} type="button" onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú" className="inline-flex size-10 items-center justify-center rounded-full bg-charcoal text-white transition-[background-color,transform] duration-150 ease-out hover:brightness-125 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown motion-reduce:transform-none">
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <nav aria-label="Navegación móvil" className="pt-8">
          <ul className="space-y-5">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={closeAfterNavigation} className="font-heading text-3xl font-semibold uppercase leading-none text-charcoal underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto border-t border-brown/20 pt-5">
          {isAdmin ? (
            <Link href="/admin" onClick={closeAfterNavigation} className="mb-3 inline-flex min-h-11 w-full items-center font-sans text-sm font-semibold text-charcoal underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">
              Dashboard
            </Link>
          ) : null}
          <Link href={isAuthenticated ? "/perfil" : "/login"} onClick={closeAfterNavigation} className="inline-flex min-h-11 items-center font-sans text-sm font-semibold text-charcoal underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown">
            {isAuthenticated ? "Mi perfil" : "Iniciar sesión"}
          </Link>
        </div>
      </aside>
    </header>
  );
}

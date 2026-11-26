const placeholder = "rounded-md bg-brown/15 motion-safe:animate-pulse motion-reduce:animate-none";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-cream" role="status" aria-label="Cargando página" aria-busy="true">
      <span className="sr-only">Cargando página…</span>
      <div aria-hidden="true">
        <div className="flex h-20 items-center justify-between border-b border-brown/10 px-5 sm:px-8 lg:px-12">
          <div className={`${placeholder} h-8 w-36`} />
          <div className={`${placeholder} h-10 w-28`} />
        </div>
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className={`${placeholder} h-3 w-32`} />
          <div className={`${placeholder} mt-7 h-14 w-full max-w-xl`} />
          <div className={`${placeholder} mt-4 h-14 w-4/5 max-w-lg`} />
          <div className={`${placeholder} mt-8 h-4 w-full max-w-md`} />
          <div className={`${placeholder} mt-3 h-4 w-3/4 max-w-sm`} />
          <div className={`${placeholder} mt-10 h-12 w-40`} />
        </div>
      </div>
    </div>
  );
}

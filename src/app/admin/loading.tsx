const bar = "rounded-md bg-brown/15 motion-safe:animate-pulse motion-reduce:animate-none";

export default function AdminLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando sección del panel" className="w-full" role="status">
      <span className="sr-only">Cargando sección del panel administrativo…</span>
      <div aria-hidden="true">
        <div className={`${bar} h-3 w-28`} />
        <div className={`${bar} mt-5 h-12 w-52 max-w-full`} />
        <div className={`${bar} mt-5 h-4 w-full max-w-xl`} />
        <div className={`${bar} mt-2 h-4 w-3/4 max-w-lg`} />
        <div className="mt-10 rounded-xl border border-brown/15 bg-white p-5 sm:p-7">
          <div className={`${bar} h-7 w-44`} />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className={`${bar} h-14 w-full`} />
            <div className={`${bar} h-14 w-full`} />
            <div className={`${bar} h-24 w-full sm:col-span-2`} />
            <div className={`${bar} h-14 w-full`} />
            <div className={`${bar} h-14 w-full`} />
          </div>
        </div>
      </div>
    </section>
  );
}

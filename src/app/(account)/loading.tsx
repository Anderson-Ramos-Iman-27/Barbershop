export default function AccountLoading() {
  return <section role="status" aria-busy="true" aria-label="Cargando sección de tu cuenta"><span className="sr-only">Cargando sección…</span><div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse"><div className="h-9 w-48 rounded-md bg-brown/15" /><div className="h-4 w-3/4 rounded-md bg-brown/15" /><div className="h-64 rounded-xl border border-brown/20 bg-white" /></div></section>;
}

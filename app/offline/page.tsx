import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#090a08] px-5 py-8 text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#12140f] p-6 shadow-2xl">
        <p className="text-xs font-extrabold tracking-[0.28em] text-[#b7ff00]">TORO</p>
        <h1 className="mt-7 font-heading text-3xl font-semibold tracking-tight">Sin conexión</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          No pudimos abrir esta pantalla sin internet. Volvé a conectarte para continuar.
        </p>
        <Link
          href="/"
          className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-[#b7ff00] px-4 text-sm font-extrabold text-[#080a06]"
        >
          Ir al inicio
        </Link>
      </section>
    </main>
  );
}

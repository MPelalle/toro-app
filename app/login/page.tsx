"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, pin }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos iniciar sesión.");
      window.location.assign(data.redirectTo);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos iniciar sesión.");
    } finally { setPending(false); }
  }

  return <main className="toro-auth-page"><div className="toro-auth-glow toro-auth-glow--lime"/><div className="toro-auth-glow toro-auth-glow--sky"/><section className="toro-auth-card"><Link href="/" className="toro-auth-brand" aria-label="Ir al inicio">TORO</Link><p className="toro-eyebrow">TU ESPACIO PERSONAL</p><h1 className="toro-auth-title">Volvé a tu ritmo.</h1><p className="toro-auth-copy">Entrá para continuar con tus hábitos, nutrición y entrenamiento.</p><form onSubmit={handleSubmit} className="mt-8 space-y-5"><label className="toro-field"><span><Mail size={15}/> Email</span><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hola@ejemplo.com"/></label><label className="toro-field"><span><LockKeyhole size={15}/> PIN de 6 dígitos</span><input type="password" inputMode="numeric" autoComplete="current-password" minLength={6} maxLength={6} required value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" className="toro-pin-input"/></label>{error && <p role="alert" className="toro-form-error">{error}</p>}<button disabled={pending} className="toro-primary-button">{pending ? "Ingresando…" : <>Iniciar sesión <ArrowRight size={17}/></>}</button></form><p className="toro-auth-footer">¿Todavía no tenés una cuenta? <Link href="/sign-in">Crear cuenta</Link></p><p className="mt-4 text-center text-xs leading-5 text-white/35">Para entrar, primero confirmá el enlace enviado a tu correo.</p></section></main>;
}

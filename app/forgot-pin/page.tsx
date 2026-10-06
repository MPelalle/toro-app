"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPinPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); const response = await fetch("/api/auth/forgot-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const data = await response.json(); setMessage(data.message || data.error || "No pudimos procesar la solicitud."); setPending(false); }
  return <main className="toro-auth-page"><section className="toro-auth-card"><p className="toro-eyebrow">RECUPERACIÓN</p><h1 className="toro-auth-title">¿Olvidaste tu PIN?</h1><p className="toro-auth-copy">Te enviaremos un enlace seguro para crear uno nuevo.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="toro-field"><span>Email</span><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{message && <p role="status" className="toro-form-success">{message}</p>}<button disabled={pending} className="toro-primary-button">{pending ? "Enviando…" : "Enviar enlace"}</button></form><p className="toro-auth-footer"><Link href="/login">Volver a iniciar sesión</Link></p></section></main>;
}

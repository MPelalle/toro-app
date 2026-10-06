"use client";
import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPinPage() { return <Suspense><ResetPinForm /></Suspense>; }

function ResetPinForm() {
  const params = useSearchParams(); const [pin, setPin] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const response = await fetch("/api/auth/reset-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token"), pin }) }); const data = await response.json(); if (!response.ok) setError(data.error || "No pudimos actualizar el PIN."); else setMessage(data.message); }
  return <main className="toro-auth-page"><section className="toro-auth-card"><p className="toro-eyebrow">RECUPERACIÓN</p><h1 className="toro-auth-title">Creá tu PIN nuevo.</h1><form onSubmit={submit} className="mt-8 space-y-5"><label className="toro-field"><span>PIN de 6 dígitos</span><input type="password" inputMode="numeric" required minLength={6} maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} className="toro-pin-input" /></label>{message && <p className="toro-form-success">{message} <Link href="/login">Iniciar sesión</Link></p>}{error && <p role="alert" className="toro-form-error">{error}</p>}<button className="toro-primary-button">Actualizar PIN</button></form></section></main>;
}

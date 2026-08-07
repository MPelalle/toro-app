"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { ArrowRight, AtSign, LockKeyhole, Mail } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    pin: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!/^\d{6}$/.test(formData.pin))
      return setError("El PIN debe tener exactamente 6 números.");
    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No pudimos crear tu cuenta.");
      setMessage(data.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos crear tu cuenta.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="toro-auth-page">
      <div className="toro-auth-glow toro-auth-glow--lime" />
      <div className="toro-auth-glow toro-auth-glow--violet" />
      <section className="toro-auth-card">
        <Link href="/" className="toro-auth-brand inline-flex" aria-label="Ir al inicio">
          <Image src="/header.png" alt="TORO" width={40} height={40} priority />
        </Link>
        <p className="toro-eyebrow">EMPEZÁ HOY</p>
        <h1 className="toro-auth-title">Construí tu base.</h1>
        <p className="toro-auth-copy">
          Creá tu cuenta y confirmá tu email para activar tu espacio personal.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="toro-field">
            <span>
              <Mail size={15} /> Email
            </span>
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={formData.email}
              onChange={(event) =>
                setFormData({ ...formData, email: event.target.value })
              }
              placeholder="hola@ejemplo.com"
            />
          </label>
          <label className="toro-field">
            <span>
              <AtSign size={15} /> Nombre de usuario
            </span>
            <input
              autoComplete="username"
              pattern="[a-zA-Z0-9._-]{3,30}"
              minLength={3}
              maxLength={30}
              required
              value={formData.username}
              onChange={(event) =>
                setFormData({ ...formData, username: event.target.value })
              }
              placeholder="ej. toro_user"
            />
          </label>
          <label className="toro-field">
            <span>
              <LockKeyhole size={15} /> PIN de 6 dígitos
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              minLength={6}
              maxLength={6}
              required
              value={formData.pin}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  pin: event.target.value.replace(/\D/g, "").slice(0, 6),
                })
              }
              placeholder="••••••"
              className="toro-pin-input"
            />
          </label>
          {message && (
            <p role="status" className="toro-form-success">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="toro-form-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="toro-primary-button"
          >
            {pending ? (
              "Enviando confirmación…"
            ) : (
              <>
                Crear cuenta <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <p className="toro-auth-footer">
          ¿Ya tenés una cuenta? <Link href="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}

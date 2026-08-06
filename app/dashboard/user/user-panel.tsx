"use client";
/* eslint-disable @next/next/no-img-element */

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Clock3, LogOut, Save, Sparkles, Target, Trash2 } from "lucide-react";
import { clearOfflineUser, syncPendingSessions, unsyncedSyncCount } from "@/lib/offline";
import { deleteAccount, updateProfile } from "./actions";

type UserPanelProps = {
  user: { name: string; email: string; avatarUrl: string; createdAt: string };
  stats: { logins: number; seconds: number; habitCompletions: number; dietLogs: number };
};

export default function UserPanel({ user, stats }: UserPanelProps) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [state, action, pending] = useActionState(async (_: string, data: FormData) => {
    try {
      await updateProfile(data);
      return "Perfil guardado.";
    } catch (error) {
      return error instanceof Error ? error.message : "No se pudo guardar.";
    }
  }, "");

  const hours = Math.floor(stats.seconds / 3600);
  const minutes = Math.floor((stats.seconds % 3600) / 60);
  const initials = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      await syncPendingSessions();
      const pendingChanges = await unsyncedSyncCount();
      if (pendingChanges > 0) {
        const confirmed = window.confirm(
          `Hay ${pendingChanges} cambio${pendingChanges === 1 ? "" : "s"} sin sincronizar. Si cerrás sesión, quedarán guardados y aislados para esta cuenta. ¿Querés continuar?`,
        );
        if (!confirmed) return;
      }

      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión. Revisá tu conexión e intentá de nuevo.");

      await clearOfflineUser(pendingChanges > 0);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
      <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-sky-400/9 blur-3xl toro-breathe" />
      <div className="pointer-events-none absolute -left-24 top-128 h-72 w-72 rounded-full bg-fuchsia-500/[.07] blur-3xl toro-breathe-reverse" />
      <div className="relative mx-auto max-w-4xl">
        <header>
          <p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">TU ESPACIO</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-.06em]">Perfil y progreso.</h1>
          <p className="mt-2 text-sm text-white/40">Tu información, tu evolución y el control de tu cuenta.</p>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <form action={action} className="rounded-[28px] border border-white/8 bg-[#10110e]/95 p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <label className="group relative grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-3xl border border-[#b7ff00]/25 bg-[#b7ff00]/10 text-xl font-bold text-[#b7ff00]">
                {avatar ? <img src={avatar} alt="Foto de perfil" className="h-full w-full object-cover" /> : initials}
                <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition group-hover:opacity-100"><Camera size={20} /></span>
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || file.size > 1_000_000) return;
                  const reader = new FileReader();
                  reader.onload = () => setAvatar(String(reader.result));
                  reader.readAsDataURL(file);
                }} />
              </label>
              <div><p className="font-semibold">Foto de perfil</p><p className="mt-1 text-xs leading-5 text-white/35">PNG, JPG o WebP de hasta 1 MB. Tocá la foto para cambiarla.</p></div>
            </div>
            <input type="hidden" name="avatarUrl" value={avatar} />
            <label className="mt-7 block"><span className="mb-2 block text-xs font-medium text-white/55">Nombre</span><input className="input" name="name" defaultValue={user.name} /></label>
            <label className="mt-5 block"><span className="mb-2 block text-xs font-medium text-white/55">Email</span><input className="input opacity-55" value={user.email} readOnly /></label>
            {state && <p className="mt-3 text-xs text-[#b7ff00]">{state}</p>}
            <button disabled={pending} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b7ff00] px-5 py-3 text-sm font-bold text-black disabled:opacity-50"><Save size={16} />{pending ? "Guardando…" : "Guardar perfil"}</button>
          </form>

          <section className="space-y-3">
            <Stat icon={<Clock3 size={18} />} label="Tiempo en Toro" value={`${hours} h ${minutes} min`} detail="Tiempo registrado mientras usás la aplicación." />
            <Stat icon={<Sparkles size={18} />} label="Ingresos a la app" value={`${stats.logins}`} detail="Sesiones iniciadas con esta cuenta." />
            <Stat icon={<Target size={18} />} label="Hábitos completados" value={`${stats.habitCompletions}`} detail="Registros positivos acumulados." />
            <Stat icon={<Target size={18} />} label="Días de dieta" value={`${stats.dietLogs}`} detail="Días con seguimiento nutricional." />
          </section>
        </div>

        <section className="mt-6 rounded-[28px] border border-white/8 bg-[#10110e]/90 p-5 sm:p-6">
          <p className="text-[10px] font-bold tracking-[.18em] text-white/35">CUENTA</p>
          <p className="mt-2 text-sm text-white/45">Miembro desde {new Date(user.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}.</p>
          {logoutError && <p className="mt-3 text-xs text-red-300">{logoutError}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"><LogOut size={16} />{loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</button>
            <form action={deleteAccount} onSubmit={(event) => { if (!window.confirm("¿Eliminar tu cuenta y todos tus datos? Esta acción no se puede deshacer.")) event.preventDefault(); }}><button className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-400/10"><Trash2 size={16} />Eliminar cuenta</button></form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-white/8 bg-[#10110e]/90 p-4"><div className="flex items-center justify-between text-[#b7ff00]"><span>{icon}</span><span className="text-xl font-semibold text-white">{value}</span></div><p className="mt-4 text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-white/35">{detail}</p></article>;
}

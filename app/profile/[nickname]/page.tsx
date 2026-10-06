import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Dumbbell, ExternalLink, UserRound } from "lucide-react";
import { SharePublicLinkButton } from "@/components/community/SharePublicLinkButton";
import { getPublicCommunityProfile } from "@/lib/public-community-profile";

export const dynamic = "force-dynamic";

function siteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://toro.app";
  try { return new URL(configured); } catch { return new URL("https://toro.app"); }
}

function description(profile: NonNullable<Awaited<ReturnType<typeof getPublicCommunityProfile>>>) {
  const bio = profile.bio?.trim().replace(/\s+/g, " ").slice(0, 120);
  return bio || `Perfil publico de @${profile.nickname} en TORO. Mira sus rutinas publicadas e importalas a tu biblioteca.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nickname: string }>;
}): Promise<Metadata> {
  const { nickname } = await params;
  const profile = await getPublicCommunityProfile(nickname);
  if (!profile) return { title: "Perfil no disponible" };
  const url = new URL(`/profile/${encodeURIComponent(profile.nickname)}`, siteUrl());
  const content = description(profile);
  const image = new URL("/icons/toro-icon-1024.png", siteUrl());
  return {
    title: `@${profile.nickname} | TORO`,
    description: content,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      siteName: "TORO",
      title: `@${profile.nickname} | TORO`,
      description: content,
      url,
      images: [{ url: image, width: 1024, height: 1024, alt: "TORO" }],
    },
    twitter: { card: "summary", title: `@${profile.nickname} | TORO`, description: content, images: [image] },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const profile = await getPublicCommunityProfile(nickname);
  if (!profile) notFound();
  const path = `/profile/${encodeURIComponent(profile.nickname)}`;

  return (
    <main className="min-h-dvh bg-[#090a08] px-4 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs font-bold tracking-[.16em] text-[#b7ff00] hover:text-white">
          TORO
        </Link>
        <header className="mt-8 rounded-[30px] border border-[#b7ff00]/20 bg-[radial-gradient(circle_at_top_right,rgba(183,255,0,.12),transparent_42%),#10110e] p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#b7ff00]/12 text-2xl font-black text-[#b7ff00]">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/75">PERFIL TORO</p>
              <h1 className="mt-1 truncate text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
                {profile.name}
              </h1>
              <p className="mt-1 text-sm text-white/45">@{profile.nickname}</p>
            </div>
          </div>
          {profile.bio ? <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65">{profile.bio}</p> : null}
          <p className="mt-5 text-[11px] text-white/30">
            Perfil publico · {profile.routines.length} {profile.routines.length === 1 ? "rutina publicada" : "rutinas publicadas"}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href={`/dashboard/community/${encodeURIComponent(profile.nickname)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black">
              <UserRound size={16} /> Abrir en TORO <ArrowRight size={15} />
            </Link>
            <SharePublicLinkButton path={path} title={`@${profile.nickname} | TORO`} text={`Mira el perfil de @${profile.nickname} en TORO.`} />
          </div>
        </header>

        <section className="mt-10">
          <div className="flex items-center gap-2">
            <BookOpen size={17} className="text-[#b7ff00]" />
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">RUTINAS PUBLICADAS</p>
              <h2 className="mt-1 text-xl font-semibold">Programas para hacer tuyos</h2>
            </div>
          </div>
          {!profile.routines.length ? (
            <p className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-5 text-center text-sm text-white/40">
              Todavia no hay rutinas publicadas.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {profile.routines.map((routine) => (
                <article key={routine.id} className="rounded-2xl border border-white/[.08] bg-[#10110e] p-5">
                  <Dumbbell size={17} className="text-[#b7ff00]" />
                  <h3 className="mt-4 text-lg font-semibold">{routine.name}</h3>
                  <p className="mt-1 text-xs text-white/45">
                    {routine.type} · {routine.exerciseCount} ejercicios · {routine.setCount} series
                  </p>
                  <p className="mt-2 text-[11px] text-white/30">
                    {routine.days.length ? routine.days.join(" · ") : "Plan flexible"}
                    {routine.importCount ? ` · ${routine.importCount} importaciones` : ""}
                  </p>
                  <Link href={`/routine/${routine.id}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00] hover:text-white">
                    Ver rutina <ExternalLink size={14} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

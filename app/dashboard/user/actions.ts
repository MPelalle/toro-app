"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { deleteCurrentSession, getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser(); if (!user) throw new Error("No autorizado");
  const name = String(formData.get("name") || "").trim(); const avatarUrl = String(formData.get("avatarUrl") || "").trim();
  if (!name || name.length > 60) throw new Error("El nombre debe tener entre 1 y 60 caracteres.");
  if (avatarUrl.length > 1_500_000 || (avatarUrl && !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(avatarUrl))) throw new Error("La foto no es válida.");
  await getPrisma().user.update({ where: { id: user.id }, data: { name, avatarUrl: avatarUrl || null } });
  revalidatePath("/dashboard"); revalidatePath("/dashboard/user");
}

export async function deleteAccount() {
  const user = await getCurrentUser(); if (!user) throw new Error("No autorizado");
  await getPrisma().user.delete({ where: { id: user.id } });
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: new Date(0) });
  redirect("/login");
}

export async function logout() { await deleteCurrentSession(); (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: new Date(0) }); redirect("/login"); }

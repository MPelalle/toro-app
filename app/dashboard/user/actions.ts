"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { deleteCurrentSession, getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { validateNickname } from "@/lib/community";
import { isAvatarUrl } from "@/lib/avatars";

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autorizado");
  const name = String(formData.get("name") || "").trim();
  const nickname = validateNickname(String(formData.get("nickname") || ""));
  const avatarInput = String(formData.get("avatarUrl") || "");
  const avatarUrl = avatarInput ? (isAvatarUrl(avatarInput) ? avatarInput : undefined) : null;
  if (!name || name.length > 60) throw new Error("El nombre debe tener entre 1 y 60 caracteres.");
  if (!nickname) throw new Error("El nickname debe tener entre 3 y 20 caracteres y solo puede usar letras, números, . o _.");
  if (avatarUrl === undefined) throw new Error("El avatar seleccionado no está disponible.");
  try { await getPrisma().user.update({ where: { id: user.id }, data: { name, nickname, avatarUrl } }); }
  catch { throw new Error("Ese nickname ya está en uso."); }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/user");
}

export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autorizado");
  await getPrisma().user.delete({ where: { id: user.id } });
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: new Date(0) });
  redirect("/login");
}

export async function logout() {
  await deleteCurrentSession();
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: new Date(0) });
  redirect("/login");
}

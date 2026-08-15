import { getCurrentUser } from "@/lib/auth";
import { listSocialNotifications, markSocialNotificationsRead } from "@/lib/community";
import { hasTrustedOrigin, originError } from "@/lib/security";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const notifications = await listSocialNotifications(user.id);
  return Response.json({ notifications, unread: notifications.filter((notification) => !notification.readAt).length }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  await markSocialNotificationsRead(user.id);
  return Response.json({ ok: true });
}

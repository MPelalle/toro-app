import { getCurrentUser } from "@/lib/auth";
import { createSocialReport } from "@/lib/social-guard";
import { isSocialReportReason, SOCIAL_LIMITS } from "@/lib/social-policy";
import {
  hasTrustedOrigin,
  isUuid,
  originError,
  rateLimit,
  rateLimitByKey,
  rateLimitResponse,
} from "@/lib/security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const requestLimit = rateLimit(request, "social-report-ip", SOCIAL_LIMITS.reportsPerDay, 24 * 60 * 60_000);
  if (!requestLimit.ok) return rateLimitResponse(requestLimit.retryAfter);
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const userLimit = rateLimitByKey(user.id, "social-report", SOCIAL_LIMITS.reportsPerDay, 24 * 60 * 60_000);
  if (!userLimit.ok) return rateLimitResponse(userLimit.retryAfter);
  const body = await request.json().catch(() => null);
  const targetUserId = body?.targetUserId ? String(body.targetUserId) : null;
  const activityId = body?.activityId ? String(body.activityId) : null;
  if (
    (targetUserId && !isUuid(targetUserId)) ||
    (activityId && !isUuid(activityId)) ||
    !isSocialReportReason(body?.reason)
  ) {
    return Response.json({ error: "Reporte inválido." }, { status: 400 });
  }
  try {
    const result = await createSocialReport(user.id, {
      targetUserId,
      activityId,
      reason: body.reason,
      detail: body.detail,
    });
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar el reporte." },
      { status: 400 },
    );
  }
}

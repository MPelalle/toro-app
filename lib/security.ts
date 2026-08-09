type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** Lightweight protection for authentication endpoints. Use a shared store at scale. */
export function rateLimit(request: Request, scope: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  current.count += 1;
  if (current.count <= limit) return { ok: true };
  return { ok: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "Demasiados intentos. Esperá unos minutos antes de volver a probar." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

function publicRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return requestUrl.origin;

  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || requestUrl.protocol.slice(0, -1);
  return new URL(`${protocol}://${host}`).origin;
}

/** Reject cross-site writes before cookies can be used to mutate account data. */
export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    // APP_URL is the canonical URL for email links, not an origin allowlist.
    return new URL(origin).origin === publicRequestOrigin(request);
  } catch {
    return false;
  }
}

export function originError() {
  return Response.json({ error: "Origen de la solicitud no permitido." }, { status: 403 });
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && storedDateKey(date) === value;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
import { storedDateKey } from "@/lib/app-date";

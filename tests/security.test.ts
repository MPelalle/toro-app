import { afterEach, describe, expect, it, vi } from "vitest";
import { hasTrustedOrigin } from "@/lib/security";

function request(url: string, origin: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers: { origin, ...headers } });
}

describe("hasTrustedOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts the public Vercel domain even when APP_URL is a different canonical domain", () => {
    vi.stubEnv("APP_URL", "https://toro.example.com");
    const incoming = request(
      "https://internal-deployment.vercel.app/api/auth/login",
      "https://toro-git-feature-team.vercel.app",
      { "x-forwarded-host": "toro-git-feature-team.vercel.app", "x-forwarded-proto": "https" },
    );

    expect(hasTrustedOrigin(incoming)).toBe(true);
  });

  it("rejects a request from another origin", () => {
    const incoming = request(
      "https://toro.vercel.app/api/auth/login",
      "https://untrusted.example.com",
      { "x-forwarded-host": "toro.vercel.app", "x-forwarded-proto": "https" },
    );

    expect(hasTrustedOrigin(incoming)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { presenceStatus } from "@/lib/presence";

describe("presencia de amigos", () => {
  const now = new Date("2026-08-09T15:00:00.000Z");

  it("muestra entrenamiento solo si el atleta está activo y su sesión sigue vigente", () => {
    expect(presenceStatus(new Date("2026-08-09T14:59:00.000Z"), new Date("2026-08-09T14:00:00.000Z"), now)).toBe("TRAINING");
  });

  it("no deja una sesión abandonada como entrenando", () => {
    expect(presenceStatus(new Date("2026-08-09T14:59:00.000Z"), new Date("2026-08-09T07:00:00.000Z"), now)).toBe("ONLINE");
  });

  it("marca offline después de la ventana de actividad", () => {
    expect(presenceStatus(new Date("2026-08-09T14:57:00.000Z"), new Date("2026-08-09T14:30:00.000Z"), now)).toBe("OFFLINE");
  });
});

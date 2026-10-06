import { getCurrentUser } from "@/lib/auth";
import { bodyMeasurementFields, bodyWeightTrend } from "@/lib/body-progress";
import { appDateKey, dateAtNoonUTC } from "@/lib/app-date";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, isValidDateKey, originError } from "@/lib/security";

function dateFromKey(value: unknown) {
  const key = String(value || "");
  return isValidDateKey(key) ? dateAtNoonUTC(key) : null;
}

function keyFor(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const prisma = getPrisma();
  const [weights, measurements] = await Promise.all([
    prisma.dietWeightEntry.findMany({
      where: { userId: user.id },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: { id: true, date: true, weight: true, note: true },
    }),
    prisma.bodyMeasurement.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
  ]);
  // Si un usuario tuvo varias dietas, el último pesaje del día es el vigente.
  const uniqueWeights = new Map<
    string,
    { id: string; date: string; weight: number; note: string | null }
  >();
  weights.forEach((entry) =>
    uniqueWeights.set(keyFor(entry.date), {
      ...entry,
      date: keyFor(entry.date),
    }),
  );
  const history = [...uniqueWeights.values()];
  return Response.json(
    {
      weight: bodyWeightTrend(history),
      measurements: measurements.map((item) => ({
        ...item,
        date: keyFor(item.date),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const date = dateFromKey(body?.date);
  if (!body || !date || keyFor(date) > appDateKey())
    return Response.json({ error: "La fecha no es válida." }, { status: 400 });
  const prisma = getPrisma();
  if (body.type === "weight") {
    const weight = Number(body.weight);
    const note = String(body.note || "").trim();
    if (
      !Number.isFinite(weight) ||
      weight < 25 ||
      weight > 500 ||
      note.length > 500
    )
      return Response.json({ error: "El peso no es válido." }, { status: 400 });
    const diet = await prisma.dietPlan.findFirst({
      where: { userId: user.id, kind: "PERSONAL" },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
      select: { id: true },
    });
    if (!diet)
      return Response.json(
        {
          error:
            "Creá una dieta para guardar tu peso en la misma fuente de datos.",
        },
        { status: 400 },
      );
    const entry = await prisma.dietWeightEntry.create({
      data: {
        dietId: diet.id,
        userId: user.id,
        date,
        weight,
        note: note || null,
      },
    });
    return Response.json(
      { ...entry, date: keyFor(entry.date) },
      { status: 201 },
    );
  }
  if (body.type !== "measurement")
    return Response.json(
      { error: "Tipo de registro no válido." },
      { status: 400 },
    );
  const values = Object.fromEntries(
    bodyMeasurementFields.map((field) => {
      const raw = body[field];
      const value =
        raw === null || raw === undefined || raw === "" ? null : Number(raw);
      return [
        field,
        Number.isFinite(value) && value !== null && value >= 10 && value <= 300
          ? value
          : null,
      ];
    }),
  );
  if (
    !Object.values(values).some((value) => value !== null) ||
    String(body.note || "").trim().length > 500
  )
    return Response.json(
      { error: "Ingresá al menos una medida válida." },
      { status: 400 },
    );
  const entry = await prisma.bodyMeasurement.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: {
      userId: user.id,
      date,
      unit: "cm",
      note: String(body.note || "").trim() || null,
      ...values,
    },
    update: {
      unit: "cm",
      note: String(body.note || "").trim() || null,
      ...values,
    },
  });
  return Response.json({ ...entry, date: keyFor(entry.date) }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!isUuid(id))
    return Response.json({ error: "Registro no válido." }, { status: 400 });
  await getPrisma().bodyMeasurement.deleteMany({
    where: { id, userId: user.id },
  });
  return new Response(null, { status: 204 });
}

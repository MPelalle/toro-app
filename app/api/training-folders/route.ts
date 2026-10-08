import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

const kinds = ["PLAN", "MESOCYCLE", "SIX_MONTH_CYCLE"] as const;
type FolderKind = (typeof kinds)[number];

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const folders = await getPrisma().trainingFolder.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      routines: {
        where: { userId: user.id, kind: "PERSONAL" },
        select: { id: true },
      },
    },
  });
  return Response.json(
    folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      kind: folder.kind,
      routineIds: folder.routines.map((routine) => routine.id),
      createdAt: folder.createdAt.toISOString(),
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = cleanName(body?.name);
  const kind = body?.kind;
  if (!name || name.length > 80 || !kinds.includes(kind as FolderKind))
    return Response.json({ error: "Revisá el nombre y tipo de la carpeta." }, { status: 400 });
  const folder = await getPrisma().trainingFolder.create({
    data: { userId: user.id, name, kind: kind as FolderKind },
  });
  return Response.json({ ...folder, createdAt: folder.createdAt.toISOString() }, { status: 201 });
}

/** Asigna o quita una rutina personal de una carpeta. */
export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const routineId = typeof body?.routineId === "string" ? body.routineId : "";
  const folderId = body?.folderId === null ? null : typeof body?.folderId === "string" ? body.folderId : undefined;
  if (!isUuid(routineId) || (folderId !== null && (folderId === undefined || !isUuid(folderId))))
    return Response.json({ error: "Carpeta o rutina inválida." }, { status: 400 });
  const prisma = getPrisma();
  const [routine, folder] = await Promise.all([
    prisma.routinePlan.findFirst({ where: { id: routineId, userId: user.id, kind: "PERSONAL" }, select: { id: true } }),
    folderId ? prisma.trainingFolder.findFirst({ where: { id: folderId, userId: user.id }, select: { id: true } }) : Promise.resolve(true),
  ]);
  if (!routine || !folder) return Response.json({ error: "No encontré esa rutina o carpeta." }, { status: 404 });
  await prisma.routinePlan.update({ where: { id: routineId }, data: { trainingFolderId: folderId } });
  return Response.json({ ok: true, routineId, folderId });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isUuid(id)) return Response.json({ error: "Carpeta inválida." }, { status: 400 });
  await getPrisma().trainingFolder.deleteMany({ where: { id, userId: user.id } });
  return Response.json({ ok: true });
}

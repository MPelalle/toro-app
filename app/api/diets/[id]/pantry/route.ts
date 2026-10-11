import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";
import { shoppingAfterStock, weeklyShopping } from "@/lib/diet-pantry";

async function getContext(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const diet = await getPrisma().dietPlan.findFirst({
    where: { id, OR: [{ userId: user.id, kind: "PERSONAL" }, { kind: "SHARED", members: { some: { userId: user.id } } }] },
    include: { meals: { select: { foods: true }, orderBy: [{ dayOfWeek: "asc" }, { position: "asc" }] } },
  });
  return diet ? { user, diet } : null;
}

function notFound() {
  return Response.json({ error: "Plan no encontrado" }, { status: 404 });
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const result = await getContext(id);
  if (!result) return notFound();

  const items = await getPrisma().dietPantryItem.findMany({ where: { dietId: id, userId: result.user.id }, orderBy: { name: "asc" } });
  const pantry = items.filter((item) => !item.isShopping).map(({ id: itemId, name, quantity, unit }) => ({ id: itemId, name, quantity, unit }));
  const savedShopping = items.filter((item) => item.isShopping).map(({ name, quantity, unit, checked }) => ({ name, quantity, unit, checked }));
  const shopping = savedShopping.length
    ? savedShopping
    : shoppingAfterStock(weeklyShopping(result.diet.meals.map((meal) => ({ foods: Array.isArray(meal.foods) ? meal.foods.filter((food): food is string => typeof food === "string") : [] }))), pantry);
  return Response.json({ pantry, shopping });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return originError();
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const result = await getContext(id);
  if (!result) return notFound();

  const body = await request.json().catch(() => null);
  if (!body || (body.pantry === undefined) === (body.shopping === undefined)) {
    return Response.json({ error: "Indicá el stock o la lista de compras." }, { status: 400 });
  }

  const isShopping = body.shopping !== undefined;
  if (isShopping && (result.diet.userId !== result.user.id)) {
    return Response.json({ error: "Solo quien creó la dieta puede modificar la lista semanal." }, { status: 403 });
  }
  const values: unknown = isShopping ? body.shopping : body.pantry;
  if (!Array.isArray(values) || values.length > 200) return Response.json({ error: "La lista de alimentos no es válida." }, { status: 400 });
  const valid = values.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const value = item as Record<string, unknown>;
    return typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 120
      && Number.isFinite(value.quantity) && Number(value.quantity) >= 0 && Number(value.quantity) <= 1_000_000
      && typeof value.unit === "string" && value.unit.length <= 30
      && (!isShopping || typeof value.checked === "boolean");
  });
  if (!valid) return Response.json({ error: "Revisá los nombres, cantidades y unidades." }, { status: 400 });
  const normalizedNames = values.map((item: { name: string; unit: string }) => `${item.name.trim().toLocaleLowerCase("es")}:${item.unit.trim().toLocaleLowerCase("es")}`);
  if (new Set(normalizedNames).size !== normalizedNames.length) return Response.json({ error: "No repitas alimentos en la lista." }, { status: 400 });

  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.dietPantryItem.deleteMany({ where: { dietId: id, userId: result.user.id, isShopping } });
    for (const item of values as Array<{ name: string; quantity: number; unit: string; checked?: boolean }>) {
      await tx.dietPantryItem.create({
        data: {
          dietId: id,
          userId: result.user.id,
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
          isShopping,
          checked: isShopping ? item.checked === true : false,
        },
      });
    }
  });
  const saved = await prisma.dietPantryItem.findMany({ where: { dietId: id, userId: result.user.id }, orderBy: { name: "asc" } });
  return Response.json({
    pantry: saved.filter((item) => !item.isShopping).map(({ id: itemId, name, quantity, unit }) => ({ id: itemId, name, quantity, unit })),
    shopping: saved.filter((item) => item.isShopping).map(({ name, quantity, unit, checked }) => ({ name, quantity, unit, checked })),
  });
}

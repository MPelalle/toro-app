import type { DietMeal, DietPantryItem, DietShoppingItem } from "@/lib/diet-types";

function parseFood(entry: string) {
  const match = entry.match(/^\s*(\d+(?:\.\d+)?)\s*×\s*(.+?)(?:\s*\(([^()]*)\))?\s*$/);
  if (!match) return null;
  const serving = (match[3] || "").match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  return {
    name: match[2].trim(),
    quantity: Number(match[1]) * (serving ? Number(serving[1]) : 1),
    unit: serving ? serving[2].trim() : "porción",
  };
}

export function weeklyShopping(meals: Array<Pick<DietMeal, "foods">>): DietShoppingItem[] {
  const totals = new Map<string, DietShoppingItem>();
  for (const meal of meals) {
    for (const entry of meal.foods) {
      const item = parseFood(entry);
      if (!item) continue;
      const key = `${item.name.toLocaleLowerCase("es")}:${item.unit.toLocaleLowerCase("es")}`;
      const existing = totals.get(key);
      if (existing) existing.quantity += item.quantity;
      else totals.set(key, { ...item, checked: false });
    }
  }
  return [...totals.values()].map((item) => ({ ...item, quantity: Math.round(item.quantity * 10) / 10 }));
}

export function shoppingAfterStock(
  shopping: DietShoppingItem[],
  pantry: DietPantryItem[],
  previous: DietShoppingItem[] = [],
): DietShoppingItem[] {
  return shopping.map((item) => {
    const stock = pantry.find((entry) => entry.name.toLocaleLowerCase("es") === item.name.toLocaleLowerCase("es")
      && entry.unit.toLocaleLowerCase("es") === item.unit.toLocaleLowerCase("es"))?.quantity || 0;
    const saved = previous.find((entry) => entry.name.toLocaleLowerCase("es") === item.name.toLocaleLowerCase("es")
      && entry.unit.toLocaleLowerCase("es") === item.unit.toLocaleLowerCase("es"));
    return { ...item, quantity: Math.max(0, item.quantity - stock), checked: saved?.checked ?? false };
  }).filter((item) => item.quantity > 0);
}

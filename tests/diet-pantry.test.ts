import { describe, expect, it } from "vitest";
import { shoppingAfterStock, weeklyShopping } from "@/lib/diet-pantry";

describe("weekly diet shopping list", () => {
  it("aggregates ingredient servings from every weekday into their base units", () => {
    const meals = Array.from({ length: 7 }, () => ({ foods: ["2 × Pollo (100 g)", "1 × Huevo (1 u)"] }));

    expect(weeklyShopping(meals)).toEqual([
      { name: "Pollo", quantity: 1400, unit: "g", checked: false },
      { name: "Huevo", quantity: 7, unit: "u", checked: false },
    ]);
  });

  it("subtracts matching stock, omits covered ingredients, and preserves checked items", () => {
    const required = [
      { name: "Pollo", quantity: 700, unit: "g", checked: false },
      { name: "Huevo", quantity: 12, unit: "u", checked: false },
    ];
    const stock = [
      { id: "1", name: "pollo", quantity: 500, unit: "G" },
      { id: "2", name: "Huevo", quantity: 12, unit: "u" },
    ];
    const previous = [{ name: "Pollo", quantity: 100, unit: "g", checked: true }];

    expect(shoppingAfterStock(required, stock, previous)).toEqual([
      { name: "Pollo", quantity: 200, unit: "g", checked: true },
    ]);
  });
});

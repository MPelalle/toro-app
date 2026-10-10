import { describe, expect, it } from "vitest";
import { parseRoutineNoteInline, parseRoutineNotes } from "@/lib/routine-notes";

describe("anotaciones de rutinas", () => {
  it("convierte el formato en línea seguro en nodos de texto estilizados", () => {
    expect(
      parseRoutineNoteInline(
        "**Fuerte** *controlado* ~~evitar~~ [[color:#b7ff00]]verde[[/color]] [[size:large]]importante[[/size]]",
      ),
    ).toEqual([
      { type: "bold", children: [{ type: "text", value: "Fuerte" }] },
      { type: "text", value: " " },
      { type: "italic", children: [{ type: "text", value: "controlado" }] },
      { type: "text", value: " " },
      { type: "strike", children: [{ type: "text", value: "evitar" }] },
      { type: "text", value: " " },
      {
        type: "color",
        value: "#b7ff00",
        children: [{ type: "text", value: "verde" }],
      },
      { type: "text", value: " " },
      {
        type: "size",
        value: "large",
        children: [{ type: "text", value: "importante" }],
      },
    ]);
  });

  it("interpreta títulos, párrafos, sangría, listas y separadores estilo README", () => {
    expect(
      parseRoutineNotes(
        "## Antes de empezar\n\nCalentá bien.\nAumentá el peso gradualmente.\n\n> Mantené la técnica.\n\n- Controlá la carga\n- Descansá 2 min\n\n---",
      ),
    ).toEqual([
      { type: "heading", level: 2, value: "Antes de empezar" },
      { type: "paragraph", value: "Calentá bien. Aumentá el peso gradualmente." },
      { type: "quote", value: "Mantené la técnica." },
      { type: "unordered", value: "Controlá la carga" },
      { type: "unordered", value: "Descansá 2 min" },
      { type: "divider" },
    ]);
  });

  it("mantiene etiquetas HTML como texto, sin convertirlas en contenido ejecutable", () => {
    expect(parseRoutineNoteInline("<script>alert(1)</script>")).toEqual([
      { type: "text", value: "<script>alert(1)</script>" },
    ]);
  });
});

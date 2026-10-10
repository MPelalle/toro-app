export type RoutineNoteInline =
  | { type: "text"; value: string }
  | { type: "bold"; children: RoutineNoteInline[] }
  | { type: "italic"; children: RoutineNoteInline[] }
  | { type: "strike"; children: RoutineNoteInline[] }
  | { type: "color"; value: string; children: RoutineNoteInline[] }
  | { type: "size"; value: string; children: RoutineNoteInline[] };

export type RoutineNoteBlock =
  | { type: "paragraph" | "quote" | "unordered" | "ordered"; value: string }
  | { type: "heading"; level: number; value: string }
  | { type: "divider" };

const inlinePattern =
  /(\*\*.+?\*\*|~~.+?~~|\*.+?\*|_[^_]+_|\[\[color:#[\da-f]{6}\]\].+?\[\[\/color\]\]|\[\[size:(?:small|large)\]\].+?\[\[\/size\]\])/gi;

export function parseRoutineNoteInline(value: string): RoutineNoteInline[] {
  return value.split(inlinePattern).filter(Boolean).map((part) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return { type: "bold", children: parseRoutineNoteInline(part.slice(2, -2)) };
    if (part.startsWith("~~") && part.endsWith("~~"))
      return { type: "strike", children: parseRoutineNoteInline(part.slice(2, -2)) };
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))
      return { type: "italic", children: parseRoutineNoteInline(part.slice(1, -1)) };
    const color = part.match(/^\[\[color:(#[\da-f]{6})\]\](.+)\[\[\/color\]\]$/i);
    if (color)
      return {
        type: "color",
        value: color[1],
        children: parseRoutineNoteInline(color[2]),
      };
    const size = part.match(/^\[\[size:(small|large)\]\](.+)\[\[\/size\]\]$/i);
    if (size)
      return {
        type: "size",
        value: size[1].toLowerCase(),
        children: parseRoutineNoteInline(size[2]),
      };
    return { type: "text", value: part };
  });
}

export function parseRoutineNotes(value: string): RoutineNoteBlock[] {
  const blocks: RoutineNoteBlock[] = [];
  const lines = value.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (/^(---+|\*\*\*+|___+)$/.test(line)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, value: heading[2] });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", value: quoteLines.join(" ") });
      continue;
    }
    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      blocks.push({ type: "unordered", value: unordered[1] });
      index += 1;
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      blocks.push({ type: "ordered", value: ordered[1] });
      index += 1;
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3}\s+|>\s?|[-*+]\s+|\d+\.\s+|---+$|\*\*\*+$|___+$)/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", value: paragraph.join(" ") });
  }

  return blocks;
}

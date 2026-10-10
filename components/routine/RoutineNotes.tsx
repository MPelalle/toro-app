"use client";

import { useRef, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
import {
  Bold,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Strikethrough,
} from "lucide-react";
import {
  parseRoutineNoteInline,
  parseRoutineNotes,
  type RoutineNoteInline,
} from "@/lib/routine-notes";

const colors = ["#b7ff00", "#60a5fa", "#f87171", "#facc15", "#e879f9"];

function renderInline(nodes: RoutineNoteInline[], keyPrefix: string) {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text") return node.value;
    const children = renderInline(node.children, key);
    if (node.type === "bold") return <strong key={key}>{children}</strong>;
    if (node.type === "italic") return <em key={key}>{children}</em>;
    if (node.type === "strike") return <del key={key}>{children}</del>;
    if (node.type === "color")
      return (
        <span key={key} style={{ color: node.value }}>
          {children}
        </span>
      );
    return (
      <span
        key={key}
        className={node.value === "large" ? "text-xl font-semibold" : "text-xs"}
      >
        {children}
      </span>
    );
  });
}

export function RoutineNotes({ value }: { value: string }) {
  const blocks = parseRoutineNotes(value);
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const elements: ReactNode[] = [];
  const flushList = () => {
    if (!list) return;
    const Tag = list.type;
    elements.push(
      <Tag key={`list-${elements.length}`} className="my-3 list-inside space-y-1 pl-4">
        {list.items.map((item, index) => (
          <li key={index}>{renderInline(parseRoutineNoteInline(item), `list-${index}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  blocks.forEach((block, index) => {
    if (block.type === "unordered" || block.type === "ordered") {
      const type = block.type === "unordered" ? "ul" : "ol";
      if (list?.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push(block.value);
      return;
    }
    flushList();
    if (block.type === "divider") {
      elements.push(<hr key={index} className="my-5 border-white/15" />);
    } else if (block.type === "heading") {
      const content = renderInline(parseRoutineNoteInline(block.value), `block-${index}`);
      const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
      elements.push(
        <Tag key={index} className="mb-3 mt-6 border-b border-white/10 pb-2 text-lg font-semibold first:mt-0">
          {content}
        </Tag>,
      );
    } else if (block.type === "quote") {
      const content = renderInline(parseRoutineNoteInline(block.value), `block-${index}`);
      elements.push(
        <blockquote key={index} className="my-3 border-l-2 border-[#b7ff00]/60 pl-4 text-white/60">
          {content}
        </blockquote>,
      );
    } else {
      const content = renderInline(parseRoutineNoteInline(block.value), `block-${index}`);
      elements.push(
        <p key={index} className="my-3 leading-7 first:mt-0 last:mb-0">
          {content}
        </p>,
      );
    }
  });
  flushList();

  return (
    <section className="mt-8 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5 sm:p-7">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b7ff00]/75">
        Anotaciones de la rutina
      </p>
      <article className="mt-4 break-words text-sm text-white/80">
        {elements}
      </article>
    </section>
  );
}

export function RoutineNotesEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const applyFormat = (before: string, after = "", placeholder = "tu texto") => {
    const field = textarea.current;
    if (!field) return;
    const { selectionStart: start, selectionEnd: end } = field;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };
  const applyLinePrefix = (prefix: string, remove = false) => {
    const field = textarea.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEnd = value.indexOf("\n", end);
    const rangeEnd = lineEnd === -1 ? value.length : lineEnd;
    const selected = value.slice(lineStart, rangeEnd);
    const updated = selected
      .split("\n")
      .map((line) => remove ? line.replace(/^(?:> ?| {2})/, "") : `${prefix}${line}`)
      .join("\n");
    onChange(`${value.slice(0, lineStart)}${updated}${value.slice(rangeEnd)}`);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(lineStart, lineStart + updated.length);
    });
  };
  const buttons = [
    { label: "Negrita", icon: <Bold size={15} />, format: "bold" },
    { label: "Cursiva", icon: <Italic size={15} />, format: "italic" },
    { label: "Tachado", icon: <Strikethrough size={15} />, format: "strike" },
    { label: "Texto grande", icon: <Heading2 size={15} />, format: "large" },
    { label: "Texto pequeño", icon: <span className="text-xs font-bold">A</span>, format: "small" },
    { label: "Título", icon: <Heading2 size={15} />, format: "heading" },
    { label: "Cita o sangría", icon: <IndentIncrease size={15} />, format: "indent" },
    { label: "Quitar sangría", icon: <IndentDecrease size={15} />, format: "outdent" },
    { label: "Lista", icon: <List size={15} />, format: "list" },
    { label: "Lista numerada", icon: <ListOrdered size={15} />, format: "ordered" },
    { label: "Separador", icon: <Minus size={15} />, format: "divider" },
    { label: "Nuevo párrafo", icon: <Pilcrow size={15} />, format: "paragraph" },
  ];
  const handleToolbarClick = (event: MouseEvent<HTMLButtonElement>) => {
    switch (event.currentTarget.dataset.format) {
      case "bold": applyFormat("**", "**"); break;
      case "italic": applyFormat("*", "*"); break;
      case "strike": applyFormat("~~", "~~"); break;
      case "large": applyFormat("[[size:large]]", "[[/size]]"); break;
      case "small": applyFormat("[[size:small]]", "[[/size]]"); break;
      case "heading": applyLinePrefix("## "); break;
      case "indent": applyLinePrefix("> "); break;
      case "outdent": applyLinePrefix("", true); break;
      case "list": applyLinePrefix("- "); break;
      case "ordered": applyLinePrefix("1. "); break;
      case "divider": applyFormat("\n---\n", "", ""); break;
      case "paragraph": applyFormat("\n\n", "", ""); break;
    }
  };
  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFormat(`[[color:${event.currentTarget.value}]]`, "[[/color]]");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 p-2">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            title={button.label}
            aria-label={button.label}
            onClick={handleToolbarClick}
            data-format={button.format}
            className="grid h-9 min-w-9 place-items-center rounded-lg px-2 text-white/65 hover:bg-white/10 hover:text-white"
          >
            {button.icon}
          </button>
        ))}
        <span className="mx-1 h-6 border-l border-white/10" />
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            title={`Aplicar color ${color}`}
            aria-label={`Aplicar color ${color}`}
            onClick={() => applyFormat(`[[color:${color}]]`, "[[/color]]")}
            className="h-5 w-5 rounded-full border border-white/30"
            style={{ backgroundColor: color }}
          />
        ))}
        <label className="ml-1 flex h-9 items-center gap-2 rounded-lg px-2 text-[11px] text-white/50">
          Otro
          <input
            type="color"
            aria-label="Elegir color de texto"
            defaultValue="#b7ff00"
            onChange={handleColorChange}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
      </div>
      <textarea
        ref={textarea}
        className="input min-h-40 w-full resize-y rounded-none border-0 bg-transparent"
        maxLength={2000}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribí indicaciones. Seleccioná el texto y aplicale formato desde la barra…"
      />
      <div className="flex items-center justify-between gap-3 border-t border-white/[.07] px-3 py-2">
        <span className="text-[11px] text-white/35">Vista previa con formato estilo README de GitHub</span>
        <span className="text-[11px] text-white/35">{value.length}/2000</span>
      </div>
    </div>
  );
}

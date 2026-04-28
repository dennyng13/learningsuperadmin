import { useEditor, EditorContent, Editor, Extension, Mark, mergeAttributes } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import FontSize from "@tiptap/extension-font-size";
import Heading from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useEffect, useCallback, useId, useRef, useState } from "react";

/**
 * Clean text pasted from Word/PDF/Google Docs:
 * - normalize smart quotes → straight quotes
 * - remove non-breaking spaces (\u00A0)
 * - collapse runs of whitespace inside a line into one space
 * - trim each line, preserve line breaks
 */
function cleanPastedText(input: string): string {
  const normalized = input
    // Smart quotes / curly quotes → straight
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    // Other typographic chars
    .replace(/[\u2013\u2014]/g, "-") // en/em dash → hyphen
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " "); // NBSP → space

  return normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").replace(/\s+$/g, "").replace(/^[ \t]+/, ""))
    .join("\n");
}

/**
 * TipTap Mark extension that wraps selected text as a blank answer.
 * Renders as <span class="ielts-blank" data-blank-num="1">text</span>
 */
const BlankMark = Mark.create({
  name: "blankMark",
  
  addAttributes() {
    return {
      "data-blank-num": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-blank-num"),
        renderHTML: (attributes) => ({
          "data-blank-num": attributes["data-blank-num"],
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span.ielts-blank" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "ielts-blank" }, HTMLAttributes), 0];
  },
});

/**
 * TipTap extension that highlights [blank_x] shortcodes (backward compat)
 * with colored decorations for easy identification.
 */
const BlankHighlight = Extension.create({
  name: "blankHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blankHighlight"),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const regex = /\[blank_(\d+)\]/g;

            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              let match: RegExpExecArray | null;
              while ((match = regex.exec(node.text)) !== null) {
                const from = pos + match.index;
                const to = from + match[0].length;
                decorations.push(
                  Decoration.inline(from, to, {
                    class: "blank-shortcode-highlight",
                    "data-blank-num": match[1],
                    style: "cursor: pointer;",
                  })
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

import { cn } from "@shared/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  List, ListOrdered, Table as TableIcon, Plus, Trash2, Minus,
  FormInput, Type, Heading1, Heading2, Heading3, Highlighter, Sigma,
} from "lucide-react";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];

/** Special character set commonly needed in IELTS / academic content. */
const SPECIAL_CHARS: { char: string; label: string }[] = [
  { char: "€", label: "Euro" },
  { char: "£", label: "Pound" },
  { char: "¥", label: "Yen" },
  { char: "$", label: "Dollar" },
  { char: "°", label: "Degree" },
  { char: "±", label: "Plus-minus" },
  { char: "÷", label: "Divide" },
  { char: "×", label: "Multiply" },
  { char: "≤", label: "Less or equal" },
  { char: "≥", label: "Greater or equal" },
  { char: "≠", label: "Not equal" },
  { char: "≈", label: "Approximately" },
  { char: "→", label: "Right arrow" },
  { char: "←", label: "Left arrow" },
  { char: "↑", label: "Up arrow" },
  { char: "↓", label: "Down arrow" },
  { char: "•", label: "Bullet" },
  { char: "–", label: "En dash" },
  { char: "—", label: "Em dash" },
  { char: "©", label: "Copyright" },
  { char: "®", label: "Registered" },
  { char: "™", label: "Trademark" },
  { char: "§", label: "Section" },
  { char: "¶", label: "Paragraph" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  showHeadings?: boolean;
  /** Called when a blank is created from highlighted text. Returns the selected text as the answer. */
  onBlankCreated?: (blankNumber: number, selectedText: string) => void;
  /**
   * Optional unique scope id for this editor instance. Used to namespace blank-answer DOM ids
   * so multiple editors on the same page (e.g. several passages) don't collide.
   * If omitted, a stable React useId is used.
   */
  scopeId?: string;
  /**
   * Optional starting blank number for this editor (default 1). When numbering blanks
   * across multiple passages of the same test, pass the running offset so the blanks
   * created here continue the global sequence (passage 1 ends at 7 → passage 2 starts at 8).
   */
  blankStart?: number;
}

function ToolbarButton({
  active, onClick, children, title, disabled,
}: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
        active && "bg-primary/10 text-primary",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

function Toolbar({ editor, showHeadings, onBlankCreated, blankStart = 1 }: { editor: Editor; showHeadings?: boolean; onBlankCreated?: (blankNumber: number, selectedText: string) => void; blankStart?: number }) {
  const insertBlank = useCallback(() => {
    const html = editor.getHTML();
    // Count existing blanks from both formats
    const markNums = (html.match(/data-blank-num="(\d+)"/g) || []).map(m => parseInt(m.match(/\d+/)?.[0] || "0"));
    const shortcodeNums = (html.match(/\[blank_(\d+)\]/g) || []).map(m => parseInt(m.match(/\d+/)?.[0] || "0"));
    const allNums = [...markNums, ...shortcodeNums];
    // Continue numbering from blankStart so multiple passages / question
    // groups keep their own running sequence. Including `blankStart - 1`
    // in the max guarantees the first blank inserted into a group with
    // no blanks yet always uses blankStart, even if the editor still
    // contains stale [blank_N] shortcodes pasted from another group.
    const next = Math.max(...allNums, blankStart - 1) + 1;

    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      // Wrap selected text with BlankMark
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      editor.chain().focus().setMark("blankMark", { "data-blank-num": String(next) }).run();
      if (selectedText.trim() && onBlankCreated) {
        onBlankCreated(next, selectedText.trim());
      }
    } else {
      // No selection: insert old-style shortcode as fallback
      editor.chain().focus().insertContent(`[blank_${next}]`).run();
    }
  }, [editor, onBlankCreated, blankStart]);

  return (
    <div className="sticky top-0 z-20 flex items-center gap-0.5 flex-wrap border-b bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/70 px-2 py-1.5 rounded-t-xl">
      {/* Headings */}
      {showHeadings && (
        <>
          <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarDivider />
        </>
      )}

      {/* Font Size */}
      <select
        value={editor.getAttributes("textStyle").fontSize || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        className="h-6 text-[10px] bg-transparent border border-border rounded px-1 text-muted-foreground focus:outline-none"
        title="Font Size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <ToolbarDivider />

      {/* Formatting */}
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript">
        <SuperscriptIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript">
        <SubscriptIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Table */}
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert Table"
      >
        <TableIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      {editor.isActive("table") && (
        <>
          <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column">
            <span className="text-[10px] font-bold flex items-center gap-0.5"><Plus className="h-2.5 w-2.5" />Col</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row">
            <span className="text-[10px] font-bold flex items-center gap-0.5"><Plus className="h-2.5 w-2.5" />Row</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Column">
            <span className="text-[10px] font-bold flex items-center gap-0.5 text-destructive"><Minus className="h-2.5 w-2.5" />Col</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Row">
            <span className="text-[10px] font-bold flex items-center gap-0.5 text-destructive"><Minus className="h-2.5 w-2.5" />Row</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </ToolbarButton>
        </>
      )}

      <ToolbarDivider />

      {/* Blank — highlight text to create blank */}
      <ToolbarButton
        active={editor.isActive("blankMark")}
        onClick={insertBlank}
        title="Bôi đen chữ rồi bấm để tạo ô trống (đáp án = chữ được bôi)"
      >
        <span className="flex items-center gap-1 text-[10px] font-bold">
          <Highlighter className="h-3.5 w-3.5" /> Blank
        </span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Special characters dropdown */}
      <SymbolMenu editor={editor} />
    </div>
  );
}

function SymbolMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <ToolbarButton
        active={open}
        onClick={() => setOpen((v) => !v)}
        title="Chèn ký tự đặc biệt (€ £ ° ± × ÷ → ≤ ≥ ...)"
      >
        <span className="flex items-center gap-1 text-[10px] font-bold">
          <Sigma className="h-3.5 w-3.5" /> Symbol
        </span>
      </ToolbarButton>
      {open && (
        <div className="absolute z-30 mt-1 left-0 w-56 grid grid-cols-6 gap-0.5 rounded-lg border bg-popover p-2 shadow-lg">
          {SPECIAL_CHARS.map(({ char, label }) => (
            <button
              key={char}
              type="button"
              title={label}
              onClick={() => {
                editor.chain().focus().insertContent(char).run();
                setOpen(false);
              }}
              className="h-8 w-8 flex items-center justify-center text-base rounded hover:bg-primary/10 hover:text-primary text-foreground"
            >
              {char}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "120px",
  showHeadings = false,
  onBlankCreated,
  scopeId,
  blankStart = 1,
}: RichTextEditorProps) {
  const fallbackScope = useId().replace(/[:]/g, "");
  const scope = scopeId || fallbackScope;
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Superscript,
      Subscript,
      BlankHighlight,
      BlankMark,
      TextStyle,
      FontSize,
      Heading.configure({ levels: [1, 2, 3] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-3 py-2",
          "prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1",
          "[&_table]:border-collapse [&_table]:w-full",
          "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-sm",
          "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-sm [&_th]:font-bold [&_th]:bg-muted/50",
        ),
        style: `min-height: ${minHeight}`,
        spellcheck: "true",
      },
      handlePaste: (view, event) => {
        const cb = event.clipboardData;
        if (!cb) return false;
        const text = cb.getData("text/plain");
        if (!text) return false;
        // Strip rich formatting from PDF/Word, normalize whitespace + smart quotes.
        const cleaned = cleanPastedText(text);
        event.preventDefault();
        const { state, dispatch } = view;
        const lines = cleaned.split(/\n/);
        let tr = state.tr.deleteSelection();
        lines.forEach((line, idx) => {
          if (idx > 0) tr = tr.split(tr.selection.from);
          if (line) tr = tr.insertText(line);
        });
        dispatch(tr);
        return true;
      },
      handleKeyDown: (_view, event) => {
        // Block browser's default for Cmd/Ctrl+B (bookmarks bar) but
        // let TipTap's bold keymap continue via return false.
        if ((event.metaKey || event.ctrlKey) && (event.key === "b" || event.key === "B")) {
          event.preventDefault();
        }
        return false;
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    // Only update if the content actually differs (avoid cursor jump)
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  /**
   * Hard-block Cmd/Ctrl+B at the capture phase so the browser never sees it
   * (some browsers / extensions toggle the bookmarks bar before TipTap's
   * handleKeyDown gets a chance to preventDefault). TipTap still bolds
   * because we manually invoke its command.
   */
  useEffect(() => {
    if (!editor) return;
    const node = containerRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        e.stopPropagation();
        editor.chain().focus().toggleBold().run();
      }
    };
    node.addEventListener("keydown", onKey, true);
    return () => node.removeEventListener("keydown", onKey, true);
  }, [editor]);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const blankEl = target.closest("[data-blank-num]");
    if (!blankEl) return;
    const num = blankEl.getAttribute("data-blank-num");
    if (!num) return;
    // Look up the answer-key input for THIS editor only. Falling back to
    // the unscoped `blank-answer-${num}` would pick the first matching
    // input in DOM order, which could belong to a different passage /
    // question group (see "edit blank in Passage 2 jumps to Passage 1").
    const input = document.getElementById(`blank-answer-${scope}-${num}`);
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.classList.add("blank-answer-flash");
      setTimeout(() => input.classList.remove("blank-answer-flash"), 1200);
      setTimeout(() => input.focus(), 300);
    }
  }, [scope]);

  if (!editor) return null;

  return (
    <div ref={containerRef} className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <Toolbar editor={editor} showHeadings={showHeadings} onBlankCreated={onBlankCreated} blankStart={blankStart} />
      <div className="relative" onClick={handleEditorClick}>
        <EditorContent editor={editor} />
        {placeholder && editor.isEmpty && (
          <div className="absolute top-0 left-0 right-0 px-3 py-2 text-xs text-muted-foreground/50 pointer-events-none truncate">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

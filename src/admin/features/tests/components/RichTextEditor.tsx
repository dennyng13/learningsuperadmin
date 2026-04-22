import { useEditor, EditorContent, Editor, Extension, Mark, mergeAttributes } from "@tiptap/react";
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
import { useEffect, useCallback } from "react";
import { useId, useRef } from "react";

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
  FormInput, Type, Heading1, Heading2, Heading3, Highlighter,
} from "lucide-react";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  showHeadings?: boolean;
  /** Called when a blank is created from highlighted text. Returns the selected text as the answer. */
  onBlankCreated?: (blankNumber: number, selectedText: string) => void;
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

function Toolbar({ editor, showHeadings, onBlankCreated }: { editor: Editor; showHeadings?: boolean; onBlankCreated?: (blankNumber: number, selectedText: string) => void }) {
  const insertBlank = useCallback(() => {
    const html = editor.getHTML();
    // Count existing blanks from both formats
    const markNums = (html.match(/data-blank-num="(\d+)"/g) || []).map(m => parseInt(m.match(/\d+/)?.[0] || "0"));
    const shortcodeNums = (html.match(/\[blank_(\d+)\]/g) || []).map(m => parseInt(m.match(/\d+/)?.[0] || "0"));
    const allNums = [...markNums, ...shortcodeNums];
    const next = allNums.length > 0 ? Math.max(...allNums) + 1 : 1;

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
  }, [editor, onBlankCreated]);

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b bg-muted/30 px-2 py-1.5 rounded-t-xl">
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
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, className, minHeight = "120px", showHeadings = false, onBlankCreated }: RichTextEditorProps) {
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

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const blankEl = target.closest("[data-blank-num]");
    if (!blankEl) return;
    const num = blankEl.getAttribute("data-blank-num");
    if (!num) return;
    const input = document.getElementById(`blank-answer-${num}`);
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.classList.add("blank-answer-flash");
      setTimeout(() => input.classList.remove("blank-answer-flash"), 1200);
      setTimeout(() => input.focus(), 300);
    }
  }, []);

  if (!editor) return null;

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <Toolbar editor={editor} showHeadings={showHeadings} onBlankCreated={onBlankCreated} />
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

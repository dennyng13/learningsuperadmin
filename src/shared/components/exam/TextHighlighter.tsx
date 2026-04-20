import { useState, useCallback, useRef, useEffect } from "react";
import { Highlighter, X, StickyNote, Bookmark } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface Highlight {
  id: string;
  text: string;
  color: string;
}

const HIGHLIGHT_COLORS = [
  { name: "yellow", class: "bg-yellow-200/70" },
  { name: "green", class: "bg-emerald-200/70" },
  { name: "blue", class: "bg-sky-200/70" },
  { name: "pink", class: "bg-pink-200/70" },
];

export interface NoteEntry {
  id: string;
  sourceText: string;
  annotation: string;
}

interface TextHighlighterProps {
  children: React.ReactNode;
  className?: string;
  onAddToNotes?: (entry: NoteEntry) => void;
  onNoteClick?: (noteId: string) => void;
  onSaveText?: (text: string) => void;
  onHighlight?: (text: string) => void;
}

export function TextHighlighter({ children, className, onAddToNotes, onNoteClick, onSaveText, onHighlight }: TextHighlighterProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const selectionRangeRef = useRef<Range | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    selectionRangeRef.current = range.cloneRange();
    setSelectedText(text);
    setToolbarPos({
      x: Math.min(rect.left + rect.width / 2 - containerRect.left, containerRect.width - 100),
      y: rect.top - containerRect.top - 44,
    });
    setShowToolbar(true);
  }, []);

  const applyHighlight = useCallback((color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    try {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.className = `exam-highlight-mark ${color} rounded-sm px-0.5 cursor-pointer transition-opacity hover:opacity-70`;
      const id = `hl-${Date.now()}`;
      span.dataset.highlightId = id;
      span.addEventListener("click", () => removeHighlight(id));
      range.surroundContents(span);

      setHighlights((prev) => [
        ...prev,
        { id, text: selectedText, color },
      ]);
      onHighlight?.(selectedText);
    } catch {
      // Selection spans multiple elements
    }

    selection.removeAllRanges();
    setShowToolbar(false);
    setSelectedText("");
    selectionRangeRef.current = null;
  }, [selectedText]);

  const handleAddToNotes = useCallback(() => {
    if (!onAddToNotes || !selectedText) return;

    const noteId = `note-${Date.now()}`;
    const range = selectionRangeRef.current;

    // Try to wrap the selected text with a note marker
    if (range) {
      try {
        const span = document.createElement("span");
        span.className = "exam-note-mark border-b-2 border-dashed border-primary/60 relative cursor-pointer";
        span.dataset.noteId = noteId;
        span.title ="Đã ghi chú";

        // Add a small note icon indicator
        const indicator = document.createElement("span");
        indicator.className = "exam-note-indicator inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold ml-0.5 align-super cursor-pointer";
        indicator.textContent ="";
        indicator.dataset.noteId = noteId;

        range.surroundContents(span);
        span.appendChild(indicator);
      } catch {
        // Can't wrap across elements - still add the note without marker
      }
    }

    const entry: NoteEntry = {
      id: noteId,
      sourceText: selectedText,
      annotation: "",
    };

    onAddToNotes(entry);
    window.getSelection()?.removeAllRanges();
    setShowToolbar(false);
    setSelectedText("");
    selectionRangeRef.current = null;
  }, [onAddToNotes, selectedText]);

  const removeHighlight = useCallback((id: string) => {
    const el = document.querySelector(`[data-highlight-id="${id}"]`);
    if (el && el.parentNode) {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    highlights.forEach((h) => removeHighlight(h.id));
    setHighlights([]);
  }, [highlights, removeHighlight]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowToolbar(false);
      }
    };
    if (showToolbar) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showToolbar]);

  // Handle clicks on note markers
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onNoteClick) return;
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-note-id]");
      if (target) {
        e.stopPropagation();
        onNoteClick(target.getAttribute("data-note-id")!);
      }
    };
    container.addEventListener("click", handler);
    return () => container.removeEventListener("click", handler);
  }, [onNoteClick]);

  return (
    <div
      ref={containerRef}
      className={cn("relative select-text", className)}
      onMouseUp={handleMouseUp}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: "text", userSelect: "text" }}
    >
      {children}

      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-30 flex items-center gap-1 bg-card border rounded-full px-2 py-1.5 shadow-lg animate-fade-in"
          style={{ left: toolbarPos.x, top: toolbarPos.y, transform: "translateX(-50%)" }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => applyHighlight(c.class)}
              className={cn("w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/30 transition-all", c.class)}
              title={`Highlight ${c.name}`}
            />
          ))}
          {onAddToNotes && (
            <>
              <div className="w-px h-4 bg-border mx-0.5" />
              <button
                onClick={handleAddToNotes}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Add to notes"
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {onSaveText && (
            <>
              <div className="w-px h-4 bg-border mx-0.5" />
              <button
                onClick={() => {
                  onSaveText(selectedText);
                  window.getSelection()?.removeAllRanges();
                  setShowToolbar(false);
                  setSelectedText("");
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Lưu để học sau"
              >
                <Bookmark className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => { setShowToolbar(false); window.getSelection()?.removeAllRanges(); }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {highlights.length > 0 && (
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Clear all highlights"
          >
            <Highlighter className="h-3 w-3" />
            {highlights.length}
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

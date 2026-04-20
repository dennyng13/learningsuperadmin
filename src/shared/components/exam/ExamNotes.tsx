import { useState, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
import { StickyNote, X, Minimize2, Maximize2, Trash2, Navigation } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { NoteEntry } from "./TextHighlighter";

interface ExamNotesProps {
  className?: string;
  onNoteSaved?: (sourceText: string, annotation: string) => void;
}

export interface ExamNotesRef {
  addNote: (entry: NoteEntry) => void;
  openToNote: (noteId: string) => void;
}

type Tab = "list" | "free";

export const ExamNotes = forwardRef<ExamNotesRef, ExamNotesProps>(
  ({ className, onNoteSaved }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [notes, setNotes] = useState<NoteEntry[]>([]);
    const [freeText, setFreeText] = useState("");
    const [activeTab, setActiveTab] = useState<Tab>("list");
    const [editingId, setEditingId] = useState<string | null>(null);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
      addNote: (entry: NoteEntry) => {
        setNotes((prev) => [...prev, entry]);
        onNoteSaved?.(entry.sourceText, entry.annotation);
        setIsOpen(true);
        setIsMinimized(false);
        setActiveTab("list");
      },
      openToNote: (noteId: string) => {
        setIsOpen(true);
        setIsMinimized(false);
        setActiveTab("list");
        // Scroll to the note in the list after render
        setTimeout(() => {
          const el = document.querySelector(`[data-note-list-id="${noteId}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("exam-note-flash");
            setTimeout(() => el.classList.remove("exam-note-flash"), 1500);
          }
        }, 100);
      },
    }));

    const scrollToNote = useCallback((noteId: string) => {
      // First try: find the note marker in DOM (may be removed by React re-render)
      let el: Element | null = document.querySelector(`[data-note-id="${noteId}"]`);

      // Fallback: find the passage/question container that contains the source text
      if (!el) {
        const note = notes.find((n) => n.id === noteId);
        if (note?.sourceText) {
          // Search in passage or question containers
          const containers = document.querySelectorAll(
            ".exam-passage, [class*='question-'], .exam-content"
          );
          for (const container of containers) {
            if (container.textContent?.includes(note.sourceText.slice(0, 30))) {
              el = container;
              break;
            }
          }
        }
      }

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("exam-note-flash");
        setTimeout(() => el!.classList.remove("exam-note-flash"), 1500);
      }
    }, [notes]);

    const removeNote = useCallback((noteId: string) => {
      // Remove the marker from the DOM
      const el = document.querySelector(`span[data-note-id="${noteId}"]`);
      if (el && el.parentNode) {
        // Remove indicator
        const indicator = el.querySelector(".exam-note-indicator");
        if (indicator) indicator.remove();
        // Unwrap the span
        const parent = el.parentNode;
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (editingId === noteId) setEditingId(null);
    }, [editingId]);

    const updateAnnotation = useCallback((noteId: string, annotation: string) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, annotation } : n))
      );
    }, []);

    const totalCount = notes.length + (freeText.trim() ? 1 : 0);

    return (
      <div
        onMouseEnter={() => {
          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
          hoverTimeout.current = setTimeout(() => { setIsOpen(true); setIsMinimized(false); }, 300);
        }}
        onMouseLeave={() => {
          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
          if (!editingId) {
            hoverTimeout.current = setTimeout(() => setIsMinimized(true), 400);
          }
        }}
        className={cn(
          "fixed z-40 transition-all duration-300 ease-in-out flex flex-col",
          isOpen && !isMinimized
            ? "bottom-4 right-4 w-80 sm:w-96 h-80 sm:h-96 bg-card border rounded-xl shadow-2xl"
            : "bottom-4 right-4 w-11 h-11",
          className
        )}
      >
        {/* Collapsed: just the icon */}
        {(!isOpen || isMinimized) && (
          <button
            onClick={() => { setIsOpen(true); setIsMinimized(false); }}
            className={cn(
              "w-11 h-11 rounded-full bg-primary text-primary-foreground",
              "flex items-center justify-center shadow-lg hover:shadow-xl transition-all",
              "hover:scale-105 active:scale-95"
            )}
            title="Open notes"
          >
            <StickyNote className="h-5 w-5" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {totalCount}
              </span>
            )}
          </button>
        )}

        {/* Expanded */}
        {isOpen && !isMinimized && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 rounded-t-xl shrink-0">
              <div className="flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-display font-semibold">Notes</span>
                {totalCount > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                    {totalCount}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b shrink-0">
              {([
                { key: "list" as Tab, label: `Notes (${notes.length})` },
                { key: "free" as Tab, label: "Draft" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex-1 py-1.5 text-[11px] font-medium transition-colors",
                    activeTab === key
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === "list" ? (
                notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 p-4">
                    <StickyNote className="h-8 w-8 opacity-30" />
                    <p>Select text → click to add a note</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notes.map((note, idx) => (
                      <div
                        key={note.id}
                        data-note-list-id={note.id}
                        className="group px-3 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs text-foreground/80 italic line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => scrollToNote(note.id)}
                              title="Go to location"
                            >
                              "{note.sourceText}"
                            </p>
                            {editingId === note.id ? (
                              <textarea
                                autoFocus
                                value={note.annotation}
                                onChange={(e) => updateAnnotation(note.id, e.target.value)}
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    setEditingId(null);
                                  }
                                }}
                                placeholder="Add annotation..."
                                className="mt-1.5 w-full text-xs bg-muted/50 rounded p-1.5 resize-none outline-none focus:ring-1 focus:ring-primary/30 leading-relaxed"
                                rows={2}
                              />
                            ) : (
                              <p
                                className={cn(
                                  "mt-1 text-[11px] cursor-pointer rounded px-1 py-0.5 -mx-1",
                                  note.annotation
                                    ? "text-foreground hover:bg-muted/50"
                                    : "text-muted-foreground/50 hover:bg-muted/50 italic"
                                )}
                                onClick={() => setEditingId(note.id)}
                              >
                                {note.annotation || "+ Add annotation..."}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => scrollToNote(note.id)}
                              className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                              title="Go to location"
                            >
                              <Navigation className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => removeNote(note.id)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="p-2 h-full">
                  <textarea
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="Free draft..."
                    className={cn(
                      "w-full h-full resize-none rounded-lg bg-muted/30 p-3 text-sm leading-relaxed",
                      "outline-none placeholder:text-muted-foreground/40",
                      "focus:bg-muted/50 transition-colors"
                    )}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);

ExamNotes.displayName = "ExamNotes";

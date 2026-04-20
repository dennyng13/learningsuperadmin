import { useEffect, useRef, useMemo } from "react";
import { TextHighlighter, type NoteEntry } from "./TextHighlighter";

interface PassageViewerProps {
  title: string;
  content: string;
  /** Instruction text (e.g. "You should spend about 20 minutes on Questions 1–13...") */
  description?: string;
  onAddToNotes?: (entry: NoteEntry) => void;
  onNoteClick?: (noteId: string) => void;
  onSaveText?: (text: string) => void;
  onHighlight?: (text: string) => void;
  /** Text to highlight in the passage (passage evidence) */
  evidenceHighlight?: string | null;
}

export function PassageViewer({ title, content, description, onAddToNotes, onNoteClick, onSaveText, onHighlight, evidenceHighlight }: PassageViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Highlight evidence text in passage
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Remove previous highlights
    el.querySelectorAll("mark.evidence-hl").forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });

    if (!evidenceHighlight) return;

    // Walk text nodes and find the evidence text
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const needle = evidenceHighlight.toLowerCase();
    let node: Text | null;
    let found = false;

    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent || "";
      const idx = text.toLowerCase().indexOf(needle);
      if (idx === -1) continue;

      const before = document.createTextNode(text.slice(0, idx));
      const mark = document.createElement("mark");
      mark.className = "evidence-hl bg-primary/20 text-foreground rounded px-0.5 transition-colors";
      mark.textContent = text.slice(idx, idx + evidenceHighlight.length);
      const after = document.createTextNode(text.slice(idx + evidenceHighlight.length));

      const parent = node.parentNode!;
      parent.replaceChild(after, node);
      parent.insertBefore(mark, after);
      parent.insertBefore(before, mark);

      // Scroll into view
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      found = true;
      break;
    }

    // If not found in a single text node, try across the entire text content
    if (!found) {
      const fullText = el.textContent || "";
      const fullIdx = fullText.toLowerCase().indexOf(needle);
      if (fullIdx !== -1) {
        // Fallback: just scroll to approximate position
        const ratio = fullIdx / fullText.length;
        el.closest(".overflow-y-auto")?.scrollTo({ top: ratio * el.scrollHeight, behavior: "smooth" });
      }
    }
  }, [evidenceHighlight]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b px-5 lg:px-6 py-3">
        <h2 className="font-display text-base lg:text-lg font-bold text-primary uppercase tracking-wide">{title}</h2>
        {description && (
          <p className="text-xs lg:text-sm text-muted-foreground italic mt-1" dangerouslySetInnerHTML={{ __html: description }} />
        )}
      </div>
      <div className="px-5 lg:px-6 py-4">
        <TextHighlighter onAddToNotes={onAddToNotes} onNoteClick={onNoteClick} onSaveText={onSaveText} onHighlight={onHighlight}>
          <div
            ref={contentRef}
            className="exam-passage text-foreground whitespace-pre-wrap prose prose-sm max-w-none [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-bold [&_th]:bg-muted/50"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </TextHighlighter>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { X, AlertCircle, Pencil, CheckCircle, MessageSquare, ChevronLeft } from "lucide-react";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { useErrorCategories } from "@shared/hooks/useErrorCategories";
import type { Annotation } from "./AnnotatedText";

interface AnnotationToolbarProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onAddAnnotation: (ann: Omit<Annotation, "id">) => void;
  /** Skill context — controls which categories are shown. Defaults to 'writing'. */
  skill?: "writing" | "speaking";
}

type AnnotationType = "error" | "correction" | "good" | "comment";

const TYPE_CONFIG: { type: AnnotationType; icon: typeof AlertCircle; label: string; cssVar: string; quickSubmit?: boolean }[] = [
  { type: "error", icon: AlertCircle, label: "Lỗi", cssVar: "--annotation-error" },
  { type: "correction", icon: Pencil, label: "Gợi ý", cssVar: "--annotation-correction" },
  { type: "good", icon: CheckCircle, label: "Hay", cssVar: "--annotation-good" },
  { type: "comment", icon: MessageSquare, label: "Ghi chú", cssVar: "--annotation-comment" },
];

function triggerHaptic() {
  if (navigator.vibrate) navigator.vibrate(10);
}

export default function AnnotationToolbar({ containerRef, onAddAnnotation, skill = "writing" }: AnnotationToolbarProps) {
  const isMobile = useIsMobile();
  const { errors: errorCats, positives: positiveCats } = useErrorCategories(skill);
  const [show, setShow] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [startOffset, setStartOffset] = useState(0);
  const [endOffset, setEndOffset] = useState(0);

  // Form state
  const [activeType, setActiveType] = useState<AnnotationType | null>(null);
  const [correction, setCorrection] = useState("");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("grammar");

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, flipped: false });

  const getTextOffset = useCallback((container: HTMLElement, node: Node, offset: number): number => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let total = 0;
    while (walker.nextNode()) {
      if (walker.currentNode === node) return total + offset;
      total += walker.currentNode.textContent?.length || 0;
    }
    return total + offset;
  }, []);

  const processSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const container = containerRef.current;
    if (!container) return;

    const text = selection.toString().trim();
    if (text.length < 1) return;

    const range = selection.getRangeAt(0);
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return;

    const textDiv = container.querySelector("[data-text-content]");
    if (!textDiv) return;

    const start = getTextOffset(textDiv as HTMLElement, range.startContainer, range.startOffset);
    const end = getTextOffset(textDiv as HTMLElement, range.endContainer, range.endOffset);

    setSelectedText(text);
    setStartOffset(start);
    setEndOffset(end);

    if (!isMobile) {
      const rect = range.getBoundingClientRect();
      const toolbarW = 380;
      const toolbarH = 56;
      const vw = window.innerWidth;

      let x = rect.left + rect.width / 2;
      x = Math.max(toolbarW / 2 + 8, Math.min(x, vw - toolbarW / 2 - 8));

      const flipped = rect.top < toolbarH + 16;
      const y = flipped ? rect.bottom + 10 : rect.top - 10;

      setPos({ x, y, flipped });
    }

    setShow(true);
    setActiveType(null);
    setCorrection("");
    setComment("");
    setCategory("grammar");
  }, [containerRef, getTextOffset, isMobile]);

  // Desktop: mouseup
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isMobile) return;
    container.addEventListener("mouseup", processSelection);
    return () => container.removeEventListener("mouseup", processSelection);
  }, [containerRef, processSelection, isMobile]);

  // Mobile: touch handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    let tapTimeout: ReturnType<typeof setTimeout>;

    const handleTouchEnd = () => {
      tapTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim()) {
          processSelection();
        }
      }, 300);
    };

    const handleTap = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!target || !container.querySelector("[data-text-content]")?.contains(target)) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
    };

    container.addEventListener("touchstart", handleTap, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    const selChangeHandler = () => {
      clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim().length >= 1) {
          if (container.contains(selection.anchorNode)) {
            processSelection();
          }
        }
      }, 400);
    };
    document.addEventListener("selectionchange", selChangeHandler);

    return () => {
      container.removeEventListener("touchstart", handleTap);
      container.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("selectionchange", selChangeHandler);
      clearTimeout(tapTimeout);
    };
  }, [containerRef, isMobile, processSelection]);

  // Close on outside click
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShow(false);
        setActiveType(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [show]);

  // Keyboard: Escape to close, Enter to submit
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeType) setActiveType(null);
        else { setShow(false); window.getSelection()?.removeAllRanges(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [show, activeType]);

  const close = () => {
    setShow(false);
    setActiveType(null);
    window.getSelection()?.removeAllRanges();
  };

  const submitAnnotation = () => {
    if (!activeType) return;
    const useCategory = activeType === "error" || activeType === "good";
    onAddAnnotation({
      start_offset: startOffset,
      end_offset: endOffset,
      original_text: selectedText,
      annotation_type: activeType,
      category: useCategory ? category : undefined,
      correction: (activeType === "error" || activeType === "correction") ? correction || undefined : undefined,
      comment: comment || undefined,
    });
    close();
    if (isMobile) {
      triggerHaptic();
      toast("Đã đánh dấu", { duration: 1500 });
    }
  };

  const handleTypeClick = (type: AnnotationType) => {
    setActiveType(type);
    setCorrection("");
    setComment("");
    // Default category based on type
    if (type === "error" && errorCats.length > 0) setCategory(errorCats[0].key);
    else if (type === "good" && positiveCats.length > 0) setCategory(positiveCats[0].key);
    else setCategory("");
  };

  if (!show) return null;

  // --- Type selector buttons ---
  const typeSelector = (
    <div className="flex items-center gap-1">
      {TYPE_CONFIG.map((cfg, i) => {
        const Icon = cfg.icon;
        return (
          <button
            key={cfg.type}
            onClick={() => handleTypeClick(cfg.type)}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150",
              "hover:scale-[1.04] active:scale-95"
            )}
            style={{
              color: `hsl(var(${cfg.cssVar}))`,
              backgroundColor: `hsl(var(${cfg.cssVar}) / 0.06)`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = `hsl(var(${cfg.cssVar}) / 0.14)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = `hsl(var(${cfg.cssVar}) / 0.06)`;
            }}
          >
            <Icon className="h-4 w-4" />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );

  // --- Expanded form ---
  const formContent = activeType && (() => {
    const cfg = TYPE_CONFIG.find(c => c.type === activeType)!;
    const Icon = cfg.icon;
    return (
      <div className="space-y-2.5 w-full annotation-form-enter">
        {/* Header with back + type label */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveType(null)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold"
            style={{
              color: `hsl(var(${cfg.cssVar}))`,
              backgroundColor: `hsl(var(${cfg.cssVar}) / 0.1)`,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {activeType === "error" && "Đánh dấu lỗi"}
            {activeType === "correction" && "Gợi ý cải thiện"}
            {activeType === "good" && "Điểm hay"}
            {activeType === "comment" && "Ghi chú"}
          </div>
          <button onClick={close} className="ml-auto p-1 rounded-md hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Selected text preview */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 line-clamp-2 border border-border/50">
          <span className="text-[10px] font-medium text-muted-foreground/70 mr-1">Đoạn chọn:</span>
          "{selectedText}"
        </div>

        {activeType === "error" && (
          <>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Chọn loại lỗi..." /></SelectTrigger>
              <SelectContent className="max-h-72">
                {errorCats.map(c => <SelectItem key={c.key} value={c.key}>{c.label_vi}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={correction}
              onChange={e => setCorrection(e.target.value)}
              placeholder="Sửa thành..."
              className="h-9 text-xs"
              autoFocus
              onKeyDown={e => e.key === "Enter" && submitAnnotation()}
            />
          </>
        )}

        {activeType === "good" && positiveCats.length > 0 && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Chọn loại điểm khen..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              {positiveCats.map(c => <SelectItem key={c.key} value={c.key}>{c.label_vi}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {activeType === "correction" && (
          <Input
            value={correction}
            onChange={e => setCorrection(e.target.value)}
            placeholder="Gợi ý cách viết tốt hơn..."
            className="h-9 text-xs"
            autoFocus
            onKeyDown={e => e.key === "Enter" && submitAnnotation()}
          />
        )}

        <Input
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={activeType === "good" ? "VD: Great vocabulary! (tuỳ chọn)" : "Ghi chú thêm..."}
          className="h-9 text-xs"
          autoFocus={activeType === "good" || activeType === "comment"}
          onKeyDown={e => e.key === "Enter" && submitAnnotation()}
        />

        <div className="flex justify-end gap-2 pt-0.5">
          <Button variant="ghost" size="sm" onClick={() => setActiveType(null)} className="h-8 text-xs">
            Huỷ
          </Button>
          <Button
            size="sm"
            onClick={submitAnnotation}
            className="h-8 text-xs gap-1"
            style={{
              backgroundColor: `hsl(var(${cfg.cssVar}))`,
              color: "white",
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            Thêm {cfg.label.toLowerCase()}
          </Button>
        </div>
      </div>
    );
  })();

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/10 annotation-backdrop-enter"
          onClick={close}
        />
        <div
          ref={toolbarRef}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] annotation-sheet-enter"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="px-4 pb-3 space-y-2">
            {!activeType ? (
              <>
                {/* Selected text preview on mobile */}
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 line-clamp-1 border border-border/50">
                  "{selectedText}"
                </div>
                <div className="flex items-center justify-between">
                  {typeSelector}
                  <button onClick={close} className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : formContent}
          </div>
        </div>
      </>
    );
  }

  // Desktop: floating toolbar
  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] annotation-toolbar-enter"
      style={{
        left: pos.x,
        top: pos.y,
        transform: pos.flipped ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }}
    >
      {!activeType ? (
        <div className="flex items-center gap-0.5 bg-card border rounded-xl px-1.5 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]">
          {typeSelector}
          <div className="w-px h-5 bg-border mx-0.5" />
          <button onClick={close} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-card border rounded-xl p-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] min-w-[300px] max-w-[360px]">
          {formContent}
        </div>
      )}
    </div>
  );
}

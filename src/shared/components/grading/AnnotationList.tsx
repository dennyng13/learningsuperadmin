import { useState } from "react";
import { AlertCircle, Pencil, CheckCircle, MessageSquare, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { Annotation } from "./AnnotatedText";

const TYPE_META: Record<string, { icon: typeof AlertCircle; label: string; color: string }> = {
  error: { icon: AlertCircle, label: "Lỗi", color: "hsl(var(--annotation-error))" },
  correction: { icon: Pencil, label: "Gợi ý", color: "hsl(var(--annotation-correction))" },
  good: { icon: CheckCircle, label: "Hay", color: "hsl(var(--annotation-good))" },
  comment: { icon: MessageSquare, label: "Ghi chú", color: "hsl(var(--annotation-comment))" },
};

interface AnnotationListProps {
  annotations: Annotation[];
  onRemove: (id: string) => void;
  onHighlight?: (id: string | null) => void;
  highlightedId?: string | null;
}

export default function AnnotationList({ annotations, onRemove, onHighlight, highlightedId }: AnnotationListProps) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? annotations.filter(a => a.annotation_type === filter) : annotations;

  const counts = annotations.reduce((acc, a) => {
    acc[a.annotation_type] = (acc[a.annotation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (annotations.length === 0) return null;

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Danh sách ghi chú
          </span>
          <span className="text-[10px] bg-primary/10 text-primary font-bold rounded-full px-1.5 py-0.5">
            {annotations.length}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <>
          {/* Filter chips */}
          <div className="flex items-center gap-1.5 px-3 pb-2.5 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all",
                !filter ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Tất cả ({annotations.length})
            </button>
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const Icon = meta.icon;
              const count = counts[type] || 0;
              if (count === 0) return null;
              const isActive = filter === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(isActive ? null : type)}
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-semibold pl-1.5 pr-2.5 py-1 rounded-lg transition-all",
                    isActive ? "shadow-sm border" : "hover:opacity-80"
                  )}
                  style={isActive ? {
                    color: meta.color,
                    backgroundColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue(`--annotation-${type}`).trim()} / 0.12)`,
                    borderColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue(`--annotation-${type}`).trim()} / 0.3)`,
                  } : {
                    color: meta.color,
                    backgroundColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue(`--annotation-${type}`).trim()} / 0.06)`,
                  }}
                >
                  <Icon className="h-3 w-3" />
                  <span className="font-bold">{count}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto divide-y">
            {filtered.map((ann) => {
              const meta = TYPE_META[ann.annotation_type];
              if (!meta) return null;
              const Icon = meta.icon;
              const isActive = highlightedId === ann.id;

              return (
                <div
                  key={ann.id}
                  className={cn(
                    "px-3 py-2 text-xs cursor-pointer hover:bg-muted/30 transition-colors",
                    isActive && "bg-primary/5 border-l-2 border-primary"
                  )}
                  onMouseEnter={() => onHighlight?.(ann.id)}
                  onMouseLeave={() => onHighlight?.(null)}
                  onClick={() => onHighlight?.(isActive ? null : ann.id)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: meta.color }} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                        {ann.category && (
                          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1">{ann.category}</span>
                        )}
                      </div>
                      <p className="text-muted-foreground line-clamp-1">
                        "{ann.original_text}"
                      </p>
                      {ann.correction && (
                        <p className="text-foreground">→ {ann.correction}</p>
                      )}
                      {ann.comment && (
                        <p className="text-muted-foreground italic">{ann.comment}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(ann.id); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

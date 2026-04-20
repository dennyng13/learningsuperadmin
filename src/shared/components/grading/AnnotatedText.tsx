import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { MessageSquare, AlertCircle, Pencil, CheckCircle } from "lucide-react";
import { cn } from "@shared/lib/utils";

export interface Annotation {
  id: string;
  start_offset: number;
  end_offset: number;
  original_text: string;
  annotation_type: "error" | "correction" | "good" | "comment";
  category?: string;
  correction?: string;
  comment?: string;
}

interface AnnotatedTextProps {
  text: string;
  annotations: Annotation[];
  visibleTypes: Set<string>;
  onAnnotationClick?: (id: string) => void;
  highlightedId?: string | null;
}

const TYPE_STYLES: Record<string, { border: string; bg: string; color: string }> = {
  error: { border: "border-b-2 border-[hsl(var(--annotation-error))]", bg: "bg-[hsl(var(--annotation-error)/0.08)]", color: "hsl(var(--annotation-error))" },
  correction: { border: "border-b-2 border-dashed border-[hsl(var(--annotation-correction))]", bg: "bg-[hsl(var(--annotation-correction)/0.08)]", color: "hsl(var(--annotation-correction))" },
  good: { border: "border-b-2 border-[hsl(var(--annotation-good))]", bg: "bg-[hsl(var(--annotation-good)/0.08)]", color: "hsl(var(--annotation-good))" },
  comment: { border: "border-b-2 border-dotted border-[hsl(var(--annotation-comment))]", bg: "bg-[hsl(var(--annotation-comment)/0.08)]", color: "hsl(var(--annotation-comment))" },
};

const TYPE_ICONS: Record<string, typeof AlertCircle> = {
  error: AlertCircle,
  correction: Pencil,
  good: CheckCircle,
  comment: MessageSquare,
};

const TYPE_LABELS: Record<string, string> = {
  error: "Lỗi",
  correction: "Gợi ý",
  good: "Hay!",
  comment: "Ghi chú",
};

interface Segment {
  start: number;
  end: number;
  text: string;
  annotations: Annotation[];
}

/**
 * Build segments that support overlapping annotations.
 * We collect all boundary points and create segments between consecutive boundaries.
 */
function buildSegments(text: string, annotations: Annotation[]): Segment[] {
  if (annotations.length === 0) {
    return [{ start: 0, end: text.length, text, annotations: [] }];
  }

  // Collect all unique boundary points
  const points = new Set<number>();
  points.add(0);
  points.add(text.length);
  for (const ann of annotations) {
    points.add(Math.max(0, ann.start_offset));
    points.add(Math.min(text.length, ann.end_offset));
  }

  const sorted = Array.from(points).sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;

    // Find all annotations covering this segment
    const covering = annotations.filter(a => a.start_offset <= start && a.end_offset >= end);

    segments.push({
      start,
      end,
      text: text.slice(start, end),
      annotations: covering,
    });
  }

  return segments;
}

export default function AnnotatedText({ text, annotations, visibleTypes, onAnnotationClick, highlightedId }: AnnotatedTextProps) {
  const segments = useMemo(() => {
    const visible = annotations.filter(a => visibleTypes.has(a.annotation_type));
    return buildSegments(text, visible);
  }, [text, annotations, visibleTypes]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="whitespace-pre-wrap text-sm leading-[2] text-foreground/90 select-text px-1" style={{ userSelect: "text" }}>
        {segments.map((seg, i) => {
          if (seg.annotations.length === 0) {
            return <span key={i}>{seg.text}</span>;
          }

          // Combine styles from all annotations on this segment
          const types = [...new Set(seg.annotations.map(a => a.annotation_type))];
          // Use the highest priority type for background
          const priorityOrder: Array<Annotation["annotation_type"]> = ["error", "correction", "comment", "good"];
          const primaryType = priorityOrder.find(t => types.includes(t)) || types[0];
          const style = TYPE_STYLES[primaryType];

          const isHighlighted = seg.annotations.some(a => a.id === highlightedId);

          // Multiple colored bottom borders via box-shadow if multiple types
          const multiColors = types.length > 1;

          const tooltipContent = (
            <div className="space-y-1.5 max-w-xs">
              {seg.annotations.map(ann => {
                const Icon = TYPE_ICONS[ann.annotation_type];
                const typeStyle = TYPE_STYLES[ann.annotation_type];
                return (
                  <div key={ann.id} className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      {Icon && <Icon className="h-3 w-3" style={{ color: typeStyle.color }} />}
                      <span className="font-semibold text-xs" style={{ color: typeStyle.color }}>
                        {TYPE_LABELS[ann.annotation_type]}
                        {ann.category ? ` — ${ann.category}` : ""}
                      </span>
                    </div>
                    {ann.correction && (
                      <p className="text-xs">→ {ann.correction}</p>
                    )}
                    {ann.comment && (
                      <p className="text-xs text-muted-foreground">{ann.comment}</p>
                    )}
                    {onAnnotationClick && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAnnotationClick(ann.id); }}
                        className="text-[10px] text-destructive hover:underline"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );

          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "cursor-pointer rounded-sm transition-all inline",
                    style.bg,
                    !multiColors && style.border,
                    isHighlighted && "ring-2 ring-primary/50 scale-[1.02]",
                  )}
                  style={multiColors ? {
                    borderBottom: `2px solid ${TYPE_STYLES[primaryType].color}`,
                    boxShadow: types.slice(1).map((t, idx) => 
                      `inset 0 ${-3 - idx * 2}px 0 0 ${TYPE_STYLES[t].color}`
                    ).join(", "),
                  } : undefined}
                >
                  {seg.text}
                  {seg.annotations.some(a => a.annotation_type === "error" && a.correction) && (
                    <span className="annotation-error-correction ml-0.5 text-xs" style={{ color: TYPE_STYLES.error.color }}>
                      {seg.annotations.find(a => a.annotation_type === "error" && a.correction)?.correction}
                    </span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" avoidCollisions collisionPadding={12} className="max-w-xs text-xs z-[70]">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

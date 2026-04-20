import { useState, useEffect, useCallback } from "react";
import { useBandDescriptors } from "@shared/hooks/useBandDescriptors";
import ScoreWithDescriptor from "@shared/components/misc/ScoreWithDescriptor";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import { Loader2, AlertCircle, Pencil, CheckCircle, MessageSquare, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@shared/components/ui/popover";
import AnnotatedText, { type Annotation } from "./AnnotatedText";
import mascotStudy from "@/assets/mascot-study.png";

interface WritingReviewProps {
  resultId: string;
  taskKey: string;
  responseText: string;
}

interface Feedback {
  id: string;
  task_achievement: number | null;
  coherence_cohesion: number | null;
  lexical_resource: number | null;
  grammar_accuracy: number | null;
  overall_band: number | null;
  comment: string | null;
}

const CRITERIA = [
  { key: "task_achievement", label: "TA", full: "Task Achievement" },
  { key: "coherence_cohesion", label: "CC", full: "Coherence & Cohesion" },
  { key: "lexical_resource", label: "LR", full: "Lexical Resource" },
  { key: "grammar_accuracy", label: "GRA", full: "Grammar Range & Accuracy" },
] as const;

const TYPE_META: Record<string, { icon: typeof AlertCircle; label: string; color: string; emoji: string }> = {
  error: { icon: AlertCircle, label:"Lỗi", color:"hsl(var(--annotation-error))", emoji:""},
  correction: { icon: Pencil, label:"Gợi ý", color:"hsl(var(--annotation-correction))", emoji:""},
  good: { icon: CheckCircle, label:"Hay", color:"hsl(var(--annotation-good))", emoji:""},
  comment: { icon: MessageSquare, label:"Ghi chú", color:"hsl(var(--annotation-comment))", emoji:""},
};

const CATEGORY_TO_CRITERIA: Record<string, string> = {
  grammar: "grammar_accuracy",
  vocabulary: "lexical_resource",
  coherence: "coherence_cohesion",
  task: "task_achievement",
};

function WritingScoreRow({ feedback, taskKey }: { feedback: Feedback; taskKey: string }) {
  const taskType = taskKey.replace("task_", "task");
  const descriptors = useBandDescriptors("writing", taskType);
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {CRITERIA.map(c => {
        const score = feedback[c.key as keyof Feedback] as number | null;
        return (
          <ScoreWithDescriptor
            key={c.key}
            label={c.full}
            shortLabel={c.label}
            score={score}
            criteriaKey={c.key}
            descriptors={descriptors}
            variant="card"
          />
        );
      })}
    </div>
  );
}

export default function WritingReview({ resultId, taskKey, responseText }: WritingReviewProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(["error", "correction", "good", "comment"]));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: fb } = await supabase
        .from("writing_feedback" as any)
        .select("*")
        .eq("result_id", resultId)
        .eq("task_key", taskKey)
        .maybeSingle() as any;

      if (fb) {
        setFeedback(fb);
        const { data: anns } = await supabase
          .from("writing_annotations" as any)
          .select("*")
          .eq("feedback_id", fb.id)
          .order("start_offset") as any;
        if (anns) setAnnotations(anns);
      }
      setLoading(false);
    };
    load();
  }, [resultId, taskKey]);

  const toggleType = (type: string) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const counts = annotations.reduce((acc, a) => {
    acc[a.annotation_type] = (acc[a.annotation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find most common error category for recommendation
  const getTopErrorCategory = () => {
    const catCounts: Record<string, number> = {};
    annotations.filter(a => a.annotation_type === "error" && a.category).forEach(a => {
      catCounts[a.category!] = (catCounts[a.category!] || 0) + 1;
    });
    let top = "";
    let max = 0;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count > max) { top = cat; max = count; }
    }
    return { category: top, count: max };
  };

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <img src={mascotStudy} className="w-20 h-20 mx-auto mb-3" alt="Chưa có nhận xét" />
        <p className="text-sm text-muted-foreground font-medium">Giáo viên chưa chấm bài này</p>
        <p className="text-xs text-muted-foreground mt-1">Nhận xét sẽ hiện ở đây khi giáo viên hoàn thành chấm bài.</p>
      </div>
    );
  }

  const criteriaAnnotationCounts = (criteriaKey: string) => {
    const cats = Object.entries(CATEGORY_TO_CRITERIA).filter(([, v]) => v === criteriaKey).map(([k]) => k);
    return annotations.filter(a => a.annotation_type === "error" && cats.includes(a.category || "")).length;
  };

  const scrollToFirstAnnotation = (criteriaKey: string) => {
    const cats = Object.entries(CATEGORY_TO_CRITERIA).filter(([, v]) => v === criteriaKey).map(([k]) => k);
    const first = annotations.find(a => a.annotation_type === "error" && cats.includes(a.category || ""));
    if (first) {
      const el = document.querySelector(`[data-annotation-id="${first.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const topError = getTopErrorCategory();
  const practiceLabel: Record<string, string> = {
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    coherence: "Coherence",
    task: "Task Achievement",
  };

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <div className="bg-card rounded-2xl border p-5">
        <div className="flex flex-col items-center gap-3">
          {feedback.overall_band != null && (
            <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center">
              <span className="font-display text-3xl font-black text-primary">{feedback.overall_band}</span>
            </div>
          )}
          <WritingScoreRow feedback={feedback} taskKey={taskKey} />
        </div>
      </div>

      {/* Filter bar + Annotated text */}
      {annotations.length > 0 && (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b text-xs flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
              Đánh dấu ({annotations.length})
            </span>
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const Icon = meta.icon;
              const count = counts[type] || 0;
              if (count === 0) return null;
              const visible = visibleTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg font-semibold transition-all text-xs",
                    visible ? "border shadow-sm" : "opacity-40 hover:opacity-60",
                  )}
                  style={visible ? {
                    color: meta.color,
                    backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                    borderColor: `color-mix(in srgb, ${meta.color} 25%, transparent)`,
                  } : { color: meta.color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-bold">{count}</span>
                  {meta.label}
                  {!visible && <EyeOff className="h-2.5 w-2.5" />}
                </button>
              );
            })}
          </div>
          <div className="p-5">
            <AnnotatedText
              text={responseText}
              annotations={annotations}
              visibleTypes={visibleTypes}
            />
          </div>
        </div>
      )}

      {/* Per-criteria feedback cards */}
      {CRITERIA.map(c => {
        const score = feedback[c.key as keyof Feedback] as number | null;
        if (score == null) return null;
        const annCount = criteriaAnnotationCounts(c.key);
        return (
          <div key={c.key} className="bg-card rounded-xl border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm">{c.full}</h4>
              <span className="font-display text-lg font-extrabold text-primary">{score}</span>
            </div>
            {annCount > 0 && (
              <button
                onClick={() => scrollToFirstAnnotation(c.key)}
                className="text-xs text-primary hover:underline"
              >
                Xem {annCount} đánh dấu trong bài →
              </button>
            )}
          </div>
        );
      })}

      {/* Overall comment */}
      {feedback.comment && (
        <div className="bg-primary/5 border-l-[3px] border-primary rounded-r-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              GV
            </div>
            <span className="text-sm font-semibold">Nhận xét từ giáo viên</span>
          </div>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{feedback.comment}</p>
        </div>
      )}

      {/* Practice recommendation */}
      {topError.count >= 2 && (
        <div className="bg-muted/30 rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Bài viết có {topError.count} lỗi {practiceLabel[topError.category] || topError.category}. Luyện tập thêm để cải thiện!
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/practice?skill=writing&type=${topError.category}`)}
          >
            Luyện tập {practiceLabel[topError.category] || topError.category}
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import { Loader2, Check, Star, ChevronDown, ChevronUp, AlertCircle, Pencil, CheckCircle, MessageSquare, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@shared/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import FeedbackTemplatePicker, { SaveTemplateButton } from "@shared/components/misc/FeedbackTemplatePicker";
import AIWritingFeedback from "@shared/components/misc/AIWritingFeedback";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Annotation } from "./AnnotatedText";

// Integer-only steps from 1 to 9
const SCORE_STEPS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const CRITERIA = [
  { key: "task_achievement", label: "Task Achievement", short: "TA", annCategory: "task" },
  { key: "coherence_cohesion", label: "Coherence & Cohesion", short: "CC", annCategory: "coherence" },
  { key: "lexical_resource", label: "Lexical Resource", short: "LR", annCategory: "vocabulary" },
  { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA", annCategory: "grammar" },
] as const;

const ANN_TYPE_META: Record<string, { icon: typeof AlertCircle; label: string; color: string }> = {
  error: { icon: AlertCircle, label: "lỗi", color: "hsl(var(--annotation-error))" },
  correction: { icon: Pencil, label: "gợi ý", color: "hsl(var(--annotation-correction))" },
  good: { icon: CheckCircle, label: "hay", color: "hsl(var(--annotation-good))" },
  comment: { icon: MessageSquare, label: "ghi chú", color: "hsl(var(--annotation-comment))" },
};

function calcOverallBand(scores: Record<string, string>): number | null {
  const vals = Object.values(scores).filter(v => v).map(Number);
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  // IELTS rounding: round to nearest 0.5
  return Math.round(avg * 2) / 2;
}

import { useBandDescriptors } from "@shared/hooks/useBandDescriptors";

/** Scroll pill container to center the selected pill */
function PillScoreSelector({ value, criteriaKey, scores, setScores, setFeedbackSource, descriptors }: {
  value: string;
  criteriaKey: string;
  scores: Record<string, string>;
  setScores: (s: Record<string, string>) => void;
  setFeedbackSource: (s: string) => void;
  descriptors: Record<string, string>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || !scrollRef.current) return;
    const idx = SCORE_STEPS.indexOf(value);
    if (idx === -1) return;
    const pill = scrollRef.current.children[idx] as HTMLElement | undefined;
    if (pill) {
      pill.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  }, [value]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-2 pt-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none"
      >
        {SCORE_STEPS.map(s => {
          const desc = descriptors[`${criteriaKey}:${s}`];
          const btn = (
            <button
              key={s}
              onClick={() => {
                setScores({ ...scores, [criteriaKey]: s });
                setFeedbackSource("manual");
              }}
              className={cn(
                "h-11 w-11 min-w-[44px] rounded-full text-xs font-bold transition-all shrink-0 snap-center relative",
                value === s
                  ? "bg-primary text-primary-foreground shadow-md scale-110 ring-2 ring-primary"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95",
                desc && "ring-1 ring-primary/20"
              )}
            >
              {s}
              {desc && value !== s && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary/50" />
              )}
            </button>
          );

          if (desc) {
            return (
              <Tooltip key={s}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs whitespace-pre-wrap">
                  <p className="font-bold mb-0.5">Band {s}</p>
                  <p className="text-muted-foreground">{desc}</p>
                </TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </div>

      {/* Show selected band description below */}
      {value && descriptors[`${criteriaKey}:${value}`] && (() => {
        const desc = descriptors[`${criteriaKey}:${value}`];
        const lines = desc.split("\n").filter((l: string) => l.trim());
        const isBulletList = lines.length > 1;
        return (
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 mt-1">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] text-foreground/70 leading-relaxed flex-1">
              <span className="font-semibold text-primary">Band {value}:</span>
              {isBulletList ? (
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  {lines.map((line: string, i: number) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : (
                <span> {desc}</span>
              )}
            </div>
          </div>
        );
      })()}
    </TooltipProvider>
  );
}

interface GradingScorePanelProps {
  scores: Record<string, string>;
  setScores: (scores: Record<string, string>) => void;
  criteriaComments: Record<string, string>;
  setCriteriaComments: (c: Record<string, string>) => void;
  comment: string;
  setComment: (c: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  setFeedbackSource: (s: string) => void;
  writingResponseText?: string;
  taskPrompt?: string;
  annotations: Annotation[];
  /** When true, actions render outside (in sticky bar) */
  stickyActions?: boolean;
  /** Pre-calculated overall band score */
  overall?: number | null;
  /** Task type for loading correct band descriptors (e.g. 'task1', 'task2') */
  taskType?: string;
}

export default function GradingScorePanel({
  scores, setScores, criteriaComments, setCriteriaComments,
  comment, setComment, saving, onSave, onCancel,
  setFeedbackSource, writingResponseText, taskPrompt, annotations,
  stickyActions = false, overall: overallProp, taskType,
}: GradingScorePanelProps) {
  const [promptOpen, setPromptOpen] = useState(false);
  const overall = overallProp !== undefined ? overallProp : calcOverallBand(scores);
  const bandDescriptors = useBandDescriptors("writing", taskType);

  // Count annotations per category
  const annCountsByCategory = annotations.reduce((acc, a) => {
    const cat = a.category || "general";
    if (!acc[cat]) acc[cat] = {};
    acc[cat][a.annotation_type] = (acc[cat][a.annotation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Determine first criteria to open by default
  const firstCriteriaWithNoScore = CRITERIA.find(c => !scores[c.key])?.key || CRITERIA[0].key;

  return (
    <div className="space-y-4">
      {/* AI grading button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Chấm điểm</h3>
        <AIWritingFeedback
          writingResponse={writingResponseText || ""}
          taskPrompt={taskPrompt}
          onResult={(aiScores, aiComment) => {
            setScores(aiScores);
            setComment(aiComment);
            setFeedbackSource("ai");
          }}
        />
      </div>

      {/* Collapsible task prompt */}
      {taskPrompt && (
        <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1">
            {promptOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Đề bài
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
              {taskPrompt}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Criteria cards as accordion — one open at a time */}
      <Accordion type="single" collapsible defaultValue={firstCriteriaWithNoScore} className="space-y-2">
        {CRITERIA.map(c => {
          const value = scores[c.key];
          const catCounts = annCountsByCategory[c.annCategory] || {};
          const annTotal = Object.values(catCounts).reduce((s, n) => s + n, 0);

          return (
            <AccordionItem key={c.key} value={c.key} className="rounded-xl border bg-card overflow-hidden">
              <AccordionTrigger className="px-3 py-2.5 hover:no-underline [&[data-state=open]>div>.score]:hidden">
                <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <span className="text-xs font-bold text-foreground text-left">{c.label}</span>
                  {annTotal > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0">
                      {annTotal}
                    </span>
                  )}
                  {value && (
                    <span className="score ml-auto mr-2 text-lg font-extrabold text-primary shrink-0">{value}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-3">
                {/* Score display when open */}
                {value && (
                  <div className="text-left">
                    <span className="text-3xl font-extrabold text-primary">{value}</span>
                  </div>
                )}

                {/* Pill score selector with scroll-snap */}
                <PillScoreSelector
                  value={value}
                  criteriaKey={c.key}
                  scores={scores}
                  setScores={setScores}
                  setFeedbackSource={setFeedbackSource}
                  descriptors={bandDescriptors}
                />

                {/* Per-criteria template picker */}
                <FeedbackTemplatePicker
                  skill="writing"
                  criteria={c.key}
                  bandScore={value}
                  onSelect={(text) => setCriteriaComments({
                    ...criteriaComments,
                    [c.key]: criteriaComments[c.key] ? criteriaComments[c.key] + "\n" + text : text,
                  })}
                />

                {/* Per-criteria comment */}
                <Textarea
                  value={criteriaComments[c.key] || ""}
                  onChange={e => setCriteriaComments({ ...criteriaComments, [c.key]: e.target.value })}
                  placeholder={`Nhận xét ${c.short}...`}
                  className="text-xs min-h-[56px] rounded-lg resize-none"
                  maxLength={500}
                />

                {/* Annotation counts for this criteria */}
                {Object.keys(catCounts).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-medium">Annotations:</span>
                    {Object.entries(catCounts).map(([type, count]) => {
                      const meta = ANN_TYPE_META[type];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <span key={type} className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: meta.color }}>
                          <Icon className="h-3 w-3" /> {count} {meta.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Overall band */}
      {overall != null && (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center">
            <span className="font-display text-4xl font-black text-primary">{overall}</span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">Overall Band</span>
        </div>
      )}

      {/* Overall comment */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase">Nhận xét tổng quan</label>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Nhận xét chung về bài viết..."
          className="text-sm min-h-[80px] rounded-lg resize-none"
          maxLength={2000}
        />
        <SaveTemplateButton skill="writing" comment={comment} />
      </div>

      {/* Actions — only if not using sticky bar */}
      {!stickyActions && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onCancel}>Huỷ</Button>
          <Button size="sm" className="flex-1" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
            Lưu chấm điểm
          </Button>
        </div>
      )}
    </div>
  );
}

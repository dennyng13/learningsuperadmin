import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { useBandDescriptors } from "@shared/hooks/useBandDescriptors";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@shared/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import FeedbackTemplatePicker, { SaveTemplateButton } from "@shared/components/misc/FeedbackTemplatePicker";
import {
  Play, Pause, Loader2, Check, Save, Pin, Trash2, Volume2, Info,
} from "lucide-react";
import { cn } from "@shared/lib/utils";

/* ── Types ── */

interface TimestampNote {
  time: number; // seconds
  note: string;
}

interface SpeakingGraderProps {
  resultId: string;
  resultType: "test" | "practice";
  partKey: string;
  studentId: string;
  audioUrl?: string;
  readOnly?: boolean;
  onComplete?: () => void;
}

/* ── Constants ── */

const CRITERIA = [
  { key: "fluency_coherence", label: "Fluency & Coherence", short: "FC" },
  { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
  { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
  { key: "pronunciation", label: "Pronunciation", short: "PR" },
] as const;

const BANDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function calcOverall(scores: Record<string, string>): number | null {
  const vals = Object.values(scores).filter(v => v).map(Number);
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 2) / 2;
}

/* ── Audio Player ── */

function AudioPlayer({
  url,
  audioRef,
}: {
  url: string;
  audioRef: React.RefObject<HTMLAudioElement>;
}) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [audioRef]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div
            ref={progressRef}
            onClick={seek}
            className="h-2 rounded-full bg-muted cursor-pointer relative overflow-hidden"
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-100"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 justify-end">
        {[0.75, 1, 1.25].map(s => (
          <button
            key={s}
            onClick={() => changeSpeed(s)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
              speed === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Pill Score Selector (whole bands only) ── */

function BandPills({
  value,
  onChange,
  disabled,
  criteriaKey,
  descriptors,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  criteriaKey?: string;
  descriptors?: Record<string, string>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || !scrollRef.current) return;
    const idx = BANDS.indexOf(Number(value));
    if (idx === -1) return;
    const pill = scrollRef.current.children[idx] as HTMLElement | undefined;
    pill?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [value]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 snap-x snap-mandatory scrollbar-none"
      >
        {BANDS.map(b => {
          const descKey = criteriaKey ? `${criteriaKey}:${b}` : "";
          const desc = descriptors?.[descKey];
          const btn = (
            <button
              key={b}
              disabled={disabled}
              onClick={() => onChange(String(b))}
              className={cn(
                "h-11 w-11 min-w-[44px] rounded-full text-sm font-bold transition-all shrink-0 snap-center relative",
                value === String(b)
                  ? "bg-primary text-primary-foreground shadow-md scale-110 ring-2 ring-primary"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95",
                disabled && "opacity-60 pointer-events-none",
                desc && "ring-1 ring-primary/20"
              )}
            >
              {b}
              {desc && value !== String(b) && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary/50" />
              )}
            </button>
          );

          if (desc) {
            return (
              <Tooltip key={b}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs whitespace-pre-wrap">
                  <p className="font-bold mb-0.5">Band {b}</p>
                  <p className="text-muted-foreground">{desc}</p>
                </TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </div>

      {/* Show selected band description below */}
      {value && criteriaKey && descriptors?.[`${criteriaKey}:${value}`] && (() => {
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

/* ── Main Component ── */

export default function SpeakingGrader({
  resultId, resultType, partKey, studentId, audioUrl, readOnly = false, onComplete,
}: SpeakingGraderProps) {
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement>(null);

  const speakingDescriptors = useBandDescriptors("speaking");

  // State
  const [loading, setLoading] = useState(true);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({
    fluency_coherence: "", lexical_resource: "", grammar_accuracy: "", pronunciation: "",
  });
  const [criteriaComments, setCriteriaComments] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [timestamps, setTimestamps] = useState<TimestampNote[]>([]);
  const [saving, setSaving] = useState(false);

  // Timestamp note input
  const [tsEditing, setTsEditing] = useState(false);
  const [tsTime, setTsTime] = useState(0);
  const [tsNote, setTsNote] = useState("");

  // Load existing feedback
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: fb } = await supabase
        .from("speaking_feedback")
        .select("*")
        .eq("result_id", resultId)
        .eq("result_type", resultType)
        .eq("part_key", partKey)
        .maybeSingle();

      if (fb) {
        setFeedbackId((fb as any).id);
        setScores({
          fluency_coherence: (fb as any).fluency_coherence != null ? String((fb as any).fluency_coherence) : "",
          lexical_resource: (fb as any).lexical_resource != null ? String((fb as any).lexical_resource) : "",
          grammar_accuracy: (fb as any).grammar_accuracy != null ? String((fb as any).grammar_accuracy) : "",
          pronunciation: (fb as any).pronunciation != null ? String((fb as any).pronunciation) : "",
        });
        setComment((fb as any).comment || "");
        setTimestamps(Array.isArray((fb as any).timestamps) ? (fb as any).timestamps : []);
      }
      setLoading(false);
    };
    load();
  }, [resultId, resultType, partKey]);

  const overall = calcOverall(scores);
  const scoredCount = Object.values(scores).filter(v => v).length;
  const allScored = scoredCount === 4;

  // Seek audio to timestamp
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  }, []);

  // Add timestamp note
  const addTimestamp = () => {
    if (!tsNote.trim()) { toast.error("Vui lòng nhập ghi chú"); return; }
    setTimestamps(prev => [...prev, { time: tsTime, note: tsNote.trim() }].sort((a, b) => a.time - b.time));
    setTsEditing(false);
    setTsNote("");
  };

  const removeTimestamp = (idx: number) => {
    setTimestamps(prev => prev.filter((_, i) => i !== idx));
  };

  // Save
  const saveAll = async (isDraft: boolean) => {
    const hasAny = Object.values(scores).some(v => v) || comment.trim() || timestamps.length > 0;
    if (!hasAny) { toast.error("Vui lòng nhập điểm, nhận xét hoặc ghi chú"); return; }
    if (!isDraft && !allScored) { toast.error("Vui lòng chấm đủ 4 tiêu chí"); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      teacher_id: user.id,
      student_id: studentId,
      result_id: resultId,
      result_type: resultType,
      part_key: partKey,
      score: overall,
      fluency_coherence: scores.fluency_coherence ? Number(scores.fluency_coherence) : null,
      lexical_resource: scores.lexical_resource ? Number(scores.lexical_resource) : null,
      grammar_accuracy: scores.grammar_accuracy ? Number(scores.grammar_accuracy) : null,
      pronunciation: scores.pronunciation ? Number(scores.pronunciation) : null,
      overall_band: overall,
      comment: comment.trim() || null,
      timestamps: timestamps as any,
      updated_at: new Date().toISOString(),
    };

    let savedId = feedbackId;

    if (feedbackId) {
      const { error } = await supabase.from("speaking_feedback").update(payload).eq("id", feedbackId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("speaking_feedback").insert(payload).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      savedId = (data as any).id;
      setFeedbackId(savedId);
    }

    if (!isDraft) {
      // Notification for student
      await supabase.from("notifications").insert({
        user_id: studentId,
        type: "speaking_feedback",
        title: "Có nhận xét mới từ giáo viên!",
        body: `Giáo viên đã chấm bài Speaking (${partKey}) — Band ${overall}`,
        link: "/improve",
      });
      // Email notification (best-effort)
      try {
        const { data: emails } = await supabase.rpc("get_user_emails", { user_ids: [studentId] });
        const studentEmail = (emails as any[])?.[0]?.email;
        if (studentEmail) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "feedback-published",
              recipientEmail: studentEmail,
              idempotencyKey: `speaking-fb-${savedId}-${Date.now()}`,
              templateData: {
                studentName: "bạn",
                teacherName: "Giáo viên Learning Plus",
                skill: "Speaking",
                assessmentName: "",
                taskLabel: partKey,
                overallBand: overall,
                comment: comment.trim() || "",
                reviewUrl: `${window.location.origin}/improve`,
              },
            },
          });
        }
      } catch (e) {
        console.warn("Speaking feedback email failed (non-blocking):", e);
      }
      toast.success("Đã gửi nhận xét cho học viên!");
      onComplete?.();
    } else {
      toast.success("Đã lưu nháp");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Read-only mode (student) ── */
  if (readOnly) {
    const hasFeedback = feedbackId != null;

    if (!hasFeedback) {
      return (
        <div className="text-center py-6">
          <Volume2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Giáo viên chưa chấm phần này</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {audioUrl && <AudioPlayer url={audioUrl} audioRef={audioRef} />}

        {/* Timestamps read-only */}
        {timestamps.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground"> Ghi chú theo thời gian</p>
            {timestamps.map((ts, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b text-xs">
                <button
                  onClick={() => seekTo(ts.time)}
                  className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-mono font-bold cursor-pointer hover:bg-primary/20 transition-colors shrink-0"
                >
                  [{formatTime(ts.time)}]
                </button>
                <span className="text-foreground/80">{ts.note}</span>
              </div>
            ))}
          </div>
        )}

        {/* Score summary */}
        <div className="bg-card rounded-2xl border p-5">
          <div className="flex flex-col items-center gap-3">
            {overall != null && (
              <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center">
                <span className="font-display text-3xl font-black text-primary">{overall}</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {CRITERIA.map(c => {
                const score = scores[c.key];
                return (
                  <div key={c.key} className="bg-muted/50 rounded-xl px-3 py-2 text-center min-w-[60px]">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{c.short}</p>
                    <p className="font-display text-lg font-extrabold">{score || "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Overall comment */}
        {comment && (
          <div className="bg-primary/5 border-l-[3px] border-primary rounded-r-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                GV
              </div>
              <span className="text-sm font-semibold">Nhận xét từ giáo viên</span>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{comment}</p>
          </div>
        )}
      </div>
    );
  }

  /* ── Teacher grading mode ── */

  const timestampSection = (
    <div className="space-y-2">
      {!tsEditing ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTsTime(audioRef.current?.currentTime || 0);
            setTsEditing(true);
          }}
        >
          <Pin className="h-3.5 w-3.5 mr-1.5" />
           Ghi chú tại thời điểm này
        </Button>
      ) : (
        <div className="bg-muted/30 rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-mono font-bold shrink-0">
              [{formatTime(tsTime)}]
            </span>
            <Textarea
              value={tsNote}
              onChange={e => setTsNote(e.target.value)}
              placeholder="Ghi chú..."
              className="text-xs min-h-[40px] rounded-lg resize-none flex-1"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTsEditing(false)}>Huỷ</Button>
            <Button size="sm" className="h-7 text-xs" onClick={addTimestamp}>Lưu</Button>
          </div>
        </div>
      )}

      {timestamps.length > 0 && (
        <div className="space-y-0.5">
          {timestamps.map((ts, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b text-xs">
              <button
                onClick={() => seekTo(ts.time)}
                className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-mono font-bold cursor-pointer hover:bg-primary/20 transition-colors shrink-0"
              >
                [{formatTime(ts.time)}]
              </button>
              <span className="flex-1 text-foreground/80">{ts.note}</span>
              <button
                onClick={() => removeTimestamp(i)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const firstUnscored = CRITERIA.find(c => !scores[c.key])?.key || CRITERIA[0].key;

  const criteriaSection = (
    <Accordion type="single" collapsible defaultValue={firstUnscored} className="space-y-2">
      {CRITERIA.map(c => {
        const value = scores[c.key];
        return (
          <AccordionItem key={c.key} value={c.key} className="rounded-xl border bg-card overflow-hidden">
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline [&[data-state=open]>div>.score]:hidden">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-bold text-foreground">{c.label}</span>
                {value && (
                  <span className="score ml-auto mr-2 text-lg font-extrabold text-primary">{value}</span>
                )}
                {!value && (
                  <span className="ml-auto mr-2 text-xs text-muted-foreground">Chưa chấm</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-3">
              {value && (
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-primary">{value}</span>
                </div>
              )}

              <BandPills
                value={value}
                onChange={v => setScores({ ...scores, [c.key]: v })}
                criteriaKey={c.key}
                descriptors={speakingDescriptors}
              />

              <FeedbackTemplatePicker
                skill="speaking"
                criteria="general"
                bandScore={value}
                onSelect={text => setCriteriaComments({
                  ...criteriaComments,
                  [c.key]: criteriaComments[c.key] ? criteriaComments[c.key] + "\n" + text : text,
                })}
              />

              <Textarea
                value={criteriaComments[c.key] || ""}
                onChange={e => setCriteriaComments({ ...criteriaComments, [c.key]: e.target.value })}
                placeholder={`Nhận xét ${c.short}...`}
                className="text-xs min-h-[56px] rounded-lg resize-none"
                maxLength={500}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  const actionBar = (
    <div
      className={cn(
        "bg-card border-t p-3 flex items-center gap-3 z-30",
        isMobile
          ? "fixed bottom-0 left-0 right-0"
          : "sticky bottom-0"
      )}
      style={isMobile ? { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" } : undefined}
    >
      <span className="text-xs text-muted-foreground flex-1">
        {scoredCount}/4 criteria đã chấm
      </span>
      <Button variant="outline" size="sm" onClick={() => saveAll(true)} disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
        Lưu nháp
      </Button>
      <Button size="sm" onClick={() => saveAll(false)} disabled={saving || !allScored}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
        Hoàn thành & Gửi
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {audioUrl && <AudioPlayer url={audioUrl} audioRef={audioRef} />}

      {audioUrl && timestampSection}

      {/* Overall band */}
      {overall != null && (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center">
            <span className="font-display text-4xl font-black text-primary">{overall}</span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">Overall Band</span>
        </div>
      )}

      {criteriaSection}

      {/* Overall comment */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase">Nhận xét tổng quan</label>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Nhận xét chung về phần nói..."
          className="text-sm min-h-[80px] rounded-lg resize-none"
          maxLength={2000}
        />
        <SaveTemplateButton skill="speaking" comment={comment} />
      </div>

      {actionBar}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@shared/components/ui/resizable";
import { Button } from "@shared/components/ui/button";
import { AlertCircle, Pencil, CheckCircle, MessageSquare, Trash2, EyeOff, FileText, ClipboardCheck, Loader2, Check, Save, Send, Download, Share2, Mail } from "lucide-react";
import { cn } from "@shared/lib/utils";
import AnnotatedText, { type Annotation } from "./AnnotatedText";
import AnnotationToolbar from "./AnnotationToolbar";
import GradingScorePanel from "./GradingScorePanel";
import AnnotationList from "./AnnotationList";
import { generateFeedbackPdf } from "@shared/utils/feedbackPdf";

interface WritingGraderProps {
  resultId: string;
  taskKey: string;
  studentId: string;
  studentName?: string;
  responseText: string;
  taskPrompt: string;
  assessmentName?: string;
  onComplete?: () => void;
}

const TYPE_META: Record<string, { icon: typeof AlertCircle; label: string; color: string }> = {
  error: { icon: AlertCircle, label: "Lỗi", color: "hsl(var(--annotation-error))" },
  correction: { icon: Pencil, label: "Gợi ý", color: "hsl(var(--annotation-correction))" },
  good: { icon: CheckCircle, label: "Hay", color: "hsl(var(--annotation-good))" },
  comment: { icon: MessageSquare, label: "Ghi chú", color: "hsl(var(--annotation-comment))" },
};

export default function WritingGrader({
  resultId, taskKey, studentId, studentName, responseText, taskPrompt, assessmentName, onComplete,
}: WritingGraderProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  // Feedback state
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"draft" | "published">("draft");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [feedbackSource, setFeedbackSource] = useState("manual");
  const [scores, setScores] = useState<Record<string, string>>({
    task_achievement: "", coherence_cohesion: "", lexical_resource: "", grammar_accuracy: "",
  });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(["error", "correction", "good", "comment"]));
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Per-criteria comments
  const [criteriaComments, setCriteriaComments] = useState<Record<string, string>>({});

  // Load existing feedback + annotations
  useEffect(() => {
    const load = async () => {
      const { data: fb } = await supabase
        .from("writing_feedback" as any)
        .select("*")
        .eq("result_id", resultId)
        .eq("task_key", taskKey)
        .maybeSingle() as any;

      if (fb) {
        setFeedbackId(fb.id);
        setFeedbackStatus(fb.status || "draft");
        setShareToken(fb.share_token || null);
        setScores({
          task_achievement: fb.task_achievement != null ? String(fb.task_achievement) : "",
          coherence_cohesion: fb.coherence_cohesion != null ? String(fb.coherence_cohesion) : "",
          lexical_resource: fb.lexical_resource != null ? String(fb.lexical_resource) : "",
          grammar_accuracy: fb.grammar_accuracy != null ? String(fb.grammar_accuracy) : "",
        });
        setComment(fb.comment || "");

        // Load annotations
        const { data: anns } = await supabase
          .from("writing_annotations" as any)
          .select("*")
          .eq("feedback_id", fb.id)
          .order("start_offset") as any;

        if (anns) setAnnotations(anns);
      }
    };
    load();
  }, [resultId, taskKey]);

  const addAnnotation = useCallback((ann: Omit<Annotation, "id">) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setAnnotations(prev => [...prev, { ...ann, id: tempId }].sort((a, b) => a.start_offset - b.start_offset));
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAllAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const toggleType = (type: string) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Count scored criteria
  const scoredCount = Object.values(scores).filter(v => v).length;
  const allScored = scoredCount === 4;

  // Calculate overall band (IELTS rounding: .25 rounds up)
  const calcOverall = (): number | null => {
    const vals = Object.values(scores).filter(v => v).map(Number);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 2) / 2;
  };
  const overall = calcOverall();

  const buildUpsertPayload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      result_id: resultId,
      task_key: taskKey,
      student_id: studentId,
      teacher_id: user.id,
      task_achievement: scores.task_achievement ? Number(scores.task_achievement) : null,
      coherence_cohesion: scores.coherence_cohesion ? Number(scores.coherence_cohesion) : null,
      lexical_resource: scores.lexical_resource ? Number(scores.lexical_resource) : null,
      grammar_accuracy: scores.grammar_accuracy ? Number(scores.grammar_accuracy) : null,
      overall_band: overall,
      comment: comment.trim() || null,
      feedback_source: feedbackSource,
      updated_at: new Date().toISOString(),
      status: "draft",
    };
  };

  const saveAll = async (isDraft: boolean) => {
    const hasAny = Object.values(scores).some(v => v) || comment.trim() || annotations.length > 0;
    if (!hasAny) { toast.error("Vui lòng nhập điểm, nhận xét hoặc annotation"); return; }
    if (!isDraft && !allScored) { toast.error("Vui lòng chấm đủ 4 tiêu chí"); return; }

    setSaving(true);

    const payload = await buildUpsertPayload();
    if (!payload) { setSaving(false); return; }

    // If publishing, set status
    if (!isDraft) {
      (payload as any).status = "published";
    }

    // 1. Upsert feedback
    const { data: feedback, error: fbErr } = await supabase
      .from("writing_feedback" as any)
      .upsert(payload as any, { onConflict: "result_id,task_key" })
      .select()
      .single() as any;

    if (fbErr || !feedback) {
      toast.error(fbErr?.message || "Lỗi lưu feedback");
      setSaving(false);
      return;
    }

    setFeedbackId(feedback.id);
    setFeedbackStatus(feedback.status || "draft");
    setShareToken(feedback.share_token || null);

    // 2. Delete old annotations, insert new
    await supabase.from("writing_annotations" as any).delete().eq("feedback_id", feedback.id);

    if (annotations.length > 0) {
      const annPayload = annotations.map(a => ({
        feedback_id: feedback.id,
        start_offset: a.start_offset,
        end_offset: a.end_offset,
        original_text: a.original_text,
        annotation_type: a.annotation_type,
        category: a.category || null,
        correction: a.correction || null,
        comment: a.comment || null,
      }));
      const { error: annErr } = await supabase.from("writing_annotations" as any).insert(annPayload as any);
      if (annErr) toast.error("Lỗi lưu annotations: " + annErr.message);
    }

    if (!isDraft) {
      // Use updated feedback ID for notification
      setFeedbackId(feedback.id);
      await notifyStudent(feedback.share_token, feedback.overall_band, feedback.comment);
      toast.success("Đã công bố và gửi thông báo cho học viên!");
      onComplete?.();
    } else {
      toast.success("Đã lưu nháp");
    }

    setSaving(false);
  };

  const notifyStudent = async (token?: string | null, band?: number | null, cmt?: string | null) => {
    try {
      // 1. In-app notification
      await supabase.from("notifications").insert({
        user_id: studentId,
        type: "writing_feedback",
        title: "Có nhận xét Writing mới từ giáo viên!",
        body: `Bài ${assessmentName || "Writing"} đã được chấm${band != null ? ` — Band ${band}` : ""}.`,
        link: "/improve",
      });
      // 2. Email (best-effort, don't block on failure)
      const { data: emails } = await supabase.rpc("get_user_emails", { user_ids: [studentId] });
      const studentEmail = (emails as any[])?.[0]?.email;
      if (!studentEmail) return;
      const taskLabel = taskKey === "task_1" ? "Task 1" : taskKey === "task_2" ? "Task 2" : taskKey;
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "feedback-published",
          recipientEmail: studentEmail,
          idempotencyKey: `writing-fb-${feedbackId}-${Date.now()}`,
          templateData: {
            studentName: studentName || "bạn",
            teacherName: "Giáo viên Learning Plus",
            skill: "Writing",
            assessmentName: assessmentName || "",
            taskLabel,
            overallBand: band ?? overall ?? null,
            comment: cmt || comment || "",
            reviewUrl: `${window.location.origin}/improve`,
            publicUrl: token ? `${window.location.origin}/feedback/${token}` : undefined,
          },
        },
      });
    } catch (e) {
      console.warn("notifyStudent failed (non-blocking):", e);
    }
  };

  const publishFeedback = async () => {
    if (!feedbackId) return;
    if (!allScored) { toast.error("Vui lòng chấm đủ 4 tiêu chí trước khi công bố"); return; }
    setPublishing(true);
    const { data: updated, error } = await supabase
      .from("writing_feedback" as any)
      .update({ status: "published", updated_at: new Date().toISOString() } as any)
      .eq("id", feedbackId)
      .select("share_token, overall_band, comment")
      .single() as any;
    if (error) {
      toast.error("Lỗi công bố: " + error.message);
      setPublishing(false);
      return;
    }
    setFeedbackStatus("published");
    if (updated?.share_token) setShareToken(updated.share_token);
    await notifyStudent(updated?.share_token, updated?.overall_band, updated?.comment);
    toast.success("Đã công bố nhận xét và gửi thông báo!");
    onComplete?.();
    setPublishing(false);
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await generateFeedbackPdf({
        studentName: studentName || "Học viên",
        assessmentName: assessmentName || "",
        taskKey,
        responseText,
        taskPrompt,
        scores,
        overall,
        comment,
        annotations,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${studentName || "student"}-${taskKey}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Lỗi tạo PDF");
      console.error(err);
    }
  };

  const handleShare = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/feedback/${shareToken}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Nhận xét Writing — ${studentName || "Học viên"}`, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link!");
    }
  };

  const handleCopyLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/feedback/${shareToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Đã copy link nhận xét!");
  };

  // Count by type
  const counts = annotations.reduce((acc, a) => {
    acc[a.annotation_type] = (acc[a.annotation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summaryBar = (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20 text-xs flex-wrap">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
        Đánh dấu
      </span>
      {Object.entries(TYPE_META).map(([type, meta]) => {
        const Icon = meta.icon;
        const count = counts[type] || 0;
        const visible = visibleTypes.has(type);
        return (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={cn(
              "flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg font-medium transition-all text-xs",
              visible
                ? "border shadow-sm"
                : "opacity-40 hover:opacity-60",
            )}
            style={visible ? {
              color: meta.color,
              backgroundColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue(`--annotation-${type}`).trim()} / 0.08)`,
              borderColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue(`--annotation-${type}`).trim()} / 0.25)`,
            } : { color: meta.color }}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="font-semibold">{count}</span>
            <span className="hidden sm:inline">{meta.label}</span>
            {!visible && <EyeOff className="h-2.5 w-2.5" />}
          </button>
        );
      })}
      {annotations.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            Tổng: {annotations.length}
          </span>
          <button
            onClick={clearAllAnnotations}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-destructive hover:bg-destructive/10 transition-colors font-medium"
          >
            <Trash2 className="h-3 w-3" /> Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );

  const responsePanel = (
    <div ref={containerRef} className="relative flex-1 min-h-0 overflow-y-auto">
      {summaryBar}
      <div className="p-5">
        <div data-text-content>
          <AnnotatedText
            text={responseText}
            annotations={annotations}
            visibleTypes={visibleTypes}
            onAnnotationClick={removeAnnotation}
            highlightedId={highlightedId}
          />
        </div>
      </div>
      <AnnotationToolbar containerRef={containerRef} onAddAnnotation={addAnnotation} />
    </div>
  );

  const actionBar = (
    <div
      className={cn(
        "bg-card border-t p-3 z-30",
        isMobile
          ? "fixed bottom-0 left-0 right-0"
          : "sticky bottom-0"
      )}
      style={isMobile ? { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" } : undefined}
    >
      {/* Share/export row — only show when feedback exists */}
      {feedbackId && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
          <Button variant="ghost" size="sm" onClick={handleDownloadPdf} className="h-7 text-xs gap-1.5">
            <Download className="h-3 w-3" /> PDF
          </Button>
          {feedbackStatus === "published" && shareToken && (
            <>
              <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-7 text-xs gap-1.5">
                <Mail className="h-3 w-3" /> Copy link
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare} className="h-7 text-xs gap-1.5">
                <Share2 className="h-3 w-3" /> Chia sẻ
              </Button>
            </>
          )}
          {feedbackStatus === "published" && (
            <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              Đã công bố
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground flex-1">
          {scoredCount}/4 criteria đã chấm
        </span>
        <Button variant="outline" size="sm" onClick={() => saveAll(true)} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Lưu nháp
        </Button>
        {feedbackStatus === "draft" ? (
          <Button size="sm" onClick={() => saveAll(false)} disabled={saving || !allScored}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Công bố
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={publishFeedback} disabled={publishing}>
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            Cập nhật
          </Button>
        )}
      </div>
    </div>
  );

  const scorePanel = (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <div className="p-4 flex-1 space-y-4">
        <AnnotationList
          annotations={annotations}
          onRemove={removeAnnotation}
          onHighlight={setHighlightedId}
          highlightedId={highlightedId}
        />
        <GradingScorePanel
          scores={scores}
          setScores={setScores}
          criteriaComments={criteriaComments}
          setCriteriaComments={setCriteriaComments}
          comment={comment}
          setComment={setComment}
          saving={saving}
          onSave={() => saveAll(false)}
          onCancel={() => {}}
          setFeedbackSource={setFeedbackSource}
          writingResponseText={responseText}
          taskPrompt={taskPrompt}
          annotations={annotations}
          stickyActions
          overall={overall}
          taskType={taskKey?.includes("1") ? "task1" : "task2"}
        />
      </div>
      {actionBar}
    </div>
  );

  // Mobile: tabs
  if (isMobile) {
    return (
      <Tabs defaultValue="response" className="flex flex-col h-full">
        <TabsList className="grid grid-cols-2 mx-4 mt-2 shrink-0">
          <TabsTrigger value="response" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Bài viết
          </TabsTrigger>
          <TabsTrigger value="grading" className="gap-1.5 text-xs">
            <ClipboardCheck className="h-3.5 w-3.5" /> Chấm điểm
          </TabsTrigger>
        </TabsList>
        <TabsContent value="response" className="flex-1 min-h-0 overflow-hidden mt-0">
          {responsePanel}
        </TabsContent>
        <TabsContent value="grading" className="flex-1 min-h-0 overflow-hidden mt-0">
          {scorePanel}
        </TabsContent>
      </Tabs>
    );
  }

  // Desktop: resizable split panel
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={55} minSize={35}>
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Bài viết học viên
            </h3>
          </div>
          {responsePanel}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={45} minSize={30}>
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" /> Chấm điểm
            </h3>
          </div>
          {scorePanel}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

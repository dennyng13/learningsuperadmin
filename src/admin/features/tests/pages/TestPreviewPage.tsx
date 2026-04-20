import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  ArrowLeft, BookOpen, Headphones, PenTool, Clock, Play,
  AlertTriangle, CheckCircle2, Loader2, Pencil, Save, X, EyeOff,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@shared/components/ui/dialog";
import { useExamAssessment } from "@shared/hooks/useExamAssessment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function TestPreviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: assessment, isLoading } = useExamAssessment(id);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const queryClient = useQueryClient();

  // Also fetch raw assessment row for status
  const [status, setStatus] = useState<string | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);

  // Fetch status from assessments table
  if (id && !statusLoaded) {
    supabase.from("assessments").select("status").eq("id", id).single().then(({ data }) => {
      setStatus(data?.status || "draft");
      setStatusLoaded(true);
    });
  }

  const handlePublish = async () => {
    if (!id) return;
    setPublishing(true);
    const { error } = await supabase
      .from("assessments")
      .update({ status: "published" })
      .eq("id", id);
    setPublishing(false);
    if (error) {
      toast.error("Lỗi publish: " + error.message);
    } else {
      toast.success("Đã publish đề thi!");
      setStatus("published");
      setShowPublishDialog(false);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["exam-assessment", id] });
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    setPublishing(true);
    const { error } = await supabase
      .from("assessments")
      .update({ status: "draft" })
      .eq("id", id);
    setPublishing(false);
    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã chuyển về nháp");
      setStatus("draft");
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["exam-assessment", id] });
    }
  };

  if (isLoading || !statusLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4 py-20">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-bold">Không tìm thấy đề thi</h2>
        <Button onClick={() => navigate("/admin/tests")}>Quay lại</Button>
      </div>
    );
  }

  const isPublished = status === "published";
  const totalQuestions = assessment.parts.reduce(
    (s, p) => s + p.questionGroups.reduce((gs, g) => gs + g.questions.length, 0), 0
  );

  // Validation checks
  const checks = [
    { ok: assessment.parts.length > 0, text: "Đề thi có ít nhất 1 part" },
    { ok: totalQuestions > 0, text: `Có ${totalQuestions} câu hỏi` },
    ...assessment.parts.map((p, i) => ({
      ok: p.questionGroups.length > 0,
      text: `${p.title} có câu hỏi`,
    })),
    ...assessment.parts.map((p) => ({
      ok: !!(p.passage?.content),
      text: `${p.title} có passage/transcript`,
    })),
    ...(assessment.sectionType === "LISTENING"
      ? assessment.parts.map((p) => ({
          ok: !!p.audioUrl,
          text: `${p.title} có audio`,
        }))
      : []),
  ];
  const warnings = checks.filter((c) => !c.ok);
  const passed = checks.filter((c) => c.ok);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-extrabold truncate">Xem trước: {assessment.name}</h1>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isPublished ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
            }`}>
              {isPublished ? "Published" : "Nháp"}
            </span>
          </div>
          {assessment.bookName && <p className="text-xs text-muted-foreground">{assessment.bookName}</p>}
        </div>
        <Button variant="outline" onClick={() => navigate(`/admin/tests/${id}`)} className="gap-2 rounded-xl">
          <PenTool className="h-4 w-4" /> Chỉnh sửa
        </Button>
        {assessment.sectionType === "LISTENING" && (
          <Button
            variant="outline"
            onClick={() => navigate(`/listening/${id}`)}
            className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            <Play className="h-4 w-4" /> Thử làm bài
          </Button>
        )}
        {assessment.sectionType === "READING" && (
          <Button
            variant="outline"
            onClick={() => navigate(`/exam/${id}`)}
            className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            <Play className="h-4 w-4" /> Thử làm bài
          </Button>
        )}
        {!isPublished ? (
          <Button onClick={() => setShowPublishDialog(true)} className="gap-2 rounded-xl">
            <CheckCircle2 className="h-4 w-4" /> Publish
          </Button>
        ) : (
          <Button variant="outline" onClick={handleUnpublish} disabled={publishing} className="gap-2 rounded-xl text-accent border-accent/30 hover:bg-accent/10">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />} Unpublish
          </Button>
        )}
      </div>

      {/* Overview — Quick Edit */}
      <QuickEditOverview
        id={id!}
        name={assessment.name}
        bookName={assessment.bookName || ""}
        sectionType={assessment.sectionType}
        duration={assessment.duration}
        totalQuestions={totalQuestions}
        partsCount={assessment.parts.length}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["exam-assessment", id] });
          queryClient.invalidateQueries({ queryKey: ["assessments"] });
        }}
      />

      {/* Validation */}
      <div className="bg-card rounded-xl border p-5 space-y-3">
        <div className="flex items-center gap-2">
          {warnings.length > 0 ? (
            <AlertTriangle className="h-5 w-5 text-accent" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          )}
          <h2 className="font-bold text-sm">
            Kiểm tra đề thi ({passed.length}/{checks.length} đạt)
          </h2>
        </div>
        <div className="space-y-1.5">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {c.ok ? (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-accent flex-shrink-0" />
              )}
              <span className={c.ok ? "text-foreground" : "text-accent font-medium"}>{c.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Parts detail */}
      {assessment.parts.map((part, pi) => (
        <div key={part.id} className="space-y-4">
          <h2 className="font-display font-bold text-base flex items-center gap-2">
            {assessment.sectionType === "LISTENING" ? (
              <Headphones className="h-5 w-5 text-primary" />
            ) : (
              <BookOpen className="h-5 w-5 text-primary" />
            )}
            {part.title}
            {part.audioUrl && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                 Có audio
              </span>
            )}
          </h2>

          {/* Audio preview for listening */}
          {part.audioUrl && assessment.sectionType === "LISTENING" && (
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Audio Preview</p>
              <audio controls src={part.audioUrl} className="w-full h-10" preload="metadata">
                Trình duyệt không hỗ trợ phát audio.
              </audio>
            </div>
          )}

          {/* Passage / Transcript */}
          {part.passage?.content && (
            <div className="bg-card rounded-xl border p-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {assessment.sectionType === "LISTENING" ? "Transcript" : "Passage"}
              </p>
              <div className="prose prose-sm max-w-none text-sm text-foreground max-h-60 overflow-y-auto whitespace-pre-wrap">
                {part.passage.content}
              </div>
            </div>
          )}

          {/* Question groups */}
          {part.questionGroups.map((group) => (
            <div key={group.id} className="bg-card rounded-xl border p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold bg-dark text-dark-foreground px-2 py-0.5 rounded-md">
                  {group.type.replace(/_/g, " ").replace(/^[rl] /, "")}
                </span>
                <h3 className="font-bold text-sm">{group.title}</h3>
                <span className="text-[10px] text-muted-foreground">
                  (Q{group.startQuestionNumber}–{group.endQuestionNumber})
                </span>
              </div>
              {group.description && (
                <p className="text-xs text-muted-foreground italic">{group.description}</p>
              )}
              {group.completionParagraph && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {group.completionParagraph}
                </div>
              )}
              {/* Group-level choices */}
              {group.choices && group.choices.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {group.choices.map((c) => (
                    <span key={c.id} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                      {c.content}
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {group.questions.map((q) => (
                  <div key={q.id} className="flex gap-3 items-start text-sm">
                    <span className="font-bold text-muted-foreground w-6 text-right flex-shrink-0">{q.questionNumber}.</span>
                    <div className="flex-1">
                      {q.title && <p>{q.title}</p>}
                      {q.choices && q.choices.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {q.choices.map((c) => (
                            <span key={c.id} className={`text-xs px-2 py-0.5 rounded-md ${
                              q.correctAnswer === c.content || q.correctAnswer === String.fromCharCode(65 + c.order)
                                ? "bg-primary/15 text-primary font-bold"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {String.fromCharCode(65 + c.order)}. {c.content}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-primary font-semibold mt-0.5">
                        Đáp án: {q.correctAnswer}
                      </p>
                      {q.explain && (
                        <p className="text-xs text-muted-foreground italic mt-0.5"> {q.explain}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Publish đề thi</DialogTitle>
            <DialogDescription>
              Sau khi publish, đề thi sẽ hiển thị cho thí sinh trong mục "Thi thử". Bạn vẫn có thể chỉnh sửa sau.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <p className="font-semibold">{assessment.name}</p>
            <p className="text-xs text-muted-foreground">{assessment.bookName || assessment.sectionType}</p>
            <p className="text-xs text-muted-foreground">{totalQuestions} câu hỏi · {assessment.parts.length} parts</p>
          </div>
          {warnings.length > 0 && (
            <div className="bg-accent/10 rounded-lg p-3 space-y-1">
              <p className="text-xs font-bold text-accent flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Còn {warnings.length} cảnh báo
              </p>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {w.text}</p>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)} className="rounded-xl">Hủy</Button>
            <Button onClick={handlePublish} disabled={publishing} className="rounded-xl gap-2">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Xác nhận Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Helper Components ---------- */

function QuickEditOverview({
  id, name, bookName, sectionType, duration, totalQuestions, partsCount, onSaved,
}: {
  id: string; name: string; bookName: string; sectionType: string;
  duration: number; totalQuestions: number; partsCount: number; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editBook, setEditBook] = useState(bookName);
  const [editDuration, setEditDuration] = useState(Math.floor(duration / 60));

  const startEdit = () => {
    setEditName(name);
    setEditBook(bookName);
    setEditDuration(Math.floor(duration / 60));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) { toast.error("Tên không được để trống"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("assessments")
      .update({
        name: editName.trim(),
        book_name: editBook.trim() || null,
        duration: editDuration * 60,
      })
      .eq("id", id);
    setSaving(false);
    if (error) { toast.error("Lỗi lưu: " + error.message); return; }
    toast.success("Đã cập nhật thông tin đề thi");
    setEditing(false);
    onSaved();
  };

  if (editing) {
    return (
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm">Chỉnh sửa thông tin</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1 h-7 text-xs">
              <X className="h-3.5 w-3.5" /> Hủy
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 h-7 text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Lưu
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tên đề thi</label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bộ sách</label>
            <Input value={editBook} onChange={e => setEditBook(e.target.value)} placeholder="—" className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Thời gian (phút)</label>
            <Input type="number" min={1} value={editDuration} onChange={e => setEditDuration(Math.max(1, parseInt(e.target.value) || 1))} className="h-9 text-sm w-28" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm">Thông tin đề thi</h2>
        <Button size="sm" variant="ghost" onClick={startEdit} className="gap-1 h-7 text-xs text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" /> Sửa nhanh
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <InfoRow label="Tên" value={name} />
        <InfoRow label="Bộ sách" value={bookName || "—"} />
        <InfoRow label="Loại đề" value={sectionType} />
        <InfoRow label="Thời gian" value={`${Math.floor(duration / 60)} phút`} />
        <InfoRow label="Số câu hỏi" value={`${totalQuestions}`} />
        <InfoRow label="Số part" value={`${partsCount}`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}

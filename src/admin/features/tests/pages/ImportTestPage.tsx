import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import { cn } from "@shared/lib/utils";
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowRight, Pencil,
  Coins, ShieldAlert, ClipboardPaste,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { useModuleAccess } from "@shared/hooks/useModuleAccess";
import { toast } from "sonner";
import {
  READING_QUESTION_TYPE_LABELS, LISTENING_QUESTION_TYPE_LABELS,
  type ReadingQuestionType, type ListeningQuestionType,
} from "@shared/types/admin";
type ImportStep = "upload" | "choose_method" | "confirm_credit" | "parsing" | "review" | "saving" | "done";

interface ParsedQuestion {
  question_number: number;
  text: string;
  correct_answer: string;
  choices?: { content: string; order: number }[];
  explain?: string;
}

interface ParsedQuestionGroup {
  title: string;
  description?: string;
  question_type: string;
  questions: ParsedQuestion[];
}

interface ParsedPart {
  title: string;
  description?: string;
  passage: { title: string; content: string };
  question_groups: ParsedQuestionGroup[];
}

interface ParsedTest {
  name: string;
  section_type: string;
  parts: ParsedPart[];
}

export default function ImportTestPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { isSuperAdmin, primaryRole } = useAuth();
  const { access } = useModuleAccess();
  const canUseAI = isSuperAdmin || access.some(a => a.role === primaryRole && a.module_key === "ai_import" && a.enabled);
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [dragActive, setDragActive] = useState(false);
  const [sectionType, setSectionType] = useState("READING");
  const [parsedData, setParsedData] = useState<ParsedTest | null>(null);
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeContent = inputMode === "paste" ? pasteText : fileContent;
  const activeName = inputMode === "paste" ? "Pasted text" : fileName;

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) { toast.error("Vui lòng dán nội dung văn bản"); return; }
    setFileContent(pasteText);
    setFileName("Pasted text");
    setStep("choose_method");
  };

  const questionTypeLabels = sectionType === "LISTENING"
    ? LISTENING_QUESTION_TYPE_LABELS
    : READING_QUESTION_TYPE_LABELS;

  const totalQuestions = parsedData
    ? parsedData.parts.reduce(
        (s, p) => s + p.question_groups.reduce((gs, g) => gs + g.questions.length, 0),
        0
      )
    : 0;

  const updateGroupType = (partIndex: number, groupIndex: number, newType: string) => {
    if (!parsedData) return;
    const updated = { ...parsedData, parts: parsedData.parts.map((p, pi) =>
      pi !== partIndex ? p : {
        ...p, question_groups: p.question_groups.map((g, gi) =>
          gi !== groupIndex ? g : { ...g, question_type: newType }
        )
      }
    )};
    setParsedData(updated);
  };

  // Estimate credit cost based on file size (rough: ~1 credit per 1000 chars)
  const estimatedCredits = Math.max(1, Math.ceil(fileContent.length / 1000));

  const handleManualCreate = async () => {
    setStep("saving");
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          name: (fileName || "Đề mới").replace(/\.[^.]+$/, ""),
          section_type: sectionType,
          total_questions: 0,
          duration: sectionType === "LISTENING" ? 30 * 60 : 60 * 60,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Đã tạo đề thi nháp");
      navigate(`/tests/${data.id}`);
    } catch (e: any) {
      toast.error("Lỗi: " + (e.message || "Unknown"));
      setStep("upload");
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "doc", "docx", "txt"].includes(ext)) {
      toast.error("Chỉ hỗ trợ file PDF, DOC, DOCX, TXT");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 20MB)");
      return;
    }

    setFileName(file.name);
    try {
      const text = await readFileAsText(file);
      setFileContent(text);
      setStep("choose_method");
    } catch {
      toast.error("Không thể đọc file");
    }
  };

  const handleConfirmAndParse = async () => {
    setStep("parsing");
    try {
      const { data, error } = await supabase.functions.invoke("parse-test", {
        body: { fileContent, fileName, sectionType },
      });

      if (error) {
        toast.error("Lỗi khi gọi AI: " + error.message);
        setStep("upload");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setStep("upload");
        return;
      }

      if (data?.data) {
        setParsedData(data.data);
        setStep("review");
      } else {
        toast.error("AI không trả về dữ liệu hợp lệ");
        setStep("upload");
      }
    } catch (e: any) {
      toast.error("Lỗi: " + (e.message || "Unknown"));
      setStep("upload");
    }
  };

  const handleSave = async () => {
    if (!parsedData) return;
    setStep("saving");

    try {
      // question_type values are already in r_*/l_* format from AI, pass through directly
      // 1. Create assessment
      const totalQ = parsedData.parts.reduce(
        (s, p) => s + p.question_groups.reduce((gs, g) => gs + g.questions.length, 0),
        0
      );
      const { data: assessment, error: aErr } = await supabase
        .from("assessments")
        .insert({
          name: parsedData.name || fileName.replace(/\.[^.]+$/, ""),
          section_type: parsedData.section_type || sectionType,
          total_questions: totalQ,
          duration: parsedData.section_type === "LISTENING" ? 30 * 60 : 60 * 60,
          status: "draft",
        })
        .select()
        .single();

      if (aErr || !assessment) throw new Error(aErr?.message || "Failed to create assessment");

      // 2. Create parts, passages, question groups, questions
      for (let pi = 0; pi < parsedData.parts.length; pi++) {
        const part = parsedData.parts[pi];

        const { data: dbPart, error: pErr } = await supabase
          .from("parts")
          .insert({
            assessment_id: assessment.id,
            title: part.title,
            description: part.description || null,
            order: pi + 1,
          })
          .select()
          .single();

        if (pErr || !dbPart) throw new Error(pErr?.message || "Failed to create part");

        // Create passage
        await supabase.from("passages").insert({
          part_id: dbPart.id,
          title: part.passage.title,
          content: part.passage.content,
        });

        // Create question groups and questions
        for (const group of part.question_groups) {
          const qNumbers = group.questions.map((q) => q.question_number);
          const startQ = Math.min(...qNumbers);
          const endQ = Math.max(...qNumbers);

          const { data: dbGroup, error: gErr } = await supabase
            .from("question_groups")
            .insert({
              part_id: dbPart.id,
              title: group.title,
              description: group.description || null,
              question_type: group.question_type,
              start_question_number: startQ,
              end_question_number: endQ,
            })
            .select()
            .single();

          if (gErr || !dbGroup) throw new Error(gErr?.message || "Failed to create question group");

          // Create questions
          for (const q of group.questions) {
            await supabase.from("questions").insert({
              question_group_id: dbGroup.id,
              question_number: q.question_number,
              text: q.text || null,
              title: q.text || null,
              correct_answer: q.correct_answer,
              choices: q.choices ? JSON.stringify(q.choices) : null,
              explain: q.explain || null,
            });
          }
        }
      }

      setSavedAssessmentId(assessment.id);
      setStep("done");
      toast.success("Import thành công!");
    } catch (e: any) {
      toast.error("Lỗi lưu dữ liệu: " + (e.message || "Unknown"));
      setStep("review");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const resetAll = () => {
    setStep("upload");
    setFileName(""); setFileContent("");
    setPasteText(""); setInputMode("file");
    setParsedData(null); setSavedAssessmentId(null);
  };

  const stepIndex = ["upload", "choose_method", "confirm_credit", "parsing", "review", "saving", "done"].indexOf(step);

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-4xl mx-auto space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="font-display text-2xl font-extrabold">Import đề thi</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload file Word/PDF để AI tự động parse câu hỏi</p>
        </div>
      )}

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs font-medium flex-wrap">
        {[
          { key: "upload", label: "Upload" },
          { key: "choose_method", label: "Phương thức" },
          ...(canUseAI ? [
            { key: "confirm_credit", label: "Xác nhận" },
            { key: "parsing", label: "AI Parse" },
            { key: "review", label: "Review" },
          ] : []),
          { key: "done", label: "Hoàn tất" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-0.5 bg-border" />}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                step === s.key || (s.key === "done" && step === "saving")
                  ? "bg-primary text-primary-foreground"
                  : stepIndex > i
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Loại đề:</label>
            <Select value={sectionType} onValueChange={setSectionType}>
              <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="READING">Reading</SelectItem>
                <SelectItem value="LISTENING">Listening</SelectItem>
                <SelectItem value="WRITING">Writing</SelectItem>
                <SelectItem value="SPEAKING">Speaking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Input mode toggle */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setInputMode("file")}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                inputMode === "file" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30"
              )}>
              <Upload className="h-4 w-4" /> Upload file
            </button>
            <button type="button" onClick={() => setInputMode("paste")}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                inputMode === "paste" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30"
              )}>
              <ClipboardPaste className="h-4 w-4" /> Dán văn bản
            </button>
          </div>

          {inputMode === "file" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-bold">Kéo thả file vào đây</p>
              <p className="text-sm text-muted-foreground mt-1">hoặc bấm nút bên dưới để chọn file</p>
              <Button type="button" variant="outline" size="sm" className="rounded-xl mt-4"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Chọn file từ máy
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Hỗ trợ: PDF, DOC, DOCX, TXT (tối đa 20MB)</p>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Dán nội dung đề thi vào đây... (passage, câu hỏi, đáp án...)"
                rows={12}
                className="rounded-xl"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {pasteText.length > 0 ? `${(pasteText.length / 1024).toFixed(1)} KB` : "Chưa có nội dung"}
                </p>
                <Button onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="rounded-xl gap-2">
                  <ArrowRight className="h-4 w-4" /> Tiếp tục
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Choose method step */}
      {step === "choose_method" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{activeName}</p>
              <p className="text-xs text-muted-foreground">{(activeContent.length / 1024).toFixed(1)} KB · Loại đề: {sectionType}</p>
            </div>
          </div>
          <p className="text-sm font-medium">Chọn phương thức xử lý:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {canUseAI && (
              <button onClick={() => setStep("confirm_credit")}
                className="bg-card rounded-xl border-2 border-primary/20 hover:border-primary p-5 text-left transition-colors space-y-2">
                <Coins className="h-6 w-6 text-amber-500" />
                <p className="font-bold text-sm">Parse bằng AI</p>
                <p className="text-xs text-muted-foreground">AI tự động nhận diện câu hỏi, đáp án. Tốn ~{estimatedCredits} credits.</p>
              </button>
            )}
            <button onClick={handleManualCreate}
              className="bg-card rounded-xl border-2 border-border hover:border-primary/50 p-5 text-left transition-colors space-y-2">
              <Pencil className="h-6 w-6 text-primary" />
              <p className="font-bold text-sm">Nhập thủ công</p>
              <p className="text-xs text-muted-foreground">Tạo đề thi nháp và tự nhập câu hỏi trong trình soạn thảo.</p>
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="text-muted-foreground">
            ← Quay lại
          </Button>
        </div>
      )}

      {/* Credit confirmation dialog */}
      <Dialog open={step === "confirm_credit"} onOpenChange={(open) => !open && setStep("upload")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Xác nhận sử dụng AI
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="bg-accent/10 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-accent-foreground">
                      Tính năng này sử dụng AI credits
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Quá trình parse file bằng AI sẽ tiêu tốn credits từ workspace của bạn.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nguồn:</span>
                  <span className="font-medium truncate max-w-[200px]">{activeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kích thước nội dung:</span>
                  <span className="font-medium">{(activeContent.length / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ước tính credits:</span>
                  <span className="font-bold text-accent">~{estimatedCredits} credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loại đề:</span>
                  <span className="font-medium">{sectionType}</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setStep("upload")}>
              Hủy
            </Button>
            <Button className="rounded-xl gap-2" onClick={handleConfirmAndParse}>
              <Coins className="h-4 w-4" />
              Đồng ý & Parse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parsing step */}
      {step === "parsing" && (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="font-bold">AI đang phân tích file...</p>
          <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
          <p className="text-xs text-muted-foreground mt-3">Đang nhận diện passage, câu hỏi và đáp án bằng AI</p>
        </div>
      )}

      {/* Review step */}
      {step === "review" && parsedData && (
        <div className="space-y-4">
          <div className="bg-primary/10 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Parse thành công!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tên đề: <strong>{parsedData.name}</strong> · Loại: <strong>{parsedData.section_type}</strong> · 
                {parsedData.parts.length} part, {totalQuestions} câu hỏi.
                Hãy kiểm tra và chỉnh sửa nếu cần.
              </p>
            </div>
          </div>

          {parsedData.parts.map((part, pi) => (
            <div key={pi} className="bg-card rounded-xl border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{part.title}</h3>
                <button className="p-1.5 rounded-lg hover:bg-muted text-primary">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground max-h-24 overflow-hidden">
                {part.passage.content.substring(0, 300)}...
              </div>

              {part.question_groups.map((group, gi) => (
                <div key={gi} className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={group.question_type}
                      onValueChange={(val) => updateGroupType(pi, gi, val)}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-auto min-w-[180px] rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(questionTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">{group.title}</span>
                  </div>
                  {group.questions.map((q) => (
                    <div key={q.question_number} className="flex items-start gap-2 text-sm pl-2">
                      <span className="text-xs font-bold text-muted-foreground w-6 pt-0.5">
                        {q.question_number}.
                      </span>
                      <div className="flex-1">
                        <p className="text-sm">{q.text}</p>
                        <span className="text-xs text-primary font-medium">→ {q.correct_answer}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div className="bg-accent/10 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Một số câu hỏi có thể chưa được nhận diện đúng dạng. Hãy kiểm tra kỹ trước khi lưu.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" className="rounded-xl" onClick={resetAll}>
              Upload lại
            </Button>
            <Button className="rounded-xl gap-2" onClick={handleSave}>
              Xác nhận & Lưu <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Saving step */}
      {step === "saving" && (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="font-bold">Đang lưu vào database...</p>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <p className="font-bold text-lg">Import hoàn tất!</p>
          <p className="text-sm text-muted-foreground mt-1">Đề thi đã được lưu dưới dạng bản nháp</p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" className="rounded-xl" onClick={resetAll}>
              Import thêm
            </Button>
            {savedAssessmentId && (
              <Button
                className="rounded-xl gap-2"
                onClick={() => navigate(`/tests/${savedAssessmentId}`)}
              >
                <FileText className="h-4 w-4" /> Mở chỉnh sửa
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

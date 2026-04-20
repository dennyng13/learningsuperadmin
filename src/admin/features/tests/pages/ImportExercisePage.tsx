import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Upload, CheckCircle, Loader2, ArrowRight, Coins, ShieldAlert, BookOpen, Headphones, PenLine, Mic, ChevronRight, ClipboardPaste, FileText, Pencil,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { useModuleAccess } from "@shared/hooks/useModuleAccess";
import { toast } from "sonner";

type ImportStep = "upload" | "choose_method" | "confirm_credit" | "parsing" | "review" | "saving" | "done";

interface ParsedQuestion {
  question: string;
  choices?: string[];
  correct_answer: string;
  explanation?: string;
}

// Course levels fetched from DB via useCourseLevels hook

interface ParsedExercise {
  title: string;
  skill: string;
  question_type: string;
  question_types: string[];
  difficulty: string;
  course_level?: string;
  passage?: string;
  questions: ParsedQuestion[];
}

const SKILLS = [
  { value: "reading", label: "Reading", icon: BookOpen },
  { value: "listening", label: "Listening", icon: Headphones },
  { value: "writing", label: "Writing", icon: PenLine },
  { value: "speaking", label: "Speaking", icon: Mic },
];

const QUESTION_TYPES: Record<string, { label: string; skills: string[] }> = {
  multiple_choice: { label: "Multiple Choice", skills: ["reading", "listening"] },
  tfng: { label: "True/False/Not Given", skills: ["reading"] },
  ynng: { label: "Yes/No/Not Given", skills: ["reading"] },
  matching_headings: { label: "Matching Headings", skills: ["reading"] },
  matching_information: { label: "Matching Information", skills: ["reading"] },
  matching_features: { label: "Matching Features", skills: ["reading"] },
  matching_sentence_endings: { label: "Matching Sentence Endings", skills: ["reading"] },
  sentence_completion: { label: "Sentence Completion", skills: ["reading", "listening"] },
  summary_completion: { label: "Summary Completion", skills: ["reading"] },
  short_answer: { label: "Short Answer", skills: ["reading", "listening"] },
  diagram_labeling: { label: "Diagram Labeling", skills: ["reading", "listening"] },
  form_completion: { label: "Form Completion", skills: ["listening"] },
  note_completion: { label: "Note Completion", skills: ["listening"] },
  table_completion: { label: "Table Completion", skills: ["listening"] },
  flow_chart: { label: "Flow Chart", skills: ["listening"] },
  task1: { label: "Task 1", skills: ["writing"] },
  task2: { label: "Task 2 (Essay)", skills: ["writing"] },
  part1: { label: "Part 1", skills: ["speaking"] },
  part2: { label: "Part 2 (Cue Card)", skills: ["speaking"] },
  part3: { label: "Part 3", skills: ["speaking"] },
};

function QuestionTypeChips({
  skill,
  selected,
  onChange,
}: {
  skill: string;
  selected: string[];
  onChange: (types: string[]) => void;
}) {
  const available = Object.entries(QUESTION_TYPES).filter(([, v]) => v.skills.includes(skill));
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter(t => t !== key));
    } else {
      onChange([...selected, key]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {available.map(([key, val]) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
            selected.includes(key)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30"
          )}
        >
          {val.label}
        </button>
      ))}
    </div>
  );
}

export default function ImportExercisePage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { user, isSuperAdmin, primaryRole } = useAuth();
  const { levels: courseLevels } = useCourseLevels();
  const { access } = useModuleAccess();
  const canUseAI = isSuperAdmin || access.some(a => a.role === primaryRole && a.module_key === "ai_import" && a.enabled);
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [dragActive, setDragActive] = useState(false);
  const [skill, setSkill] = useState("reading");
  const [parsedData, setParsedData] = useState<ParsedExercise | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeContent = inputMode === "paste" ? pasteText : fileContent;
  const activeName = inputMode === "paste" ? "Pasted text" : fileName;
  const estimatedCredits = Math.max(1, Math.ceil(activeContent.length / 1000));

  const handleManualCreate = async () => {
    if (!user) return;
    setStep("saving");
    try {
      const { data, error } = await supabase
        .from("practice_exercises")
        .insert({
          title: (fileName || "Bài tập mới").replace(/\.[^.]+$/, ""),
          skill,
          question_type: "multiple_choice",
          difficulty: "medium",
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success("Đã tạo bài tập nháp");
      navigate("/tests?type=exercise");
    } catch (e: any) {
      toast.error("Lỗi: " + (e.message || "Unknown"));
      setStep("upload");
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) { toast.error("Vui lòng dán nội dung văn bản"); return; }
    setFileContent(pasteText);
    setFileName("Pasted text");
    setStep("choose_method");
  };

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

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
      const { data, error } = await supabase.functions.invoke("parse-exercise", {
        body: { fileContent, fileName, skill },
      });
      if (error) { toast.error("Lỗi khi gọi AI: " + error.message); setStep("upload"); return; }
      if (data?.error) { toast.error(data.error); setStep("upload"); return; }
      if (data?.data) {
        const parsed = data.data;
        // Normalize: ensure question_types array exists
        if (!parsed.question_types || !Array.isArray(parsed.question_types)) {
          parsed.question_types = parsed.question_type ? [parsed.question_type] : [];
        }
        setParsedData(parsed);
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
    if (!parsedData || !user) return;
    setStep("saving");
    try {
      const questionTypes = parsedData.question_types && parsedData.question_types.length > 0
        ? parsedData.question_types
        : parsedData.question_type ? [parsedData.question_type] : [];
      const primaryType = questionTypes[0] || "multiple_choice";

      const { data, error } = await supabase
        .from("practice_exercises")
        .insert({
          title: parsedData.title,
          skill: parsedData.skill,
          question_type: primaryType,
          question_types: questionTypes,
          difficulty: parsedData.difficulty || "medium",
          course_level: parsedData.course_level || null,
          content: parsedData.passage ? { passage: parsedData.passage } : {},
          questions: parsedData.questions,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw new Error(error.message);
      setSavedId((data as any).id);
      setStep("done");
      toast.success("Import thành công!");
    } catch (e: any) {
      toast.error("Lỗi lưu: " + (e.message || "Unknown"));
      setStep("review");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const resetAll = () => {
    setStep("upload"); setFileName(""); setFileContent("");
    setPasteText(""); setInputMode("file");
    setParsedData(null); setSavedId(null);
  };

  const stepIndex = ["upload", "choose_method", "confirm_credit", "parsing", "review", "saving", "done"].indexOf(step);

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-4xl mx-auto space-y-6"}>
      {!embedded && (
        <>
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/tests?type=exercise" className="hover:text-foreground transition-colors">Kho bài tập</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Import bài tập</span>
          </nav>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Import bài tập</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload file Word/PDF để AI tự động parse câu hỏi luyện tập</p>
          </div>
        </>
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
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
              step === s.key || (s.key === "done" && step === "saving")
                ? "bg-primary text-primary-foreground"
                : stepIndex > i ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Kỹ năng:</label>
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SKILLS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Input mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                inputMode === "file"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30"
              )}
            >
              <Upload className="h-4 w-4" /> Upload file
            </button>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                inputMode === "paste"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30"
              )}
            >
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
                placeholder="Dán nội dung bài tập vào đây... (câu hỏi, đáp án, passage...)"
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
              <p className="text-xs text-muted-foreground">{(activeContent.length / 1024).toFixed(1)} KB · Kỹ năng: <span className="capitalize">{skill}</span></p>
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
              <p className="text-xs text-muted-foreground">Tạo bài tập nháp và tự nhập câu hỏi.</p>
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="text-muted-foreground">
            ← Quay lại
          </Button>
        </div>
      )}

      {/* Credit confirmation */}
      <Dialog open={step === "confirm_credit"} onOpenChange={(open) => !open && setStep("upload")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" /> Xác nhận sử dụng AI
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="bg-accent/10 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-accent-foreground">Tính năng này sử dụng AI credits</p>
                    <p className="text-muted-foreground text-xs mt-1">Quá trình parse file bằng AI sẽ tiêu tốn credits từ workspace của bạn.</p>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nguồn:</span><span className="font-medium truncate max-w-[200px]">{activeName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Kích thước nội dung:</span><span className="font-medium">{(activeContent.length / 1024).toFixed(1)} KB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ước tính credits:</span><span className="font-bold text-accent">~{estimatedCredits} credits</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Kỹ năng:</span><span className="font-medium capitalize">{skill}</span></div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setStep("upload")}>Hủy</Button>
            <Button className="rounded-xl gap-2" onClick={handleConfirmAndParse}>
              <Coins className="h-4 w-4" /> Đồng ý & Parse
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
          <p className="text-xs text-muted-foreground mt-3">Đang nhận diện câu hỏi và đáp án bằng AI</p>
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
                Tiêu đề: <strong>{parsedData.title}</strong> · Kỹ năng: <strong className="capitalize">{parsedData.skill}</strong> · 
                {parsedData.questions.length} câu hỏi. Kiểm tra và chỉnh sửa nếu cần.
              </p>
            </div>
          </div>

          {/* Editable metadata */}
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <h3 className="font-bold text-sm">Thông tin bài tập</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Tiêu đề</label>
                <Input value={parsedData.title} onChange={e => setParsedData({ ...parsedData, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Kỹ năng</label>
                <Select value={parsedData.skill} onValueChange={v => setParsedData({ ...parsedData, skill: v, question_types: [] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SKILLS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  Dạng câu hỏi <span className="font-normal">(chọn nhiều)</span>
                </label>
                <QuestionTypeChips
                  skill={parsedData.skill}
                  selected={parsedData.question_types || []}
                  onChange={types => setParsedData({ ...parsedData, question_types: types })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Độ khó</label>
                <Select value={parsedData.difficulty || "medium"} onValueChange={v => setParsedData({ ...parsedData, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Dễ</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="hard">Khó</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Khoá học</label>
                <Select value={parsedData.course_level || "_none"} onValueChange={v => setParsedData({ ...parsedData, course_level: v === "_none" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn khoá học..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Không chọn —</SelectItem>
                    {courseLevels.map(cl => (
                      <SelectItem key={cl.id} value={cl.name}>{cl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Passage */}
          {parsedData.passage && (
            <div className="bg-card rounded-xl border p-5 space-y-2">
              <h3 className="font-bold text-sm">Bài đọc / Nội dung</h3>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap">
                {parsedData.passage}
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="bg-card rounded-xl border p-5 space-y-3">
            <h3 className="font-bold text-sm">{parsedData.questions.length} câu hỏi</h3>
            {parsedData.questions.map((q, idx) => (
              <div key={idx} className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-6 pt-1">{idx + 1}.</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{q.question}</p>
                    {q.choices && q.choices.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {q.choices.map((c, ci) => (
                          <span key={ci} className={`text-xs px-2 py-0.5 rounded-md ${
                            q.correct_answer === c || q.correct_answer === String.fromCharCode(65 + ci)
                              ? "bg-primary/15 text-primary font-bold"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {String.fromCharCode(65 + ci)}. {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-primary font-medium">→ {q.correct_answer}</p>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground italic"> {q.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={resetAll}>Hủy, upload lại</Button>
            <Button onClick={handleSave} className="gap-2">
              <ArrowRight className="h-4 w-4" /> Lưu bài tập
            </Button>
          </div>
        </div>
      )}

      {/* Saving */}
      {step === "saving" && (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="font-bold">Đang lưu bài tập...</p>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="bg-card rounded-2xl border p-12 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold">Import thành công!</h2>
          <p className="text-muted-foreground text-sm">
            Bài tập đã được lưu với {parsedData?.questions.length || 0} câu hỏi.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={resetAll}>Import thêm</Button>
            <Button onClick={() => navigate("/tests?type=exercise")} className="gap-2">
              <ArrowRight className="h-4 w-4" /> Về kho bài tập
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

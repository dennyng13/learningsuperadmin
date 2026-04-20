import { useState } from "react";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { BookOpen, PenLine, FileText, RefreshCw, ChevronDown, StickyNote, Link2, Layers, Library, Paperclip, X, Image as ImageIcon, File, Loader2, Eye, EyeOff, UserCheck, UserX, Clock, ClipboardCheck, Headphones, BookMarked, Mic, MoreHorizontal, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ClassNoteFile } from "@shared/hooks/useStudyPlan";
import { LinkManager } from "./LinkManager";
import { ResourcePicker } from "./ResourcePicker";

const SESSION_SKILLS = ["L", "R", "W", "S"];
const SKILL_FULL: Record<string, string> = { L: "Listening", R: "Reading", W: "Writing", S: "Speaking" };

export const SESSION_TYPES: { value: string; label: string; icon: LucideIcon; color: string }[] = [
  { value: "Study", label: "Học chung", icon: BookOpen, color: "text-blue-600" },
  { value: "Listening", label: "Listening", icon: Headphones, color: "text-teal-600" },
  { value: "Reading", label: "Reading", icon: BookMarked, color: "text-cyan-600" },
  { value: "Writing", label: "Writing", icon: PenLine, color: "text-orange-600" },
  { value: "Speaking", label: "Speaking", icon: Mic, color: "text-rose-600" },
  { value: "Practice", label: "Practice", icon: PenLine, color: "text-amber-600" },
  { value: "Exam", label: "Exam", icon: FileText, color: "text-red-600" },
  { value: "Review", label: "Review", icon: RefreshCw, color: "text-emerald-600" },
  { value: "Other", label: "Khác", icon: MoreHorizontal, color: "text-muted-foreground" },
];

interface SessionCardProps {
  entry: any;
  idx: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: string, value: any) => void;
  exercises?: any[];
  flashcardSets?: any[];
  assessments?: any[];
  students?: { teachngo_id: string; full_name: string }[];
  selectedLevel?: string;
}

export function SessionCard({ entry, idx, isExpanded, onToggle, onUpdate, exercises, flashcardSets, assessments, students, selectedLevel }: SessionCardProps) {
  const sessionType = SESSION_TYPES.find(t => t.value === entry.session_type) || SESSION_TYPES[0];
  const Icon = sessionType.icon;

  const entryExIds = Array.isArray(entry.exercise_ids) ? entry.exercise_ids : [];
  const entryFsIds = Array.isArray(entry.flashcard_set_ids) ? entry.flashcard_set_ids : [];
  const entryAssessmentIds = Array.isArray(entry.assessment_ids) ? entry.assessment_ids : [];
  const skills = Array.isArray(entry.skills) ? entry.skills : [];
  const attendance = entry.attendance && typeof entry.attendance === "object" ? entry.attendance : {};
  const noteVisible = entry.class_note_visible !== false; // default true

  return (
    <div className={`border rounded-xl transition-all duration-200 ${isExpanded ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border hover:border-primary/20 hover:shadow-sm"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={onToggle}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isExpanded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {idx + 1}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Icon className={`w-3.5 h-3.5 ${sessionType.color}`} />
          <span className="text-xs font-medium">{sessionType.label}</span>
        </div>
        {skills.length > 0 && (
          <div className="flex gap-0.5">
            {skills.map((sk: string) => (
              <span key={sk} className="text-[9px] font-semibold text-muted-foreground bg-muted rounded px-1 py-0.5">{sk}</span>
            ))}
          </div>
        )}
        <span className="flex-1 text-xs truncate text-muted-foreground">{entry.homework || `Buổi ${idx + 1}`}</span>
        <div className="flex items-center gap-1 shrink-0">
          {!noteVisible && <EyeOff className="w-3 h-3 text-amber-500" />}
          {Object.keys(attendance).length > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-medium">
              <ClipboardCheck className="w-3 h-3" />{Object.values(attendance).filter((v: any) => v === "present").length}/{Object.keys(attendance).length}
            </span>
          )}
          {entry.class_note && <StickyNote className="w-3 h-3 text-primary/60" />}
          {(entry.class_note_files || []).length > 0 && <Paperclip className="w-3 h-3 text-primary/60" />}
          {(entry.links || []).length > 0 && <Link2 className="w-3 h-3 text-primary/60" />}
          {entryExIds.length > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-primary font-medium">
              <Layers className="w-3 h-3" />{entryExIds.length}
            </span>
          )}
          {entryFsIds.length > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-purple-600 font-medium">
              <Library className="w-3 h-3" />{entryFsIds.length}
            </span>
          )}
          {entryAssessmentIds.length > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-red-600 font-medium">
              <FileText className="w-3 h-3" />{entryAssessmentIds.length}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Loại buổi</Label>
              <Select value={entry.session_type || "Study"} onValueChange={v => onUpdate("session_type", v)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-1.5">
                        <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Ngày</Label>
              <Input type="date" className="h-8 text-xs mt-1" value={entry.entry_date}
                onChange={e => onUpdate("entry_date", e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Tiêu đề buổi học</Label>
            <Input className="h-8 text-sm mt-1" value={entry.homework}
              onChange={e => onUpdate("homework", e.target.value)}
              placeholder={`Buổi ${idx + 1}`} />
          </div>

          <div>
            <Label className="text-xs font-medium">Kỹ năng</Label>
            <div className="flex gap-1.5 mt-1.5">
              {SESSION_SKILLS.map(sk => {
                const active = skills.includes(sk);
                return (
                  <Badge key={sk} variant={active ? "default" : "outline"}
                    className="cursor-pointer text-[10px] px-2.5 py-0.5"
                    onClick={() => {
                      const newSkills = active ? skills.filter((s: string) => s !== sk) : [...skills, sk];
                      onUpdate("skills", newSkills);
                    }}>
                    {SKILL_FULL[sk] || sk}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Note visibility toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-primary" /> Ghi chú buổi học
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{noteVisible ? "Sinh viên xem được" : "Ẩn với sinh viên"}</span>
              <Switch checked={noteVisible} onCheckedChange={v => onUpdate("class_note_visible", v)} className="scale-75" />
            </div>
          </div>
          <div>
            <Textarea className="text-xs min-h-[50px]" value={entry.class_note || ""}
              onChange={e => onUpdate("class_note", e.target.value)}
              onBlur={() => onUpdate("_autosave", true)}
              placeholder="Ghi chú nội dung, lưu ý cho buổi này..." />
            <ClassNoteFileUploader
              files={entry.class_note_files || []}
              onChange={files => onUpdate("class_note_files", files)}
              entryId={entry.id}
            />
          </div>

          <div>
            <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" /> Tài liệu / Tham khảo
            </Label>
            <LinkManager
              links={entry.links || []}
              onChange={(links) => onUpdate("links", links)}
            />
          </div>

          {/* Per-session exercises */}
          {exercises && exercises.length > 0 && (
            <ResourcePicker
              label="Bài tập cho buổi này"
              icon={Layers}
              iconColor="text-primary"
              options={exercises.map((ex: any) => ({
                id: ex.id, title: ex.title, skill: ex.skill,
                course_level: ex.course_level, program: ex.program,
              }))}
              selectedIds={entryExIds}
              onChange={(ids) => onUpdate("exercise_ids", ids)}
              selectedBg="bg-primary"
              emptyHint="Chưa có bài tập phù hợp với chương trình"
            />
          )}

          {/* Per-session flashcards */}
          {flashcardSets && flashcardSets.length > 0 && (
            <ResourcePicker
              label="Bộ từ vựng cho buổi này"
              icon={Library}
              iconColor="text-purple-600"
              options={flashcardSets.map((fs: any) => ({
                id: fs.id, title: fs.title,
                course_level: fs.course_level, program: fs.program,
              }))}
              selectedIds={entryFsIds}
              onChange={(ids) => onUpdate("flashcard_set_ids", ids)}
              selectedBg="bg-purple-600"
              emptyHint="Chưa có bộ từ vựng phù hợp"
            />
          )}

          {/* Per-session assessments */}
          {assessments && assessments.length > 0 && (
            <ResourcePicker
              label="Bài thi cho buổi này"
              icon={FileText}
              iconColor="text-red-600"
              options={assessments.map((a: any) => ({
                id: a.id, title: a.name, skill: a.section_type,
                course_level: a.course_level, program: a.program,
                section_type: a.section_type,
              }))}
              selectedIds={entryAssessmentIds}
              onChange={(ids) => onUpdate("assessment_ids", ids)}
              selectedBg="bg-red-600"
              emptyHint="Chưa có bài thi phù hợp"
            />
          )}

          {/* Attendance */}
          {students && students.length > 0 && (
            <div>
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> Điểm danh
              </Label>
              <div className="flex flex-col gap-1 mt-1.5">
                {students.map(st => {
                  const status = attendance[st.teachngo_id] || "";
                  return (
                    <div key={st.teachngo_id} className="flex items-center gap-2">
                      <span className="text-xs flex-1 truncate">{st.full_name}</span>
                      <div className="flex gap-0.5">
                        {[
                          { val: "present", icon: UserCheck, label: "Có mặt", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                          { val: "absent", icon: UserX, label: "Vắng", cls: "text-red-600 bg-red-50 border-red-200" },
                          { val: "late", icon: Clock, label: "Trễ", cls: "text-amber-600 bg-amber-50 border-amber-200" },
                        ].map(opt => (
                          <Badge key={opt.val} variant="outline"
                            className={`text-[9px] cursor-pointer px-1.5 py-0.5 ${status === opt.val ? opt.cls + " font-bold" : "opacity-40 hover:opacity-70"}`}
                            onClick={() => {
                              const newAtt = { ...attendance, [st.teachngo_id]: status === opt.val ? "" : opt.val };
                              onUpdate("attendance", newAtt);
                            }}>
                            <opt.icon className="w-3 h-3 mr-0.5" />{opt.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── File Uploader for class_note ─── */
function ClassNoteFileUploader({ files, onChange, entryId }: {
  files: ClassNoteFile[];
  onChange: (files: ClassNoteFile[]) => void;
  entryId?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

    setUploading(true);
    const newFiles: ClassNoteFile[] = [];

    for (const file of Array.from(fileList)) {
      if (file.size > maxSize) {
        toast.error(`${file.name} quá lớn (tối đa 10MB)`);
        continue;
      }
      if (!allowed.includes(file.type)) {
        toast.error(`${file.name}: chỉ hỗ trợ ảnh (JPG, PNG, WebP, GIF) và PDF`);
        continue;
      }

      const ext = file.name.split(".").pop() || "bin";
      const path = `${entryId || "draft"}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage.from("class-note-files").upload(path, file);
      if (error) {
        toast.error(`Upload lỗi: ${file.name}`);
        continue;
      }

      // Bucket is private — store the path; signed URL is generated on display.
      newFiles.push({ name: file.name, url: "", type: file.type, path });
    }

    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
      toast.success(`Đã upload ${newFiles.length} file`);
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className="mt-2 space-y-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative group">
              {isImage(f.type) ? (
                <a href={f.url} target="_blank" rel="noreferrer">
                  <img src={f.url} alt={f.name} className="h-16 w-16 rounded-lg object-cover border" />
                </a>
              ) : (
                <a href={f.url} target="_blank" rel="noreferrer"
                  className="h-16 w-16 rounded-lg border flex flex-col items-center justify-center gap-1 bg-muted/50 hover:bg-muted transition-colors">
                  <File className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground truncate max-w-[56px]">{f.name}</span>
                </a>
              )}
              <button type="button" onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        {uploading ? "Đang upload..." : "Đính kèm ảnh/file"}
        <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
}

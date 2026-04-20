import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import { Card, CardContent } from "@shared/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { cn, normalizeUrl } from "@shared/lib/utils";
import { toast } from "sonner";
import { fireConfetti } from "@shared/utils/confetti";
import {
  CheckCircle2, X, Plus, ChevronDown, ChevronUp, Search,
  BookOpen, Headphones, PenLine, Mic, FileText, Library,
  UserCheck, UserX, Clock, ClipboardCheck, Loader2, StickyNote,
  PartyPopper, Pause, Link2, Gamepad2,
} from "lucide-react";

/* ─── Types ─── */

export interface SessionEntry {
  id: string;
  entry_date: string;
  session_number: number | null;
  session_title: string | null;
  session_type: string | null;
  skills: any;
  homework: string;
  plan_status: string | null;
  actual_content: string | null;
  completed_at: string | null;
  class_note: string | null;
  exercise_ids: any;
  assessment_ids: any;
  flashcard_set_ids: any;
  vocab_game_ids: any;
  attendance: any;
  is_makeup: boolean | null;
  day_of_week: string | null;
  links?: any;
}

export interface SessionStudent {
  teachngo_id: string;
  full_name: string;
}

interface Props {
  entry: SessionEntry;
  classId: string;
  students: SessionStudent[];
  onUpdate: (entryId: string, field: string, value: any) => void;
  onClose?: () => void;
}

/* ─── Skill options ─── */
const ALL_SKILLS = [
  { key: "L", label: "Listening", icon: Headphones, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "R", label: "Reading", icon: BookOpen, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "W", label: "Writing", icon: PenLine, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "S", label: "Speaking", icon: Mic, color: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "Grammar", label: "Grammar", icon: FileText, color: "bg-pink-100 text-pink-700 border-pink-200" },
  { key: "Vocab", label: "Vocab", icon: Library, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "Review", label: "Review", icon: ClipboardCheck, color: "bg-gray-100 text-gray-700 border-gray-200" },
];

type AttendanceStatus = "present" | "absent" | "late";

/* ═══════════════════════════════════════════════════════════════ */

export default function SessionDetailView({ entry, classId, students, onUpdate, onClose }: Props) {
  const isDone = entry.plan_status === "done";
  const isDelayed = entry.plan_status === "delayed";
  const sessionNum = entry.session_number || "?";

  // Local editable state
  const [title, setTitle] = useState(entry.session_title || `Buổi ${sessionNum}`);
  const [homework, setHomework] = useState(entry.homework || "");
  const [classNote, setClassNote] = useState(entry.class_note || "");
  const [actualContent, setActualContent] = useState(entry.actual_content || "");
  const [skills, setSkills] = useState<string[]>(Array.isArray(entry.skills) ? entry.skills : []);
  const [linksText, setLinksText] = useState(() => {
    const links = Array.isArray(entry.links) ? entry.links : [];
    return links.map((l: any) => typeof l === "string" ? l : `${l.label || ""}|${l.url || ""}`).join("\n");
  });

  // Attendance
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const att = entry.attendance && typeof entry.attendance === "object" ? entry.attendance as Record<string, string> : {};
    const result: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      result[s.teachngo_id] = (att[s.teachngo_id] as AttendanceStatus) || "present";
    }
    return result;
  });
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Resource IDs
  const [exerciseIds, setExerciseIds] = useState<string[]>(Array.isArray(entry.exercise_ids) ? entry.exercise_ids : []);
  const [assessmentIds, setAssessmentIds] = useState<string[]>(Array.isArray(entry.assessment_ids) ? entry.assessment_ids : []);
  const [flashcardSetIds, setFlashcardSetIds] = useState<string[]>(Array.isArray(entry.flashcard_set_ids) ? entry.flashcard_set_ids : []);
  const [vocabGameIds, setVocabGameIds] = useState<string[]>(Array.isArray(entry.vocab_game_ids) ? entry.vocab_game_ids : []);

  // Resource picker dialogs
  const [pickerType, setPickerType] = useState<"exercise" | "assessment" | "vocab" | null>(null);

  // Saving
  const [saving, setSaving] = useState(false);

  // Section collapse
  const [section1Open, setSection1Open] = useState(!isDone);
  const [section2Open, setSection2Open] = useState(!isDone);
  const [section3Open, setSection3Open] = useState(true);

  const toggleSkill = (key: string) => {
    if (isDone) return;
    setSkills(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  /* ─── Save all fields ─── */
  const saveAll = async () => {
    setSaving(true);
    const links = linksText.split("\n").filter(l => l.trim()).map(l => {
      const [label, url] = l.split("|");
      return { label: label?.trim() || "", url: normalizeUrl(url?.trim() || label?.trim() || "") };
    });

    const updateData: Record<string, any> = {
      session_title: title,
      homework,
      class_note: classNote,
      actual_content: actualContent,
      skills,
      links,
      exercise_ids: exerciseIds,
      assessment_ids: assessmentIds,
      flashcard_set_ids: flashcardSetIds,
      vocab_game_ids: vocabGameIds,
      attendance,
    };

    const { error } = await supabase
      .from("study_plan_entries")
      .update(updateData as any)
      .eq("id", entry.id);

    setSaving(false);
    if (error) {
      toast.error("Lỗi lưu: " + error.message);
    } else {
      toast.success("Đã lưu buổi học");
      // Notify parent
      for (const [field, value] of Object.entries(updateData)) {
        onUpdate(entry.id, field, value);
      }
    }
  };

  /* ─── Complete session ─── */
  const completeSession = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      plan_status: "done",
      completed_at: now,
      session_title: title,
      homework,
      class_note: classNote,
      actual_content: actualContent,
      skills,
      exercise_ids: exerciseIds,
      assessment_ids: assessmentIds,
      flashcard_set_ids: flashcardSetIds,
      vocab_game_ids: vocabGameIds,
      attendance,
    };

    const { error } = await supabase
      .from("study_plan_entries")
      .update(updateData as any)
      .eq("id", entry.id);

    setSaving(false);
    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      fireConfetti();
      toast.success(`Buổi ${sessionNum} hoàn thành!`);
      for (const [field, value] of Object.entries(updateData)) {
        onUpdate(entry.id, field, value);
      }
    }
  };

  /* ─── Delay session ─── */
  const delaySession = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("study_plan_entries")
      .update({ plan_status: "delayed" } as any)
      .eq("id", entry.id);
    setSaving(false);
    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.info(`Buổi ${sessionNum} đã được hoãn`);
      onUpdate(entry.id, "plan_status", "delayed");
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <div className={cn("h-5 w-5 rounded-full border-2", isDelayed ? "border-destructive" : "border-primary")} />
          )}
          <div>
            <p className="text-sm font-bold">
              Buổi {sessionNum} — {entry.entry_date && new Date(entry.entry_date + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
            </p>
            {isDone && (
              <p className="text-[11px] text-emerald-600 font-medium">Đã hoàn thành</p>
            )}
            {isDelayed && (
              <p className="text-[11px] text-destructive font-medium">Đã hoãn</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDone && (
            <Button size="sm" variant="outline" onClick={saveAll} disabled={saving} className="gap-1.5 text-xs">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu
            </Button>
          )}
          {onClose && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ═══ SECTION 1: Chuẩn bị ═══ */}
      <Collapsible open={section1Open} onOpenChange={setSection1Open}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full text-left py-2 group">
            <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold flex-1">Chuẩn bị</span>
            {section1Open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pb-2">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tiêu đề buổi học</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`Buổi ${sessionNum}`}
              disabled={isDone}
              className="mt-1"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Kỹ năng</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ALL_SKILLS.map(sk => {
                const active = skills.includes(sk.key);
                return (
                  <button
                    key={sk.key}
                    onClick={() => toggleSkill(sk.key)}
                    disabled={isDone}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                      active ? sk.color : "bg-muted/50 text-muted-foreground border-transparent",
                      !isDone && "hover:opacity-80 cursor-pointer",
                      isDone && "opacity-70"
                    )}
                  >
                    <sk.icon className="h-3 w-3" />
                    {sk.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Homework / Content */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nội dung buổi học</label>
            <Textarea
              value={homework}
              onChange={e => setHomework(e.target.value)}
              placeholder="VD: Cambridge 18 Test 2, Reading Passage 1 — Matching Headings"
              rows={3}
              disabled={isDone}
              className="mt-1"
            />
          </div>

          {/* Resource pickers */}
          <div className="space-y-2">
            {/* Exercises */}
            <ResourceRow
              label="Bài tập"
              icon={<PenLine className="h-3.5 w-3.5" />}
              ids={exerciseIds}
              onAdd={() => setPickerType("exercise")}
              onRemove={id => setExerciseIds(prev => prev.filter(x => x !== id))}
              disabled={isDone}
              tableName="practice_exercises"
              nameField="title"
            />
            {/* Assessments */}
            <ResourceRow
              label="Bài thi"
              icon={<FileText className="h-3.5 w-3.5" />}
              ids={assessmentIds}
              onAdd={() => setPickerType("assessment")}
              onRemove={id => setAssessmentIds(prev => prev.filter(x => x !== id))}
              disabled={isDone}
              tableName="assessments"
              nameField="name"
            />
            {/* Vocab/Flashcards */}
            <ResourceRow
              label="Bộ từ vựng"
              icon={<Gamepad2 className="h-3.5 w-3.5" />}
              ids={flashcardSetIds}
              onAdd={() => setPickerType("vocab")}
              onRemove={id => {
                setFlashcardSetIds(prev => prev.filter(x => x !== id));
                setVocabGameIds(prev => prev.filter(x => x !== id));
              }}
              disabled={isDone}
              tableName="flashcard_sets"
              nameField="title"
            />
          </div>

          {/* Links */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Tài liệu (nhãn|URL, mỗi dòng 1 link)
            </label>
            <Textarea
              value={linksText}
              onChange={e => setLinksText(e.target.value)}
              placeholder="Slide bài giảng|https://drive.google.com/..."
              rows={2}
              disabled={isDone}
              className="mt-1 text-xs"
            />
          </div>

          {/* Class note */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              Ghi chú riêng (chỉ giáo viên thấy)
            </label>
            <Textarea
              value={classNote}
              onChange={e => setClassNote(e.target.value)}
              placeholder="Ghi chú nội bộ..."
              rows={2}
              disabled={isDone}
              className="mt-1 text-xs"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ═══ SECTION 2: Điểm danh ═══ */}
      <Collapsible open={section2Open} onOpenChange={setSection2Open}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full text-left py-2 group">
            <div className="h-6 w-6 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <span className="text-sm font-semibold flex-1">Điểm danh</span>
            <span className="text-[10px] text-muted-foreground mr-1">
              {Object.values(attendance).filter(v => v === "present" || v === "late").length}/{students.length}
            </span>
            {section2Open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pb-2">
          {students.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Chưa có học viên</p>
          ) : (
            students.map(s => {
              const status = attendance[s.teachngo_id] || "present";
              const noteOpen = expandedNotes.has(s.teachngo_id);
              return (
                <div key={s.teachngo_id} className="rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium flex-1 truncate">{s.full_name}</p>
                    <div className="flex items-center gap-1">
                      {(["present", "absent", "late"] as AttendanceStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => {
                            if (isDone) return;
                            setAttendance(prev => ({ ...prev, [s.teachngo_id]: st }));
                          }}
                          disabled={isDone}
                          className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-all border",
                            status === st
                              ? st === "present" ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                : st === "absent" ? "bg-red-100 border-red-300 text-red-700"
                                : "bg-amber-100 border-amber-300 text-amber-700"
                              : "bg-muted/30 border-transparent text-muted-foreground",
                            !isDone && "hover:opacity-80"
                          )}
                          title={st === "present" ? "Có mặt" : st === "absent" ? "Vắng" : "Trễ"}
                        >
                          {st === "present" ? <UserCheck className="h-3.5 w-3.5" /> :
                           st === "absent" ? <UserX className="h-3.5 w-3.5" /> :
                           <Clock className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                      <button
                        onClick={() => setExpandedNotes(prev => {
                          const next = new Set(prev);
                          next.has(s.teachngo_id) ? next.delete(s.teachngo_id) : next.add(s.teachngo_id);
                          return next;
                        })}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        title="Ghi chú"
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {noteOpen && (
                    <Textarea
                      value={studentNotes[s.teachngo_id] || ""}
                      onChange={e => setStudentNotes(prev => ({ ...prev, [s.teachngo_id]: e.target.value }))}
                      placeholder={`Ghi chú về ${s.full_name}...`}
                      rows={2}
                      disabled={isDone}
                      className="mt-2 text-xs"
                    />
                  )}
                </div>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* ═══ SECTION 3: Kết thúc buổi ═══ */}
      <Collapsible open={section3Open} onOpenChange={setSection3Open}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full text-left py-2 group">
            <div className="h-6 w-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold flex-1">Kết thúc buổi</span>
            {section3Open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pb-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nội dung thực tế đã dạy</label>
            <Textarea
              value={actualContent}
              onChange={e => setActualContent(e.target.value)}
              placeholder="Ghi lại nội dung thực tế đã dạy (có thể khác với kế hoạch)..."
              rows={3}
              disabled={isDone}
              className="mt-1"
            />
          </div>

          {isDone ? (
            <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Buổi đã hoàn thành</p>
                {entry.completed_at && (
                  <p className="text-[11px] text-emerald-600">
                    {new Date(entry.completed_at).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={completeSession}
                disabled={saving}
                className="gap-1.5 flex-1 sm:flex-none"
                size="lg"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PartyPopper className="h-4 w-4" />}
                Hoàn thành buổi {sessionNum}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={delaySession}
                disabled={saving}
                className="gap-1 text-xs text-muted-foreground"
              >
                <Pause className="h-3.5 w-3.5" />
                Hoãn buổi
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* ─── Resource Picker Dialog ─── */}
      {pickerType && (
        <ResourcePickerDialog
          type={pickerType}
          selectedIds={
            pickerType === "exercise" ? exerciseIds :
            pickerType === "assessment" ? assessmentIds :
            flashcardSetIds
          }
          onSelect={(ids) => {
            if (pickerType === "exercise") setExerciseIds(ids);
            else if (pickerType === "assessment") setAssessmentIds(ids);
            else { setFlashcardSetIds(ids); setVocabGameIds(ids); }
            setPickerType(null);
          }}
          onClose={() => setPickerType(null)}
        />
      )}
    </div>
  );
}

/* ─── Resource Row (shows selected items + Add button) ─── */
function ResourceRow({
  label, icon, ids, onAdd, onRemove, disabled, tableName, nameField,
}: {
  label: string;
  icon: React.ReactNode;
  ids: string[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  tableName: string;
  nameField: string;
}) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ids.length === 0) return;
    const missing = ids.filter(id => !names[id]);
    if (missing.length === 0) return;
    supabase
      .from(tableName as any)
      .select(`id, ${nameField}`)
      .in("id", missing)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          for (const d of data as any[]) map[d.id] = d[nameField] || d.id;
          setNames(prev => ({ ...prev, ...map }));
        }
      });
  }, [ids]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          {icon}
          {label}
        </label>
        {!disabled && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1" onClick={onAdd}>
            <Plus className="h-3 w-3" />
            Chọn
          </Button>
        )}
      </div>
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {ids.map(id => (
            <Badge key={id} variant="secondary" className="text-[11px] gap-1 pr-1">
              <span className="truncate max-w-[140px]">{names[id] || id.slice(0, 8)}</span>
              {!disabled && (
                <button onClick={() => onRemove(id)} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Resource Picker Dialog ─── */
function ResourcePickerDialog({
  type, selectedIds, onSelect, onClose,
}: {
  type: "exercise" | "assessment" | "vocab";
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<{ id: string; name: string; meta?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    fetchItems();
  }, [type]);

  const fetchItems = async () => {
    setLoading(true);
    if (type === "exercise") {
      const { data } = await supabase
        .from("practice_exercises")
        .select("id, title, skill, difficulty, status")
        .eq("status", "published")
        .order("title");
      setItems((data || []).map((d: any) => ({ id: d.id, name: d.title, meta: `${d.skill} · ${d.difficulty}` })));
    } else if (type === "assessment") {
      const { data } = await supabase
        .from("assessments")
        .select("id, name, section_type, status")
        .eq("status", "published")
        .order("name");
      setItems((data || []).map((d: any) => ({ id: d.id, name: d.name, meta: d.section_type })));
    } else {
      const { data } = await supabase
        .from("flashcard_sets")
        .select("id, title, course_level, status")
        .eq("status", "published")
        .order("title");
      setItems((data || []).map((d: any) => ({ id: d.id, name: d.title, meta: d.course_level || "" })));
    }
    setLoading(false);
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.meta || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const titles: Record<string, string> = {
    exercise: "Chọn bài tập",
    assessment: "Chọn bài thi",
    vocab: "Chọn bộ từ vựng",
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">{titles[type]}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh]">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy</p>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                  selected.has(item.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0",
                  selected.has(item.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                )}>
                  {selected.has(item.id) && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.meta && <p className="text-[10px] text-muted-foreground">{item.meta}</p>}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">{selected.size} đã chọn</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Hủy</Button>
            <Button size="sm" onClick={() => onSelect(Array.from(selected))}>Xác nhận</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

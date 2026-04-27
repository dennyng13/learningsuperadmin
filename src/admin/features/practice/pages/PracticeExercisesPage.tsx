import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";
import {
  Plus, Trash2, Loader2, Save, ArrowLeft, Eye, EyeOff, CheckCircle2,
  BookOpen, Headphones, PenLine, Mic, Layers, FileUp, MoreVertical, Filter, X, Clock, Cloud, BarChart3, GripVertical, ChevronUp, ChevronDown, Copy, FolderPlus, Search, Tags,
} from "lucide-react";
import AudioUploader from "@admin/features/tests/components/AudioUploader";
import { uploadToWorkDrive, deleteWorkDriveByEntity } from "@shared/utils/workdriveSync";
import UnsavedChangesDialog from "@admin/features/tests/components/UnsavedChangesDialog";
import RichTextEditor from "@admin/features/tests/components/RichTextEditor";
import BlankAnswerKeySync from "@admin/features/tests/components/BlankAnswerKeySync";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getLevelColorConfig } from "@shared/utils/levelColors";
import ResourceTagManager from "@admin/features/settings/components/ResourceTagManager";
import QuestionTypeBadge from "@shared/components/misc/QuestionTypeBadge";
import { Switch } from "@shared/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { ResourceFilterBar } from "@shared/components/resources/ResourceFilterBar";
import { useResourceList } from "@shared/hooks/useResourceList";
import { useResourceCourseMutations, useCoursesForResource } from "@shared/hooks/useResourceCourses";
import { Badge } from "@shared/components/ui/badge";

const PROGRAMS = [
  { value: "ielts", label: "IELTS" },
  { value: "wre", label: "WRE" },
  { value: "customized", label: "Customized" },
  { value: "other", label: "Khác" },
];

interface Exercise {
  id: string;
  title: string;
  description: string | null;
  skill: string;
  question_type: string;
  question_types: string[];
  difficulty: string;
  course_level: string | null;
  program: string | null;
  questions: any[];
  status: string;
  created_at: string;
}

interface QuestionItem {
  question: string;
  choices?: string[];
  correct_answer: string;
  explanation?: string;
}

interface QuestionGroup {
  id: string;
  question_type: string;
  difficulty: string;
  questions: QuestionItem[];
}

// Question types that use multiple choice (A/B/C/D)
const MCQ_TYPES = new Set(["multiple_choice"]);

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

const COMPLETION_TYPES = new Set([
  "sentence_completion", "summary_completion", "form_completion",
  "note_completion", "table_completion", "flow_chart",
]);

// ---- helpers ----

function generateGroupId() {
  return "g_" + Math.random().toString(36).slice(2, 10);
}

/** Convert legacy flat questions array to groups structure */
function legacyToGroups(questions: any[], questionTypes: string[], difficulty: string): QuestionGroup[] {
  if (!questions || questions.length === 0) return [];
  // Check if already groups format
  if (questions.length > 0 && questions[0]?.question_type && Array.isArray(questions[0]?.questions)) {
    return questions as QuestionGroup[];
  }
  // Legacy: flat array → single group
  const primaryType = questionTypes?.[0] || "multiple_choice";
  return [{
    id: generateGroupId(),
    question_type: primaryType,
    difficulty,
    questions: questions as QuestionItem[],
  }];
}

/** Derive unique question_types from groups */
function deriveQuestionTypes(groups: QuestionGroup[]): string[] {
  const types = new Set<string>();
  groups.forEach(g => { if (g.question_type) types.add(g.question_type); });
  return Array.from(types);
}

/** Count total questions across groups */
function totalQuestionsCount(groups: QuestionGroup[]): number {
  return groups.reduce((sum, g) => sum + (g.questions?.length || 0), 0);
}

export default function PracticeExercisesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { levels: courseLevels } = useCourseLevels();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [syncedExerciseIds, setSyncedExerciseIds] = useState<Set<string>>(new Set());

  // Editor state — metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [program, setProgram] = useState("");
  const [courseLevel, setCourseLevel] = useState<string>("");
  const [skill, setSkill] = useState("reading");
  const [difficulty, setDifficulty] = useState("medium");

  // Editor state — content
  const [passage, setPassage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [uploadingDiagram, setUploadingDiagram] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [allowRetake, setAllowRetake] = useState(true);
  const [timerDuration, setTimerDuration] = useState(10);
  const [scoringMode, setScoringMode] = useState<"ielts_band" | "custom">("ielts_band");

  // Editor state — question groups
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [blankAnswers, setBlankAnswers] = useState<Record<number, string>>({});

  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exerciseStatus, setExerciseStatus] = useState("draft");

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Drag-and-drop for groups
  const [dragGroupIdx, setDragGroupIdx] = useState<number | null>(null);
  const [dragOverGroupIdx, setDragOverGroupIdx] = useState<number | null>(null);

  const handleGroupDragStart = (idx: number) => {
    setDragGroupIdx(idx);
  };
  const handleGroupDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverGroupIdx(idx);
  };
  const handleGroupDrop = (idx: number) => {
    if (dragGroupIdx === null || dragGroupIdx === idx) {
      setDragGroupIdx(null);
      setDragOverGroupIdx(null);
      return;
    }
    setGroups(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragGroupIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragGroupIdx(null);
    setDragOverGroupIdx(null);
  };
  const handleGroupDragEnd = () => {
    setDragGroupIdx(null);
    setDragOverGroupIdx(null);
  };

  // Dirty tracking
  const editorLoadedRef = useRef(false);
  useEffect(() => {
    if (!editing) { editorLoadedRef.current = false; return; }
    if (!editorLoadedRef.current) { editorLoadedRef.current = true; return; }
    setIsDirty(true);
  }, [title, description, program, skill, groups, difficulty, courseLevel, passage, audioUrl, transcript, diagramUrl, timerEnabled, timerDuration, scoringMode, allowRetake]);

  useEffect(() => {
    if (!isDirty || !editing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, editing]);

  const handleBack = () => { if (isDirty) setShowExitDialog(true); else setEditing(null); };
  const handleSaveAndExit = async () => { setShowExitDialog(false); await saveExercise(); setIsDirty(false); setEditing(null); };
  const handleDiscard = () => { setShowExitDialog(false); setIsDirty(false); setEditing(null); };

  // Filters — chip-based multi-select
  const [filterSkills, setFilterSkills] = useState<Set<string>>(new Set());
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterPrograms, setFilterPrograms] = useState<Set<string>>(new Set());
  const [filterLevels, setFilterLevels] = useState<Set<string>>(new Set());
  const [filterCourses, setFilterCourses] = useState<Set<string>>(new Set());
  const [levelExpanded, setLevelExpanded] = useState(false);
  const [programExpanded, setProgramExpanded] = useState(false);
  const [courseExpanded, setCourseExpanded] = useState(false);
  const [skillExpanded, setSkillExpanded] = useState(false);
  const [typeExpanded, setTypeExpanded] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [showListSearch, setShowListSearch] = useState(false);

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const fetchExercises = async () => {
    const { data, error } = await supabase
      .from("practice_exercises")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      setExercises((data || []).map((d: any) => ({
        ...d,
        question_types: Array.isArray(d.question_types) && d.question_types.length > 0
          ? d.question_types
          : d.question_type ? [d.question_type] : [],
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, []);

  useEffect(() => {
    const fetchSyncStatus = async () => {
      const { data } = await supabase.from("workdrive_sync").select("entity_id").eq("entity_type", "practice_exercise");
      if (data) setSyncedExerciseIds(new Set(data.map(d => d.entity_id)));
    };
    fetchSyncStatus();
  }, [exercises]);

  const getEffectiveTypes = (ex: Exercise): string[] => {
    if (ex.question_types && ex.question_types.length > 0) return ex.question_types;
    if (ex.question_type) return [ex.question_type];
    return [];
  };

  // ---- Editor open/create ----

  const createNew = () => {
    setTitle(""); setDescription(""); setProgram("ielts"); setSkill("reading");
    setDifficulty("medium"); setCourseLevel("");
    setPassage(""); setAudioUrl(""); setTranscript(""); setDiagramUrl("");
    setGroups([]); setTimerEnabled(false); setTimerDuration(10);
    setScoringMode("ielts_band");
    setAllowRetake(true);
    setBlankAnswers({}); setExpandedGroups(new Set());
    setIsDirty(false); setExerciseStatus("draft"); setEditing("new");
  };

  const openEditor = async (id: string) => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    setTitle(ex.title);
    setDescription(ex.description || "");
    setProgram((ex as any).program || "ielts");
    setSkill(ex.skill);
    setDifficulty(ex.difficulty);
    setCourseLevel(ex.course_level || "");
    const content = (ex as any).content || {};
    setPassage(content.passage || "");
    setAudioUrl(content.audio_url || "");
    setTranscript(content.transcript || "");
    setDiagramUrl(content.diagram_url || "");
    setTimerEnabled((ex as any).timer_enabled ?? false);
    setTimerDuration(Math.round(((ex as any).timer_duration ?? 600) / 60));
    setScoringMode((ex as any).scoring_mode || "ielts_band");
    setAllowRetake((ex as any).allow_retake ?? true);

    // Convert legacy questions to groups
    const rawQuestions = Array.isArray(ex.questions) ? ex.questions : [];
    const converted = legacyToGroups(rawQuestions, getEffectiveTypes(ex), ex.difficulty);
    setGroups(converted);
    setExpandedGroups(new Set(converted.map(g => g.id)));

    // Restore blank answers
    const allQs = converted.flatMap(g => g.questions);
    const restoredBlanks: Record<number, string> = {};
    allQs.forEach((q: any, i: number) => {
      if (q.correct_answer) restoredBlanks[i + 1] = q.correct_answer;
    });
    setBlankAnswers(restoredBlanks);
    setExerciseStatus(ex.status || "draft");
    setEditing(id);
  };

  // ---- Save ----

  const saveExercise = async (statusOverride?: string) => {
    if (!editing || !user) return;
    if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề"); return; }
    if (!program) { toast.error("Vui lòng chọn chương trình"); return; }
    setSaving(true);

    const effectiveStatus = statusOverride || exerciseStatus;
    if (statusOverride) setExerciseStatus(statusOverride);

    const derivedTypes = deriveQuestionTypes(groups);
    const primaryType = derivedTypes[0] || "multiple_choice";

    const payload = {
      title, description: description || null,
      skill, question_type: primaryType, question_types: derivedTypes,
      difficulty, course_level: courseLevel || null,
      program: program || null,
      scoring_mode: scoringMode,
      content: {
        passage,
        ...(skill === "listening" ? { audio_url: audioUrl || null, transcript: transcript || null } : {}),
        ...(groups.some(g => g.question_type === "diagram_labeling") && diagramUrl ? { diagram_url: diagramUrl } : {}),
      } as any,
      questions: groups as any,
      timer_enabled: timerEnabled,
      timer_duration: timerDuration * 60,
      allow_retake: allowRetake,
      updated_at: new Date().toISOString(),
    };

    if (editing === "new") {
      const { data, error } = await supabase
        .from("practice_exercises")
        .insert({ ...payload, created_by: user.id, status: effectiveStatus } as any)
        .select().single();
      if (error) { toast.error("Lỗi tạo bài tập"); setSaving(false); return; }
      toast.success("Đã lưu!");
      setEditing((data as any).id);
    } else {
      const { error } = await supabase.from("practice_exercises").update({ ...payload, status: effectiveStatus } as any).eq("id", editing);
      if (error) { toast.error("Lỗi lưu"); setSaving(false); return; }
      toast.success(statusOverride === "published" ? "Đã xuất bản!" : statusOverride === "draft" ? "Đã chuyển về nháp!" : "Đã lưu!");
    }

    setSaving(false); setIsDirty(false);
    await fetchExercises();
  };

  const togglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase.from("practice_exercises").update({ status: newStatus } as any).eq("id", id);
    if (error) { toast.error("Lỗi"); return; }
    toast.success(newStatus === "published" ? "Đã xuất bản" : "Đã ẩn");
    await fetchExercises();
  };

  const [deleteExId, setDeleteExId] = useState<string | null>(null);
  const confirmDeleteExercise = async () => {
    if (!deleteExId) return;
    const { error } = await supabase.from("practice_exercises").delete().eq("id", deleteExId);
    if (error) { toast.error("Lỗi xóa"); return; }
    toast.success("Đã xóa");
    if (editing === deleteExId) setEditing(null);
    setDeleteExId(null);
    await fetchExercises();
  };

  const createFlashcardForExercise = async (exId: string, exTitle: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert({ title: `Flashcard — ${exTitle}`, linked_exercise_id: exId, created_by: user.id } as any)
      .select().single();
    if (error) { toast.error("Lỗi tạo flashcard"); return; }
    toast.success("Đã tạo bộ flashcard");
    navigate(`/flashcards?edit=${(data as any).id}`);
  };

  // ---- Question Group operations ----

  const addGroup = () => {
    const availableTypes = Object.entries(QUESTION_TYPES).filter(([, v]) => v.skills.includes(skill));
    const defaultType = availableTypes[0]?.[0] || "multiple_choice";
    const newGroup: QuestionGroup = {
      id: generateGroupId(),
      question_type: defaultType,
      difficulty: difficulty, // inherit from exercise default
      questions: [],
    };
    setGroups(prev => [...prev, newGroup]);
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  };

  const updateGroup = (groupId: string, field: keyof QuestionGroup, value: any) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  };

  const removeGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const duplicateGroup = (groupId: string) => {
    setGroups(prev => {
      const idx = prev.findIndex(g => g.id === groupId);
      if (idx < 0) return prev;
      const clone: QuestionGroup = JSON.parse(JSON.stringify(prev[idx]));
      clone.id = generateGroupId();
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  const addQuestionToGroup = (groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const hasMCQ = MCQ_TYPES.has(g.question_type);
      const newQ: QuestionItem = { question: "", correct_answer: "", explanation: "" };
      if (hasMCQ) newQ.choices = ["", "", "", ""];
      return { ...g, questions: [...g.questions, newQ] };
    }));
  };

  const updateQuestionInGroup = (groupId: string, qIdx: number, field: string, value: any) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const qs = g.questions.map((q, i) => i === qIdx ? { ...q, [field]: value } : q);
      return { ...g, questions: qs };
    }));
  };

  const updateChoiceInGroup = (groupId: string, qIdx: number, cIdx: number, value: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const qs = g.questions.map((q, i) => {
        if (i !== qIdx) return q;
        const choices = [...(q.choices || [])];
        choices[cIdx] = value;
        return { ...q, choices };
      });
      return { ...g, questions: qs };
    }));
  };

  const removeQuestionFromGroup = (groupId: string, qIdx: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, questions: g.questions.filter((_, i) => i !== qIdx) };
    }));
  };

  const duplicateQuestionInGroup = (groupId: string, qIdx: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const clone = JSON.parse(JSON.stringify(g.questions[qIdx]));
      const qs = [...g.questions];
      qs.splice(qIdx + 1, 0, clone);
      return { ...g, questions: qs };
    }));
  };

  const moveQuestionInGroup = (groupId: string, qIdx: number, dir: -1 | 1) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const target = qIdx + dir;
      if (target < 0 || target >= g.questions.length) return g;
      const qs = [...g.questions];
      [qs[qIdx], qs[target]] = [qs[target], qs[qIdx]];
      return { ...g, questions: qs };
    }));
  };

  // Derived data
  const totalQuestions = totalQuestionsCount(groups);
  const derivedTypes = deriveQuestionTypes(groups);
  const hasCompletionType = groups.some(g => COMPLETION_TYPES.has(g.question_type));
  const hasDiagramType = groups.some(g => g.question_type === "diagram_labeling");
  const availableTypesForSkill = Object.entries(QUESTION_TYPES).filter(([, v]) => v.skills.includes(skill));

  // ---- Editor view ----
  if (editing) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
          </Button>
          <h2 className="font-display text-lg font-bold flex-1 flex items-center gap-2">
            {editing === "new" ? "Tạo bài tập mới" : "Chỉnh sửa bài tập"}
            {editing !== "new" && (
              <span className={cn(
                "inline-flex items-center rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                exerciseStatus === "published"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {exerciseStatus === "published" ? "Published" : "Nháp"}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
              {totalQuestions} câu · {groups.length} nhóm
            </span>
          </h2>
          <Button size="sm" variant="outline" onClick={() => saveExercise()} disabled={saving} className="gap-1.5 rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </Button>
          {exerciseStatus !== "published" ? (
            <Button size="sm" onClick={() => saveExercise("published")} disabled={saving}
              className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Publish
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => saveExercise("draft")} disabled={saving}
              className="gap-1.5 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
              Unpublish
            </Button>
          )}
        </div>

        {/* Step 1: Metadata — Program → Level → Skill → Difficulty */}
        <div className="bg-card rounded-xl border p-4 md:p-5 space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Thông tin chung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Tiêu đề</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. TFNG Practice - Climate Change" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Mô tả</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả ngắn..." />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">
                Chương trình <span className="text-destructive">*</span>
              </label>
              <Select value={program || "_none"} onValueChange={v => setProgram(v === "_none" ? "" : v)}>
                <SelectTrigger className={cn(!program && "border-destructive")}><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Level lớp</label>
              <Select value={courseLevel || "_none"} onValueChange={v => setCourseLevel(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Chọn level..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Không chọn —</SelectItem>
                  {courseLevels.map(cl => <SelectItem key={cl.id} value={cl.name}>{cl.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Kỹ năng</label>
              <Select value={skill} onValueChange={v => { setSkill(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SKILLS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Độ khó chung</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Dễ</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="hard">Khó</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-derived type labels */}
          {derivedTypes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Dạng câu hỏi:</span>
              {derivedTypes.map(t => (
                <QuestionTypeBadge key={t} type={t} size="xs" />
              ))}
            </div>
          )}
        </div>

        {/* Scoring mode */}
        <div className="bg-card rounded-xl border p-4 md:p-5 space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Cách tính điểm
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScoringMode("ielts_band")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all",
                scoringMode === "ielts_band"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted hover:border-primary/30"
              )}
            >
              <span className="text-sm font-bold">IELTS Band Score</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                Tính theo bảng quy đổi IELTS chính thức (Band Descriptor). Áp dụng cho Reading/Listening (marks → band) và Writing/Speaking (tiêu chí).
              </span>
            </button>
            <button
              type="button"
              onClick={() => setScoringMode("custom")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all",
                scoringMode === "custom"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted hover:border-primary/30"
              )}
            >
              <span className="text-sm font-bold">Tự do (Custom)</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                Điểm = số câu đúng / tổng số câu × 100%. Không quy đổi sang band IELTS.
              </span>
            </button>
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-bold">Bộ đếm thời gian</label>
            </div>
            <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
          </div>
          {timerEnabled && (
            <div className="flex items-center gap-3 pl-6">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Thời lượng:</label>
              <Input type="number" min={1} max={180} value={timerDuration}
                onChange={e => setTimerDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 h-8 text-sm" />
              <span className="text-xs text-muted-foreground">phút</span>
            </div>
          )}
        </div>

        <div className="bg-muted/30 rounded-xl p-4 border space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold">Cho phép làm lại</label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {allowRetake
                  ? "Học viên có thể làm lại nhiều lần. Performance lấy điểm CAO NHẤT."
                  : "Mỗi tài khoản chỉ được làm 1 lần duy nhất."}
              </p>
            </div>
            <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
          </div>
        </div>

        {/* Passage / Transcript */}
        {(skill === "reading" || skill === "listening") && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground mb-1 block">
              {skill === "listening" ? "Transcript" : "Bài đọc / Nội dung"}
            </label>
            {hasCompletionType ? (
              <>
                <RichTextEditor value={passage} onChange={setPassage} />
                <BlankAnswerKeySync
                  onBlankFocus={(num) => {
                    const el = document.querySelector(`[data-blank-num="${num}"]`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("blank-shortcode-flash");
                      setTimeout(() => el.classList.remove("blank-shortcode-flash"), 1200);
                    }
                  }}
                  html={passage}
                  answers={blankAnswers}
                  onAnswersChange={(newAnswers) => {
                    setBlankAnswers(newAnswers);
                    // For completion types, sync to first completion group
                    const regex = /\[blank_(\d+)\]/g;
                    const nums = new Set<number>();
                    let m: RegExpExecArray | null;
                    while ((m = regex.exec(passage)) !== null) nums.add(parseInt(m[1]));
                    const sorted = Array.from(nums).sort((a, b) => a - b);
                    // Update the first completion group's questions
                    const compGroupIdx = groups.findIndex(g => COMPLETION_TYPES.has(g.question_type));
                    if (compGroupIdx >= 0) {
                      setGroups(prev => prev.map((g, i) => {
                        if (i !== compGroupIdx) return g;
                        return {
                          ...g,
                          questions: sorted.map((num) => ({
                            question: `Blank ${num}`,
                            correct_answer: newAnswers[num] || "",
                            explanation: "",
                          })),
                        };
                      }));
                    }
                  }}
                />
              </>
            ) : (
              <Textarea value={passage} onChange={e => setPassage(e.target.value)}
                placeholder={skill === "listening" ? "Dán transcript ở đây..." : "Dán nội dung bài đọc ở đây..."} rows={8} />
            )}
          </div>
        )}

        {/* Audio for listening */}
        {skill === "listening" && (
          <AudioUploader value={audioUrl} onChange={setAudioUrl}
            workdriveCategory="bai_tap" workdriveItemName={title || "Untitled"}
            entityType="practice_exercise" entityId={editing !== "new" ? editing! : undefined} />
        )}

        {/* Diagram image upload */}
        {hasDiagramType && (
          <div className="bg-muted/30 rounded-xl p-4 border space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <label className="text-sm font-bold">Ảnh sơ đồ (Diagram)</label>
            </div>
            {diagramUrl && (
              <div className="relative rounded-lg overflow-hidden border bg-background">
                <img src={diagramUrl} alt="Diagram" className="max-h-64 mx-auto object-contain" />
                <button type="button" onClick={async () => {
                  // Delete from WorkDrive if synced
                  if (diagramUrl) {
                    deleteWorkDriveByEntity(supabase, "diagram_image", `practice_${editing || "new"}`).then((ok) => {
                      if (ok) toast.success("Đã xoá ảnh trên WorkDrive");
                    });
                  }
                  setDiagramUrl("");
                }}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={uploadingDiagram}
                onClick={() => document.getElementById("diagram-upload-input")?.click()} className="gap-1">
                {uploadingDiagram ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {diagramUrl ? "Đổi ảnh" : "Upload ảnh"}
              </Button>
              <Input value={diagramUrl} onChange={e => setDiagramUrl(e.target.value)} placeholder="Hoặc dán URL ảnh..." className="text-sm flex-1" />
            </div>
            <input id="diagram-upload-input" type="file" accept="image/*" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                setUploadingDiagram(true);
                const ext = file.name.split(".").pop() || "png";
                const safeTitle = (title || "untitled").replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]/g, "").replace(/\s+/g, "_").slice(0, 60);
                const fileName = `${safeTitle}_diagram.${ext}`;
                const path = `diagrams/${fileName}`;
                const { error } = await supabase.storage.from("exercise-images").upload(path, file, { upsert: true });
                if (error) { toast.error("Lỗi upload: " + error.message); setUploadingDiagram(false); return; }
                const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(path);
                const publicUrl = urlData.publicUrl;
                setDiagramUrl(publicUrl); setUploadingDiagram(false);
                toast.success("Đã upload ảnh sơ đồ");
                // Sync to WorkDrive in background
                uploadToWorkDrive({
                  file, fileName, category: "bai_tap", skill: "", itemName: title || "Untitled",
                  entityType: "diagram_image", entityId: `practice_${editing || "new"}`, audioUrl: publicUrl,
                }).then((res) => {
                  if (res) toast.success("Đã đồng bộ ảnh lên WorkDrive");
                });
                e.target.value = "";
              }} />
          </div>
        )}

        {/* Step 2: Question Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
              Nhóm câu hỏi ({groups.length})
            </h3>
            <Button size="sm" onClick={addGroup} className="gap-1.5">
              <FolderPlus className="h-4 w-4" /> Tạo nhóm câu hỏi
            </Button>
          </div>

          {groups.length === 0 && (
            <div className="bg-card rounded-xl border p-8 text-center">
              <FolderPlus className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Chưa có nhóm câu hỏi nào</p>
              <Button size="sm" variant="outline" onClick={addGroup} className="gap-1.5">
                <Plus className="h-4 w-4" /> Tạo nhóm đầu tiên
              </Button>
            </div>
          )}

          {groups.map((group, gIdx) => {
            const isExpanded = expandedGroups.has(group.id);
            const typeLabel = QUESTION_TYPES[group.question_type]?.label || group.question_type;
            const hasMCQ = MCQ_TYPES.has(group.question_type);

            return (
              <Collapsible key={group.id} open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
                <div
                  className={cn(
                    "bg-card rounded-xl border overflow-hidden transition-all",
                    dragGroupIdx === gIdx && "opacity-50 scale-[0.98]",
                    dragOverGroupIdx === gIdx && dragGroupIdx !== gIdx && "ring-2 ring-primary ring-offset-2"
                  )}
                  draggable
                  onDragStart={() => handleGroupDragStart(gIdx)}
                  onDragOver={(e) => handleGroupDragOver(e, gIdx)}
                  onDrop={() => handleGroupDrop(gIdx)}
                  onDragEnd={handleGroupDragEnd}
                >
                  {/* Group header */}
                  <CollapsibleTrigger asChild>
                    <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                        "bg-primary/10 text-primary"
                      )}>
                        {gIdx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{typeLabel}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            group.difficulty === "easy" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : group.difficulty === "hard" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          )}>
                            {group.difficulty === "easy" ? "Dễ" : group.difficulty === "hard" ? "Khó" : "TB"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {group.questions.length} câu
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => duplicateGroup(group.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary" title="Nhân bản nhóm">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeGroup(group.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive" title="Xóa nhóm">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-4 space-y-4">
                      {/* Group settings */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Dạng câu hỏi</label>
                          <Select value={group.question_type} onValueChange={v => updateGroup(group.id, "question_type", v)}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {availableTypesForSkill.map(([key, val]) => (
                                <SelectItem key={key} value={key}>{val.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Độ khó nhóm</label>
                          <Select value={group.difficulty} onValueChange={v => updateGroup(group.id, "difficulty", v)}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Dễ</SelectItem>
                              <SelectItem value="medium">Trung bình</SelectItem>
                              <SelectItem value="hard">Khó</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Questions in group */}
                      <div className="space-y-2">
                        {group.questions.map((q, qIdx) => (
                          <div key={qIdx} className="bg-muted/30 rounded-lg p-3 space-y-2 border">
                            <div className="flex items-start gap-2">
                              <div className="flex flex-col items-center gap-0.5 shrink-0 mt-1">
                                <button onClick={() => moveQuestionInGroup(group.id, qIdx, -1)} disabled={qIdx === 0}
                                  className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button onClick={() => moveQuestionInGroup(group.id, qIdx, 1)} disabled={qIdx === group.questions.length - 1}
                                  className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="text-[11px] font-bold text-muted-foreground w-5 pt-2 shrink-0">{qIdx + 1}</span>
                              <div className="flex-1 space-y-2">
                                {/* Question text — Textarea for multi-line */}
                                <Textarea value={q.question} onChange={e => updateQuestionInGroup(group.id, qIdx, "question", e.target.value)}
                                  placeholder="Câu hỏi (hỗ trợ nhiều dòng)..." className="text-xs min-h-[48px] resize-y" rows={2} />

                                {/* MCQ choices with radio to mark correct answer */}
                                {q.choices && q.choices.length > 0 && (
                                  <div className="space-y-1.5">
                                    {q.choices.map((c, cIdx) => {
                                      const letter = String.fromCharCode(65 + cIdx);
                                      const isCorrect = q.correct_answer.toUpperCase() === letter;
                                      return (
                                        <div key={cIdx} className={cn(
                                          "flex items-center gap-2 rounded-lg border px-2 py-1 transition-colors",
                                          isCorrect ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-muted-foreground/30"
                                        )}>
                                          <input
                                            type="radio"
                                            name={`correct-ex-${group.id}-${qIdx}`}
                                            checked={isCorrect}
                                            onChange={() => updateQuestionInGroup(group.id, qIdx, "correct_answer", letter)}
                                            className="accent-emerald-600 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                            title="Đánh dấu là đáp án đúng"
                                          />
                                          <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">{letter}.</span>
                                          <Input key={cIdx} value={c} onChange={e => updateChoiceInGroup(group.id, qIdx, cIdx, e.target.value)}
                                            placeholder={`Đáp án ${letter}`} className="text-[11px] h-7 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 flex-1" />
                                          {isCorrect && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Non-MCQ answer + explanation */}
                                {(!q.choices || q.choices.length === 0) && (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <Input value={q.correct_answer} onChange={e => updateQuestionInGroup(group.id, qIdx, "correct_answer", e.target.value)}
                                      placeholder="Đáp án đúng"className="text-[11px] h-7 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10"/>
                                    <Input value={q.explanation || ""} onChange={e => updateQuestionInGroup(group.id, qIdx, "explanation", e.target.value)}
                                      placeholder="Giải thích (tùy chọn)"className="text-[11px] h-7"/>
                                  </div>
                                )}
                                {q.choices && q.choices.length > 0 && (
                                  <Input value={q.explanation || ""} onChange={e => updateQuestionInGroup(group.id, qIdx, "explanation", e.target.value)}
                                    placeholder="Giải thích (tùy chọn)"className="text-[11px] h-7"/>
                                )}

                                {/* Writing: large textarea with word count */}
                                {(group.question_type === "task1" || group.question_type === "task2") && (
                                  <div className="relative">
                                    <Textarea
                                      value={q.correct_answer}
                                      onChange={e => updateQuestionInGroup(group.id, qIdx, "correct_answer", e.target.value)}
                                      placeholder="Sample answer / Model essay..."
                                      className="min-h-[180px] resize-y text-sm"
                                      rows={7}
                                    />
                                    <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground/50 pointer-events-none">
                                      {(q.correct_answer || "").trim().split(/\s+/).filter(Boolean).length} words
                                    </span>
                                  </div>
                                )}
                              </div>
                              <button onClick={() => duplicateQuestionInGroup(group.id, qIdx)} className="p-1 text-muted-foreground hover:text-primary" title="Nhân bản">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => removeQuestionFromGroup(group.id, qIdx)} className="p-1 text-muted-foreground hover:text-destructive" title="Xóa">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => addQuestionToGroup(group.id)} className="gap-1 text-xs w-full">
                          <Plus className="h-3.5 w-3.5" /> Thêm câu hỏi
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Bottom save bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t p-3 flex items-center justify-end gap-2 -mx-4 md:-mx-6 px-4 md:px-6 mt-4 z-10">
          <Button size="sm" variant="outline" onClick={() => saveExercise()} disabled={saving} className="gap-1.5 rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </Button>
          {exerciseStatus !== "published" ? (
            <Button size="sm" onClick={() => saveExercise("published")} disabled={saving}
              className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4" /> Publish
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => saveExercise("draft")} disabled={saving}
              className="gap-1.5 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10">
              <EyeOff className="h-4 w-4" /> Unpublish
            </Button>
          )}
        </div>

        <UnsavedChangesDialog open={showExitDialog} onOpenChange={setShowExitDialog}
          onSaveAndExit={handleSaveAndExit} onDiscard={handleDiscard} saving={saving} />
      </div>
    );
  }

  // ---- List view ----

  // Stage 1: filter Program + Course qua pivot resource_courses (logic dùng chung).
  const courseFilters = useMemo(
    () => ({ programIds: filterPrograms, courseIds: filterCourses, includeUntagged: true }),
    [filterPrograms, filterCourses],
  );
  const {
    filtered: programCourseFiltered,
    matched: matchedToCourse,
    untagged: untaggedItems,
    assignmentMap: exerciseCourseMap,
  } = useResourceList("exercise", exercises as any, courseFilters);

  // Stage 2: áp các filter còn lại (skill / type / status / level / search).
  const filtered = (programCourseFiltered as Exercise[]).filter(ex => {
    if (filterSkills.size > 0 && !filterSkills.has(ex.skill)) return false;
    if (filterStatuses.size > 0 && !filterStatuses.has(ex.status)) return false;
    if (filterLevels.size > 0 && (!ex.course_level || !filterLevels.has(ex.course_level))) return false;
    if (filterTypes.size > 0) {
      const types = getEffectiveTypes(ex);
      if (!types.some(t => filterTypes.has(t))) return false;
    }
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase().trim();
      if (!ex.title.toLowerCase().includes(q) && !(ex.description || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasFilters = filterSkills.size > 0 || filterTypes.size > 0 || filterStatuses.size > 0 || filterPrograms.size > 0 || filterLevels.size > 0 || filterCourses.size > 0 || listSearch.trim().length > 0;
  const clearFilters = () => { setFilterSkills(new Set()); setFilterTypes(new Set()); setFilterStatuses(new Set()); setFilterPrograms(new Set()); setFilterLevels(new Set()); setFilterCourses(new Set()); setListSearch(""); setShowListSearch(false); };

  const publishedCount = exercises.filter(e => e.status === "published").length;
  const totalQ = exercises.reduce((sum, e) => {
    const qs = Array.isArray(e.questions) ? e.questions : [];
    if (qs.length > 0 && qs[0]?.question_type && Array.isArray(qs[0]?.questions)) {
      return sum + qs.reduce((s: number, g: any) => s + (g.questions?.length || 0), 0);
    }
    return sum + qs.length;
  }, 0);

  const filterableTypes = filterSkills.size === 0
    ? Object.entries(QUESTION_TYPES)
    : Object.entries(QUESTION_TYPES).filter(([, v]) => [...filterSkills].some(s => v.skills.includes(s)));

  const usedPrograms = [...new Set(exercises.map(e => (e as any).program).filter(Boolean))];
  const usedLevels = [...new Set(exercises.map(e => e.course_level).filter(Boolean))];
  const usedSkills = [...new Set(exercises.map(e => e.skill).filter(Boolean))];

  const getExerciseQuestionCount = (ex: Exercise): number => {
    const qs = Array.isArray(ex.questions) ? ex.questions : [];
    if (qs.length > 0 && qs[0]?.question_type && Array.isArray(qs[0]?.questions)) {
      return qs.reduce((s: number, g: any) => s + (g.questions?.length || 0), 0);
    }
    return qs.length;
  };

  const SKILL_COLORS: Record<string, { bg: string; text: string; border: string; active: string }> = {
    reading: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", active: "bg-blue-200 text-blue-800 border-blue-300" },
    listening: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", active: "bg-purple-200 text-purple-800 border-purple-300" },
    writing: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", active: "bg-amber-200 text-amber-800 border-amber-300" },
    speaking: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", active: "bg-rose-200 text-rose-800 border-rose-300" },
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Kho bài tập</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý bài tập luyện theo dạng câu hỏi IELTS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/tests/import")}><FileUp className="h-4 w-4 mr-2" /> Import</Button>
          <Button onClick={createNew}><Plus className="h-4 w-4 mr-2" /> Tạo bài tập</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Tổng bài tập", value: exercises.length, icon: Layers },
          { label: "Đã xuất bản", value: publishedCount, icon: Eye },
          { label: "Tổng câu hỏi", value: totalQ, icon: BookOpen },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chip-based filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          {showListSearch ? (
            <div className="relative min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Tìm bài tập..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm rounded-full"
              />
              <button onClick={() => { setListSearch(""); setShowListSearch(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowListSearch(true)}
              className="flex items-center justify-center h-9 w-9 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {/* All chip */}
          <button
            onClick={clearFilters}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
              !hasFilters
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Tất cả
            <span className={cn(
              "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
              !hasFilters ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {exercises.length}
            </span>
          </button>

          {/* Level toggle */}
          {usedLevels.length > 0 && (
            <>
              <span className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={() => setLevelExpanded(!levelExpanded)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                  filterLevels.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                Level
                {filterLevels.size > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{filterLevels.size}</span>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", levelExpanded && "rotate-180")} />
              </button>
            </>
          )}

          {/* Program + Course (cascading, dùng chung component) */}
          <span className="h-5 w-px bg-border mx-0.5" />
          <div className="contents">
            <ResourceFilterBar
              programIds={filterPrograms}
              courseIds={filterCourses}
              onProgramsChange={(next) => {
                setFilterPrograms(next);
                if (next.size === 0) setFilterCourses(new Set());
              }}
              onCoursesChange={setFilterCourses}
              programExpanded={programExpanded}
              courseExpanded={courseExpanded}
              onToggleProgram={() => setProgramExpanded(!programExpanded)}
              onToggleCourse={() => setCourseExpanded(!courseExpanded)}
              matchedCount={matchedToCourse.length}
              untaggedCount={untaggedItems.length}
            />
          </div>

          {/* Skill toggle */}
          {usedSkills.length > 1 && (
            <>
              <span className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={() => setSkillExpanded(!skillExpanded)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                  filterSkills.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Kỹ năng
                {filterSkills.size > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{filterSkills.size}</span>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", skillExpanded && "rotate-180")} />
              </button>
            </>
          )}

          {/* Question type toggle */}
          <>
            <span className="h-5 w-px bg-border mx-0.5" />
            <button
              onClick={() => setTypeExpanded(!typeExpanded)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                filterTypes.size > 0
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              Dạng câu hỏi
              {filterTypes.size > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{filterTypes.size}</span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform", typeExpanded && "rotate-180")} />
            </button>
          </>

          {/* Status toggle */}
          <>
            <span className="h-5 w-px bg-border mx-0.5" />
            <button
              onClick={() => setStatusExpanded(!statusExpanded)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                filterStatuses.size > 0
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              Trạng thái
              {filterStatuses.size > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{filterStatuses.size}</span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform", statusExpanded && "rotate-180")} />
            </button>
          </>

          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} / {exercises.length} bài tập</span>
        </div>

        {/* Level chips row */}
        {levelExpanded && usedLevels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {courseLevels.filter(l => usedLevels.includes(l.name)).map(l => {
              const count = exercises.filter(e => e.course_level === l.name).length;
              const active = filterLevels.has(l.name);
              const lc = getLevelColorConfig(l.color_key || l.name);
              return (
                <button
                  key={l.id}
                  onClick={() => toggleFilter(setFilterLevels, l.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    active
                      ? lc ? `${lc.selected} ${lc.border} shadow-md scale-105 ring-1 ring-offset-1` : "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105"
                      : lc ? `${lc.bg} ${lc.text} ${lc.border} hover:shadow-md hover:scale-[1.02]` : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md"
                  )}
                >
                  {l.name}
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    active ? (lc ? `bg-white/40 ${lc.text}` : "bg-primary-foreground/20 text-primary-foreground") : (lc ? `bg-white/60 ${lc.text}` : "bg-muted text-muted-foreground")
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Skill chips row */}
        {skillExpanded && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {SKILLS.filter(s => usedSkills.includes(s.value)).map(s => {
              const count = exercises.filter(e => e.skill === s.value).length;
              const active = filterSkills.has(s.value);
              const sc = SKILL_COLORS[s.value];
              return (
                <button
                  key={s.value}
                  onClick={() => toggleFilter(setFilterSkills, s.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    active ? `${sc.active} shadow-md scale-105 ring-1 ring-offset-1` : `${sc.bg} ${sc.text} ${sc.border} hover:shadow-md hover:scale-[1.02]`
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", active ? `bg-white/40 ${sc.text}` : `bg-white/60 ${sc.text}`)}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Question type chips row */}
        {typeExpanded && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {filterableTypes.map(([key, val]) => {
              const count = exercises.filter(e => getEffectiveTypes(e).includes(key)).length;
              if (count === 0) return null;
              const active = filterTypes.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleFilter(setFilterTypes, key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105 ring-1 ring-offset-1"
                      : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md hover:scale-[1.02]"
                  )}
                >
                  {val.label}
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Status chips row */}
        {statusExpanded && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {[{ value: "published", label: "Published", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", active: "bg-emerald-200 text-emerald-800 border-emerald-300" },
              { value: "draft", label: "Nháp", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", active: "bg-gray-200 text-gray-700 border-gray-300" },
            ].map(st => {
              const count = exercises.filter(e => e.status === st.value).length;
              if (count === 0) return null;
              const active = filterStatuses.has(st.value);
              return (
                <button
                  key={st.value}
                  onClick={() => toggleFilter(setFilterStatuses, st.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    active ? `${st.active} shadow-md scale-105 ring-1 ring-offset-1` : `${st.bg} ${st.text} ${st.border} hover:shadow-md hover:scale-[1.02]`
                  )}
                >
                  {st.label}
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", active ? `bg-white/40 ${st.text}` : `bg-white/60 ${st.text}`)}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{hasFilters ? "Không có bài tập phù hợp" : "Chưa có bài tập nào"}</p>
          {!hasFilters && <Button className="mt-4" onClick={createNew}><Plus className="h-4 w-4 mr-2" /> Tạo bài tập đầu tiên</Button>}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark text-dark-foreground text-left">
                <th className="px-4 py-3 font-medium">Tiêu đề</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Chương trình</th>
                <th className="px-4 py-3 font-medium">Kỹ năng</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Dạng câu hỏi</th>
                <th className="px-4 py-3 font-medium">Câu hỏi</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ex => {
                const SkillIcon = SKILLS.find(s => s.value === ex.skill)?.icon || BookOpen;
                const qCount = getExerciseQuestionCount(ex);
                const types = getEffectiveTypes(ex);
                const prog = PROGRAMS.find(p => p.value === (ex as any).program);
                return (
                  <tr key={ex.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{ex.title}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {prog ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">{prog.label}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <SkillIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="capitalize">{ex.skill}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {types.map(t => (
                          <QuestionTypeBadge key={t} type={t} size="xs" />
                        ))}
                        <ResourceTagManager resourceType="exercise" resourceId={ex.id} compact />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {qCount}
                        {syncedExerciseIds.has(ex.id) && <Cloud className="h-3 w-3 text-green-600" />}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        ex.status === "published" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
                      )}>
                        {ex.status === "published" ? "Published" : "Nháp"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditor(ex.id)}>
                            <Save className="h-4 w-4 mr-2" /> Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePublish(ex.id, ex.status)}>
                            {ex.status === "published" ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {ex.status === "published" ? "Ẩn" : "Xuất bản"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/practice/${ex.id}/stats`)}>
                            <BarChart3 className="h-4 w-4 mr-2" /> Thống kê
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => createFlashcardForExercise(ex.id, ex.title)}>
                            <BookOpen className="h-4 w-4 mr-2" /> Tạo Flashcard
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteExId(ex.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExId} onOpenChange={() => setDeleteExId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài tập</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa bài tập này? Tất cả câu hỏi trong bài sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExercise} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

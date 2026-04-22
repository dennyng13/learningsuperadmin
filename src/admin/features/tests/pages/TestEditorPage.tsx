import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { cn } from "@shared/lib/utils";
import RichTextEditor from "@admin/features/tests/components/RichTextEditor";
import BlankAnswerKeySync from "@admin/features/tests/components/BlankAnswerKeySync";
import { extractBlanks as extractBlanksFromHtml } from "@shared/components/exam/BlankRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import {
  ArrowLeft, Save, Eye, EyeOff, BookOpen, Headphones, PenTool, Mic, Plus, Trash2, GripVertical, Loader2, FileUp, ImageIcon, ChevronUp, ChevronDown, Copy, Undo2, Redo2, CheckCircle2, BookOpenText, ChevronRight, Search, ListChecks, ToggleLeft, FileText, Table2, Tag, MessageSquare, PenLine, MapPin, X, Check, Upload, ZoomIn,
} from "lucide-react";
import { uploadToWorkDrive, deleteWorkDriveByEntity } from "@shared/utils/workdriveSync";
import { IELTSSkill } from "@shared/types/admin";
import { SKILL_COLOR_MAP } from "@shared/utils/skillColors";
import { getLevelColorConfig } from "@shared/utils/levelColors";
import { useAssessmentDetail, useSaveAssessment } from "@shared/hooks/useAssessments";
import { supabase } from "@/integrations/supabase/client";
import AudioUploader from "@admin/features/tests/components/AudioUploader";
import DiagramPinEditor, { type DiagramPin, type DiagramDisplayMode } from "@admin/features/tests/components/DiagramPinEditor";
import UnsavedChangesDialog from "@admin/features/tests/components/UnsavedChangesDialog";
import WritingTaskConfig from "@admin/features/tests/components/WritingTaskConfig";
import { Switch } from "@shared/components/ui/switch";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { toast } from "sonner";

const QUESTION_TYPE_META: Record<string, { icon: React.ReactNode; color: string; category: string; desc: string }> = {
  multiple_choice:       { icon: <ListChecks className="h-4 w-4" />, color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800", category: "Selection", desc: "Chọn đáp án đúng A/B/C/D" },
  multiple_choice_pick2: { icon: <ListChecks className="h-4 w-4" />, color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800", category: "Selection", desc: "Chọn 2 đáp án đúng trong 5" },
  true_false_not_given:  { icon: <ToggleLeft className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800", category: "Judgment", desc: "TRUE / FALSE / NOT GIVEN" },
  yes_no_not_given:      { icon: <ToggleLeft className="h-4 w-4" />, color: "text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950 dark:border-teal-800", category: "Judgment", desc: "YES / NO / NOT GIVEN" },
  matching_headings:     { icon: <Tag className="h-4 w-4" />, color: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800", category: "Matching", desc: "Nối tiêu đề cho đoạn văn" },
  matching_information:  { icon: <Tag className="h-4 w-4" />, color: "text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950 dark:border-violet-800", category: "Matching", desc: "Nối thông tin với đoạn văn" },
  matching_features:     { icon: <Tag className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950 dark:border-indigo-800", category: "Matching", desc: "Nối đặc điểm với danh sách" },
  matching:              { icon: <Tag className="h-4 w-4" />, color: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800", category: "Matching", desc: "Nối đáp án phù hợp" },
  sentence_completion:   { icon: <PenLine className="h-4 w-4" />, color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800", category: "Completion", desc: "Hoàn thành câu" },
  summary_completion:    { icon: <FileText className="h-4 w-4" />, color: "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800", category: "Completion", desc: "Hoàn thành tóm tắt" },
  form_completion:       { icon: <FileText className="h-4 w-4" />, color: "text-lime-600 bg-lime-50 border-lime-200 dark:text-lime-400 dark:bg-lime-950 dark:border-lime-800", category: "Completion", desc: "Hoàn thành biểu mẫu" },
  note_completion:       { icon: <MessageSquare className="h-4 w-4" />, color: "text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-950 dark:border-cyan-800", category: "Completion", desc: "Hoàn thành ghi chú" },
  table_completion:      { icon: <Table2 className="h-4 w-4" />, color: "text-sky-600 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950 dark:border-sky-800", category: "Completion", desc: "Hoàn thành bảng" },
  diagram_labeling:      { icon: <MapPin className="h-4 w-4" />, color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950 dark:border-rose-800", category: "Visual", desc: "Gán nhãn sơ đồ" },
  plan_map_diagram:      { icon: <MapPin className="h-4 w-4" />, color: "text-pink-600 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-950 dark:border-pink-800", category: "Visual", desc: "Gán nhãn bản đồ / sơ đồ" },
  short_answer:          { icon: <PenLine className="h-4 w-4" />, color: "text-stone-600 bg-stone-50 border-stone-200 dark:text-stone-400 dark:bg-stone-950 dark:border-stone-800", category: "Open", desc: "Trả lời ngắn" },
};

/** Default IELTS on Computer instruction templates per question type. Uses {start}–{end} placeholders. */
const QUESTION_TYPE_INSTRUCTIONS: Record<string, string> = {
  multiple_choice:          `<p><strong>Questions {start}–{end}</strong></p><p>Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.</p>`,
  multiple_choice_pick2:    `<p><strong>Questions {start}–{end}</strong></p><p>Choose <strong>TWO</strong> letters, <strong>A–E</strong>.</p>`,
  true_false_not_given:     `<p><strong>Questions {start}–{end}</strong></p><p>Do the following statements agree with the information given in Reading Passage?</p><p>Select</p><p><strong>TRUE</strong> &nbsp;&nbsp;&nbsp; if the statement agrees with the information<br><strong>FALSE</strong> &nbsp;&nbsp;&nbsp; if the statement contradicts the information<br><strong>NOT GIVEN</strong> &nbsp;&nbsp;&nbsp; if there is no information on this</p>`,
  yes_no_not_given:         `<p><strong>Questions {start}–{end}</strong></p><p>Do the following statements agree with the views of the writer in Reading Passage?</p><p>Select</p><p><strong>YES</strong> &nbsp;&nbsp;&nbsp; if the statement agrees with the views of the writer<br><strong>NO</strong> &nbsp;&nbsp;&nbsp; if the statement contradicts the views of the writer<br><strong>NOT GIVEN</strong> &nbsp;&nbsp;&nbsp; if it is impossible to say what the writer thinks about this</p>`,
  matching_headings:        `<p><strong>Questions {start}–{end}</strong></p><p>Reading Passage has sections.</p><p>Choose the correct heading for each section from the list of headings below.</p>`,
  matching_information:     `<p><strong>Questions {start}–{end}</strong></p><p>Reading Passage has paragraphs, <strong>A–G</strong>.</p><p>Which paragraph contains the following information?</p>`,
  matching_features:        `<p><strong>Questions {start}–{end}</strong></p><p>Look at the following statements and the list of people/features below.</p><p>Match each statement with the correct person/feature, <strong>A–E</strong>.</p>`,
  matching_sentence_endings:`<p><strong>Questions {start}–{end}</strong></p><p>Complete each sentence with the correct ending, <strong>A–G</strong>, below.</p>`,
  sentence_completion:      `<p><strong>Questions {start}–{end}</strong></p><p>Complete the sentences below.</p><p>Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.</p>`,
  summary_completion:       `<p><strong>Questions {start}–{end}</strong></p><p>Complete the summary below.</p><p>Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.</p>`,
  form_completion:          `<p><strong>Questions {start}–{end}</strong></p><p>Complete the form below.</p><p>Choose <strong>ONE WORD ONLY</strong> from the passage for each answer.</p>`,
  note_completion:          `<p><strong>Questions {start}–{end}</strong></p><p>Complete the notes below.</p><p>Choose <strong>ONE WORD ONLY</strong> from the passage for each answer.</p>`,
  table_completion:         `<p><strong>Questions {start}–{end}</strong></p><p>Complete the table below.</p><p>Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.</p>`,
  diagram_labeling:         `<p><strong>Questions {start}–{end}</strong></p><p>Label the diagram below.</p><p>Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.</p>`,
  plan_map_diagram:         `<p><strong>Questions {start}–{end}</strong></p><p>Label the plan/map/diagram below.</p><p>Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.</p>`,
  short_answer:             `<p><strong>Questions {start}–{end}</strong></p><p>Answer the questions below.</p><p>Choose <strong>NO MORE THAN THREE WORDS AND/OR A NUMBER</strong> from the passage for each answer.</p>`,
  matching:                 `<p><strong>Questions {start}–{end}</strong></p><p>Choose the correct letter, <strong>A–E</strong>.</p>`,
};

function getDefaultInstruction(type: string, start: number, end: number): string {
  const template = QUESTION_TYPE_INSTRUCTIONS[type];
  if (!template) return "";
  return template.replace(/\{start\}/g, String(start)).replace(/\{end\}/g, String(end));
}

const readingQuestionTypes = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false_not_given", label: "True / False / Not Given" },
  { value: "yes_no_not_given", label: "Yes / No / Not Given" },
  { value: "matching_headings", label: "Matching Headings" },
  { value: "matching_information", label: "Matching Information" },
  { value: "matching_features", label: "Matching Features" },
  { value: "sentence_completion", label: "Sentence Completion" },
  { value: "summary_completion", label: "Summary Completion" },
  { value: "diagram_labeling", label: "Diagram Labeling" },
  { value: "short_answer", label: "Short Answer" },
];

const listeningQuestionTypes = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "matching", label: "Matching" },
  { value: "plan_map_diagram", label: "Plan / Map / Diagram" },
  { value: "form_completion", label: "Form Completion" },
  { value: "note_completion", label: "Note Completion" },
  { value: "table_completion", label: "Table Completion" },
  { value: "sentence_completion", label: "Sentence Completion" },
  { value: "summary_completion", label: "Summary Completion" },
  { value: "short_answer", label: "Short Answer" },
];

const skillIcons: Record<IELTSSkill, React.ReactNode> = {
  reading: <BookOpen className="h-4 w-4" />,
  listening: <Headphones className="h-4 w-4" />,
  writing: <PenTool className="h-4 w-4" />,
  speaking: <Mic className="h-4 w-4" />,
};

const sectionTypeToSkill: Record<string, IELTSSkill> = {
  READING: "reading",
  LISTENING: "listening",
  WRITING: "writing",
  SPEAKING: "speaking",
};

interface QuestionDraft {
  id: string;
  text: string;
  answer: string;
  choices?: string[];
  explain?: string;
  passageEvidence?: string;
  questionNumber: number;
  points?: number; // custom scoring: points per question
}

interface QuestionGroupDraft {
  id: string;
  type: string;
  title: string;
  description?: string;
  passage?: string;
  completionParagraph?: string;
  groupChoices?: string[];
  diagramImageUrl?: string;
  diagramPins?: { questionNumber: number; x: number; y: number }[];
  diagramMode?: "pins_side" | "overlay" | "drag_drop";
  questions: QuestionDraft[];
  startQuestionNumber: number;
  endQuestionNumber: number;
  duration?: number; // optional duration in minutes
}

interface PartDraft {
  id: string;
  title: string;
  description?: string;
  order: number;
  skill: string; // READING, LISTENING, WRITING, SPEAKING
  audioUrl?: string;
  prepTime?: number;
  duration?: number;
  cueCard?: any;
  questionGroups: QuestionGroupDraft[];
  passages: { id: string; title: string; content: string; description?: string }[];
  scoringMode?: string; // per-part scoring for WRITING/SPEAKING
  taskMetadata?: import("@admin/features/tests/components/WritingTaskConfig").WritingTaskMetadata; // Writing-only
}

export default function TestEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const placementId = searchParams.get("placementId");
  const placementSkill = searchParams.get("skill");
  const returnTo = searchParams.get("returnTo");
  const initialContentType = searchParams.get("contentType") || "test";
  const isNew = id === "new";

  const { data: detail, isLoading } = useAssessmentDetail(id);
  const saveAssessment = useSaveAssessment();
  const { levels: courseLevels } = useCourseLevels();

  const [testName, setTestName] = useState("");
  const [bookName, setBookName] = useState("");
  const [description, setDescription] = useState("");
  const [sectionType, setSectionType] = useState(searchParams.get("sectionType") || "READING");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([searchParams.get("sectionType") || "READING"]);
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [status, setStatus] = useState("draft");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [hasAvailableFrom, setHasAvailableFrom] = useState(false);
  const [hasAvailableTo, setHasAvailableTo] = useState(false);
  const [parts, setParts] = useState<PartDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [audioMode, setAudioMode] = useState<"single" | "per_part">("per_part");
  const [globalAudioUrl, setGlobalAudioUrl] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [listeningDurationMode, setListeningDurationMode] = useState<"audio" | "manual">("manual");
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [expandedPreviews, setExpandedPreviews] = useState<string[]>([]);

  // Exercise-specific fields
  const [contentType, setContentType] = useState(initialContentType);
  const [difficulty, setDifficulty] = useState("medium");
  const [scoringModes, setScoringModes] = useState<Record<string, string>>({});  // per-skill scoring for R/L
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [allowRetake, setAllowRetake] = useState(true);
  const [program, setProgram] = useState("");
  const [courseLevel, setCourseLevel] = useState("");
  const isExercise = contentType === "exercise";

  // Pipeline step (1-4)
  const [currentStep, setCurrentStep] = useState(isNew ? 1 : 4);
  const [activeSkillTab, setActiveSkillTab] = useState(selectedSkills[0] || "READING");

  // Undo/Redo history for parts
  const historyRef = useRef<PartDraft[][]>([]);
  const futureRef = useRef<PartDraft[][]>([]);
  const isUndoRedoRef = useRef(false);

  const setPartsWithHistory = useCallback((updater: PartDraft[] | ((prev: PartDraft[]) => PartDraft[])) => {
    setParts((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!isUndoRedoRef.current) {
        historyRef.current = [...historyRef.current, prev];
        if (historyRef.current.length > 50) historyRef.current = historyRef.current.slice(-50);
        futureRef.current = [];
      }
      return next;
    });
  }, []);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setParts((current) => {
      futureRef.current = [...futureRef.current, current];
      return previous;
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    setParts((current) => {
      historyRef.current = [...historyRef.current, current];
      return next;
    });
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // Mark dirty on any edit (skip initial load)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) { loadedRef.current = true; return; }
    setIsDirty(true);
  }, [testName, bookName, description, sectionType, durationMinutes, status, parts]);

  // Warn when total part durations exceed overall duration
  const prevOverflowRef = useRef(false);
  useEffect(() => {
    const totalPartMin = parts.reduce((sum, p) => sum + (p.duration || 0), 0);
    const totalLimit = parseInt(durationMinutes) || 0;
    const isOver = totalLimit > 0 && totalPartMin > totalLimit;
    if (isOver && !prevOverflowRef.current) {
      toast.warning(`Tổng thời lượng các phần (${totalPartMin} phút) vượt quá thời lượng tổng (${totalLimit} phút)!`);
    }
    prevOverflowRef.current = isOver;
  }, [parts, durationMinutes]);

  // Browser beforeunload warning
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const backPath = returnTo ? decodeURIComponent(returnTo) : "/tests";

  const handleBack = () => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      navigate(backPath);
    }
  };

  const getMissingAnswerCount = useCallback(() => {
    let missing = 0;
    for (const p of parts) {
      // Speaking & Writing don't have fixed correct answers — skip validation.
      if (p.skill === "SPEAKING" || p.skill === "WRITING") continue;
      for (const g of p.questionGroups) {
        for (const q of g.questions) {
          if (!q.answer || !q.answer.trim()) missing++;
        }
      }
    }
    return missing;
  }, [parts]);

  /** Returns the id of the first question missing an answer (Reading/Listening only), or null. */
  const findFirstMissingQuestionId = useCallback((): string | null => {
    for (const p of parts) {
      if (p.skill === "SPEAKING" || p.skill === "WRITING") continue;
      for (const g of p.questionGroups) {
        for (const q of g.questions) {
          if (!q.answer || !q.answer.trim()) return q.id;
        }
      }
    }
    return null;
  }, [parts]);

  /** Scroll to + flash-highlight a question row by its id. */
  const focusMissingQuestion = useCallback((questionId: string) => {
    // Defer one frame so toast/dialog state can settle first.
    requestAnimationFrame(() => {
      const el = document.getElementById(`question-row-${questionId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("missing-answer-flash");
      setTimeout(() => el.classList.remove("missing-answer-flash"), 2000);
    });
  }, []);

  const handleSaveAndExit = async () => {
    const missingCount = getMissingAnswerCount();
    if (missingCount > 0) {
      toast.error(`Còn ${missingCount} câu hỏi chưa có đáp án đúng. Vui lòng điền đầy đủ trước khi lưu.`);
      const firstMissing = findFirstMissingQuestionId();
      if (firstMissing) focusMissingQuestion(firstMissing);
      setShowExitDialog(false);
      return;
    }
    setShowExitDialog(false);
    await handleSave();
    navigate(backPath);
  };

  const handleDiscard = () => {
    const missingCount = getMissingAnswerCount();
    if (missingCount > 0 && parts.some(p => p.questionGroups.some(g => g.questions.length > 0))) {
      const confirmed = window.confirm(`Còn ${missingCount} câu hỏi chưa có đáp án. Bạn có chắc muốn thoát mà không lưu?`);
      if (!confirmed) return;
    }
    setShowExitDialog(false);
    setIsDirty(false);
    navigate(backPath);
  };

  // Auto-renumber all question numbers sequentially across parts & groups
  const renumberQuestions = useCallback((draft: PartDraft[]): PartDraft[] => {
    let num = 1;
    return draft.map((p) => ({
      ...p,
      questionGroups: p.questionGroups.map((g) => {
        const questions = g.questions.map((q) => ({ ...q, questionNumber: num++ }));
        return {
          ...g,
          questions,
          startQuestionNumber: questions.length > 0 ? questions[0].questionNumber : g.startQuestionNumber,
          endQuestionNumber: questions.length > 0 ? questions[questions.length - 1].questionNumber : g.endQuestionNumber,
        };
      }),
    }));
  }, []);

  // Drag-and-drop state
  const dragPartRef = useRef<number | null>(null);
  const dragGroupRef = useRef<{ partId: string; index: number } | null>(null);
  const dragQuestionRef = useRef<{ partId: string; groupId: string; index: number } | null>(null);
  const [dragOverPartId, setDragOverPartId] = useState<string | null>(null);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);

  const handlePartDragStart = useCallback((index: number) => {
    dragPartRef.current = index;
  }, []);

  const handlePartDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragPartRef.current === null || dragPartRef.current === index) return;
    setPartsWithHistory((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragPartRef.current!, 1);
      updated.splice(index, 0, moved);
      dragPartRef.current = index;
      return renumberQuestions(updated.map((p, i) => ({ ...p, order: i + 1 })));
    });
  }, [renumberQuestions]);

  const handlePartDragEnd = useCallback(() => {
    dragPartRef.current = null;
  }, []);

  const handleGroupDragStart = useCallback((partId: string, index: number) => {
    dragGroupRef.current = { partId, index };
    setIsDraggingGroup(true);
  }, []);

  const handleGroupDragOver = useCallback((e: React.DragEvent, partId: string, index: number) => {
    e.preventDefault();
    const drag = dragGroupRef.current;
    if (!drag) return;
    // Same part, same index — nothing to do
    if (drag.partId === partId && drag.index === index) return;
    setPartsWithHistory((prev) => {
      const updated = prev.map((p) => ({ ...p, questionGroups: [...p.questionGroups] }));
      const srcPart = updated.find((p) => p.id === drag.partId);
      const dstPart = updated.find((p) => p.id === partId);
      if (!srcPart || !dstPart) return prev;
      const [moved] = srcPart.questionGroups.splice(drag.index, 1);
      dstPart.questionGroups.splice(index, 0, moved);
      dragGroupRef.current = { partId, index };
      return renumberQuestions(updated);
    });
  }, [renumberQuestions]);

  // Allow dropping a group onto an empty part (drop zone at the end)
  const handleGroupDropOnPart = useCallback((e: React.DragEvent, partId: string) => {
    e.preventDefault();
    const drag = dragGroupRef.current;
    if (!drag) return;
    setPartsWithHistory((prev) => {
      const updated = prev.map((p) => ({ ...p, questionGroups: [...p.questionGroups] }));
      const srcPart = updated.find((p) => p.id === drag.partId);
      const dstPart = updated.find((p) => p.id === partId);
      if (!srcPart || !dstPart) return prev;
      // If already last item in same part, skip
      if (drag.partId === partId && drag.index === dstPart.questionGroups.length - 1) return prev;
      const [moved] = srcPart.questionGroups.splice(drag.index, 1);
      dstPart.questionGroups.push(moved);
      dragGroupRef.current = { partId, index: dstPart.questionGroups.length - 1 };
      return renumberQuestions(updated);
    });
  }, [renumberQuestions]);

  const handleGroupDragEnd = useCallback(() => {
    dragGroupRef.current = null;
    setDragOverPartId(null);
    setIsDraggingGroup(false);
  }, []);

  // Question drag-and-drop within a group
  const handleQuestionDragStart = useCallback((e: React.DragEvent, partId: string, groupId: string, index: number) => {
    e.stopPropagation();
    dragQuestionRef.current = { partId, groupId, index };
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleQuestionDragOver = useCallback((e: React.DragEvent, partId: string, groupId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const drag = dragQuestionRef.current;
    if (!drag || (drag.partId === partId && drag.groupId === groupId && drag.index === index)) return;
    setPartsWithHistory((prev) => {
      const updated = prev.map(p => ({ ...p, questionGroups: p.questionGroups.map(g => ({ ...g, questions: [...g.questions] })) }));
      const srcGroup = updated.find(p => p.id === drag.partId)?.questionGroups.find(g => g.id === drag.groupId);
      const dstGroup = updated.find(p => p.id === partId)?.questionGroups.find(g => g.id === groupId);
      if (!srcGroup || !dstGroup) return prev;
      const [moved] = srcGroup.questions.splice(drag.index, 1);
      dstGroup.questions.splice(index, 0, moved);
      dragQuestionRef.current = { partId, groupId, index };
      return renumberQuestions(updated);
    });
  }, [renumberQuestions]);

  const handleQuestionDropOnGroup = useCallback((e: React.DragEvent, partId: string, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const drag = dragQuestionRef.current;
    if (!drag || (drag.partId === partId && drag.groupId === groupId)) return;
    setPartsWithHistory((prev) => {
      const updated = prev.map(p => ({ ...p, questionGroups: p.questionGroups.map(g => ({ ...g, questions: [...g.questions] })) }));
      const srcGroup = updated.find(p => p.id === drag.partId)?.questionGroups.find(g => g.id === drag.groupId);
      const dstGroup = updated.find(p => p.id === partId)?.questionGroups.find(g => g.id === groupId);
      if (!srcGroup || !dstGroup) return prev;
      const [moved] = srcGroup.questions.splice(drag.index, 1);
      dstGroup.questions.push(moved);
      dragQuestionRef.current = { partId, groupId, index: dstGroup.questions.length - 1 };
      return renumberQuestions(updated);
    });
  }, [renumberQuestions]);

  const handleQuestionDragEnd = useCallback(() => {
    dragQuestionRef.current = null;
  }, []);

  const movePart = useCallback((idx: number, dir: -1 | 1) => {
    setPartsWithHistory((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return renumberQuestions(next.map((p, i) => ({ ...p, order: i + 1 })));
    });
  }, [renumberQuestions]);

  const moveGroup = useCallback((partId: string, idx: number, dir: -1 | 1) => {
    setPartsWithHistory((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== partId) return p;
        const groups = [...p.questionGroups];
        const target = idx + dir;
        if (target < 0 || target >= groups.length) return p;
        [groups[idx], groups[target]] = [groups[target], groups[idx]];
        return { ...p, questionGroups: groups };
      });
      return renumberQuestions(updated);
    });
  }, [renumberQuestions]);

  const activeSkill = sectionTypeToSkill[sectionType] || "reading";

  // Load data from DB
  useEffect(() => {
    if (!detail) return;
    const a = detail.assessment;
    setTestName(a.name);
    setBookName(a.book_name || "");
    setSectionType(a.section_type);
    setSelectedSkills([a.section_type]);
    setActiveSkillTab(a.section_type);
    setDurationMinutes(String(Math.round(a.duration / 60)));
    setStatus(a.status);
    setHasAvailableFrom(!!a.available_from);
    setAvailableFrom(a.available_from ? a.available_from.split("T")[0] : "");
    setHasAvailableTo(!!a.available_until);
    setAvailableTo(a.available_until ? a.available_until.split("T")[0] : "");
    // Load exercise-specific fields
    setContentType((a as any).content_type || "test");
    setDifficulty((a as any).difficulty || "medium");
    const rawScoringMode = (a as any).scoring_mode || "ielts_band";
    // Try to parse as JSON (per-skill map), fallback to single value for all skills
    try {
      const parsed = JSON.parse(rawScoringMode);
      if (typeof parsed === "object" && parsed !== null) {
        setScoringModes(parsed);
      } else {
        setScoringModes({ [a.section_type]: rawScoringMode });
      }
    } catch {
      setScoringModes({ [a.section_type]: rawScoringMode });
    }
    setTimerEnabled((a as any).timer_enabled || false);
    setAllowRetake((a as any).allow_retake ?? true);
    setProgram((a as any).program || "");
    setCourseLevel((a as any).course_level || "");
    setDescription((a as any).description || "");

    const loadedParts: PartDraft[] = detail.parts.map((p: any) => {
      const partPassages = detail.passages
        .filter((ps: any) => ps.part_id === p.id)
        .map((ps: any) => ({ id: ps.id, title: ps.title, content: ps.content, description: ps.description || "" }));

      const partQGs = detail.questionGroups
        .filter((qg: any) => qg.part_id === p.id)
        .map((qg: any) => {
          const qgQuestions = detail.questions
            .filter((q: any) => q.question_group_id === qg.id)
            .map((q: any) => ({
              id: q.id,
              text: q.text || "",
              answer: q.correct_answer,
              choices: q.choices ? (q.choices as string[]) : undefined,
              explain: q.explain || "",
              passageEvidence: (q as any).passage_evidence || "",
              questionNumber: q.question_number,
              points: q.points ?? undefined,
            }));

          const isDiagramType = ["diagram_labeling", "plan_map_diagram"].includes(qg.question_type);
          // Parse diagram pin data from choices for diagram types
          let diagramPins: QuestionGroupDraft["diagramPins"];
          let diagramMode: QuestionGroupDraft["diagramMode"];
          let groupChoices: string[] | undefined;
          if (isDiagramType && qg.choices && typeof qg.choices === "object" && !Array.isArray(qg.choices)) {
            const choicesObj = qg.choices as any;
            diagramPins = choicesObj.pins || [];
            diagramMode = choicesObj.displayMode || "pins_side";
            groupChoices = choicesObj.answerChoices || undefined;
          } else {
            groupChoices = qg.choices ? (qg.choices as string[]) : undefined;
          }
          return {
            id: qg.id,
            type: qg.question_type,
            title: qg.title,
            description: qg.description || "",
            completionParagraph: isDiagramType ? "" : (qg.completion_paragraph || ""),
            diagramImageUrl: isDiagramType ? (qg.completion_paragraph || "") : "",
            diagramPins,
            diagramMode,
            groupChoices,
            questions: qgQuestions,
            startQuestionNumber: qg.start_question_number,
            endQuestionNumber: qg.end_question_number,
          };
        });

      // Extract per-part scoring mode from parsed JSON
      let partScoringMode: string | undefined;
      try {
        const parsedSM = JSON.parse(rawScoringMode);
        if (typeof parsedSM === "object" && parsedSM !== null) {
          partScoringMode = parsedSM[`part:${p.id}`] || undefined;
        }
      } catch { /* not JSON */ }

      return {
        id: p.id,
        title: p.title,
        description: p.description || "",
        order: p.order,
        skill: a.section_type,
        audioUrl: p.audio_url || "",
        prepTime: p.prep_time || undefined,
        duration: p.duration || undefined,
        cueCard: p.cue_card,
        questionGroups: partQGs,
        passages: partPassages,
        scoringMode: partScoringMode,
        taskMetadata: (p as any).task_metadata || undefined,
      };
    });

    setParts(loadedParts);

    // Auto-detect audio mode
    if (a.section_type === "LISTENING" && loadedParts.length > 0) {
      const audioUrls = loadedParts.map(p => p.audioUrl).filter(Boolean);
      const uniqueUrls = new Set(audioUrls);
      if (uniqueUrls.size === 1 && audioUrls.length === loadedParts.length) {
        setAudioMode("single");
        setGlobalAudioUrl(audioUrls[0]!);
      } else {
        setAudioMode("per_part");
      }
    }
  }, [detail]);

  const addPart = (skill?: string) => {
    const partSkill = skill || activeSkillTab || selectedSkills[0] || "READING";
    const skillParts = parts.filter(p => p.skill === partSkill);
    const partNum = skillParts.length + 1;
    const defaultInstruction = partSkill === "READING"
      ? `You should spend about 20 minutes on <strong>Questions ___–___</strong>, which are based on Reading Passage ${partNum} below.`
      : "";
    const autoPassages = partSkill === "READING" ? [{
      id: `new-ps-${Date.now()}`,
      title: `Reading Passage ${partNum}`,
      description: defaultInstruction,
      content: "",
    }] : partSkill === "LISTENING" ? [{
      id: `new-ps-${Date.now()}`,
      title: `Transcript — Part ${partNum}`,
      description: "",
      content: "",
    }] : [];
    setPartsWithHistory((prev) => [
      ...prev,
      {
        id: `new-part-${Date.now()}`,
        title: `Part ${partNum}`,
        order: prev.length + 1,
        skill: partSkill,
        questionGroups: [],
        passages: autoPassages,
      },
    ]);
  };

  const removePart = (partId: string) => {
    setPartsWithHistory((prev) => prev.filter((p) => p.id !== partId));
  };

  const addPassage = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    const partIndex = parts.filter(p => p.skill === "READING").indexOf(part!);
    const passageNum = (part?.passages.length || 0) + 1;
    const pNum = partIndex + 1;
    const defaultInstruction = `You should spend about 20 minutes on <strong>Questions ___–___</strong>, which are based on Reading Passage ${pNum} below.`;
    setPartsWithHistory((prev) =>
      prev.map((p) =>
        p.id === partId
          ? { ...p, passages: [...p.passages, { id: `new-ps-${Date.now()}`, title: `Reading Passage ${pNum}`, description: defaultInstruction, content: "" }] }
          : p
      )
    );
  };

  const getDefaultChoicesForType = (type: string): string[] | undefined => {
    if (type === "true_false_not_given") return ["TRUE", "FALSE", "NOT GIVEN"];
    if (type === "yes_no_not_given") return ["YES", "NO", "NOT GIVEN"];
    if (type === "multiple_choice") return ["", "", "", ""];
    // multiple_choice_pick2 uses group-level choices, not per-question
    return undefined;
  };

  const getDefaultGroupChoicesForType = (type: string): string[] | undefined => {
    if (["matching_headings", "matching_information", "matching_features", "matching_sentence_endings", "matching"].includes(type)) {
      return ["", "", "", "", ""];
    }
    if (type === "multiple_choice_pick2") {
      return ["", "", "", "", ""];
    }
    return undefined;
  };

  const MATCHING_TYPES = ["matching_headings", "matching_information", "matching_features", "matching_sentence_endings", "matching"];

  const addQuestionGroup = (partId: string, type: string) => {
    const nextQNum = getNextQuestionNumber();
    // For pick2 type, create 2 questions by default
    const questionCount = type === "multiple_choice_pick2" ? 2 : 1;
    const questions = Array.from({ length: questionCount }, (_, i) => ({
      id: `new-q-${Date.now()}-${i}`,
      text: "",
      answer: "",
      choices: getDefaultChoicesForType(type),
      questionNumber: nextQNum + i,
    }));

    const newGroup: QuestionGroupDraft = {
      id: `new-qg-${Date.now()}`,
      type,
      title: "",
      description: getDefaultInstruction(type, nextQNum, nextQNum + questionCount - 1),
      groupChoices: getDefaultGroupChoicesForType(type),
      questions,
      startQuestionNumber: nextQNum,
      endQuestionNumber: nextQNum + questionCount - 1,
    };
    setPartsWithHistory((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, questionGroups: [...p.questionGroups, newGroup] } : p
      )
    );
  };

  const addQuestion = (partId: string, groupId: string) => {
    const nextQNum = getNextQuestionNumber();
    setPartsWithHistory((prev) =>
      prev.map((p) =>
        p.id === partId
          ? {
              ...p,
              questionGroups: p.questionGroups.map((g) =>
                g.id === groupId
                  ? {
                      ...g,
                      questions: [
                        ...g.questions,
                        {
                          id: `new-q-${Date.now()}`,
                          text: "",
                          answer: "",
                          choices: getDefaultChoicesForType(g.type),
                          questionNumber: nextQNum,
                        },
                      ],
                      endQuestionNumber: nextQNum,
                    }
                  : g
              ),
            }
          : p
      )
    );
  };

  const removeQuestionGroup = (partId: string, groupId: string) => {
    setPartsWithHistory((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, questionGroups: p.questionGroups.filter((g) => g.id !== groupId) } : p
      )
    );
  };

  const duplicatePart = (partIndex: number) => {
    setPartsWithHistory((prev) => {
      const source = prev[partIndex];
      const clone = JSON.parse(JSON.stringify(source));
      clone.id = crypto.randomUUID();
      clone.questionGroups = clone.questionGroups.map((g: any) => ({
        ...g,
        id: crypto.randomUUID(),
        questions: g.questions.map((q: any) => ({ ...q, id: crypto.randomUUID() })),
      }));
      const next = [...prev];
      next.splice(partIndex + 1, 0, clone);
      return renumberQuestions(next);
    });
  };

  const duplicateQuestionGroup = (partId: string, groupIndex: number) => {
    setPartsWithHistory((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== partId) return p;
        const source = p.questionGroups[groupIndex];
        const clone: QuestionGroupDraft = JSON.parse(JSON.stringify(source));
        clone.id = crypto.randomUUID();
        clone.questions = clone.questions.map((q) => ({ ...q, id: crypto.randomUUID() }));
        const groups = [...p.questionGroups];
        groups.splice(groupIndex + 1, 0, clone);
        return { ...p, questionGroups: groups };
      });
      return renumberQuestions(updated);
    });
  };

  const duplicateQuestion = (partId: string, groupId: string, questionIndex: number) => {
    setPartsWithHistory((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== partId) return p;
        return {
          ...p,
          questionGroups: p.questionGroups.map((g) => {
            if (g.id !== groupId) return g;
            const source = g.questions[questionIndex];
            const clone = { ...JSON.parse(JSON.stringify(source)), id: crypto.randomUUID() };
            const questions = [...g.questions];
            questions.splice(questionIndex + 1, 0, clone);
            return { ...g, questions };
          }),
        };
      });
      return renumberQuestions(updated);
    });
  };

  const getNextQuestionNumber = () => {
    let max = 0;
    parts.forEach((p) =>
      p.questionGroups.forEach((qg) =>
        qg.questions.forEach((q) => {
          if (q.questionNumber > max) max = q.questionNumber;
        })
      )
    );
    return max + 1;
  };

  const getQuestionTypes = (skill?: string) => {
    const s = skill || activeSkillTab || "READING";
    const sk = sectionTypeToSkill[s] || "reading";
    if (sk === "reading") return readingQuestionTypes;
    if (sk === "listening") return listeningQuestionTypes;
    return [];
  };




  const handleSave = async (silent = false, statusOverride?: string) => {
    if (!testName.trim()) {
      if (!silent) toast.error("Vui lòng nhập tên đề thi");
      return;
    }
    if (!program) {
      if (!silent) toast.error("Vui lòng chọn chương trình");
      return;
    }

    // Validate all questions have correct answers (skip for auto-save)
    if (!silent) {
      const missingCount = getMissingAnswerCount();
      if (missingCount > 0) {
        toast.error(`Còn ${missingCount} câu hỏi chưa có đáp án đúng. Vui lòng điền đầy đủ trước khi lưu.`);
        const firstMissing = findFirstMissingQuestionId();
        if (firstMissing) focusMissingQuestion(firstMissing);
        return;
      }
    }

    if (!silent) setSaving(true);
    try {
      const effectiveStatus = statusOverride || status;
      if (statusOverride) setStatus(statusOverride);
      // 1. Save assessment
      const assessmentResult = await saveAssessment.mutateAsync({
        id: isNew ? undefined : id,
        name: testName,
        bookName,
        sectionType,
        duration: (parseInt(durationMinutes) || 60) * 60,
        status: effectiveStatus,
        availableFrom: availableFrom || undefined,
        availableUntil: availableTo || undefined,
        contentType,
        difficulty,
        scoringMode: JSON.stringify({
          ...scoringModes,
          // Also collect per-part scoring modes for writing/speaking
          ...parts.filter(p => (p.skill === "WRITING" || p.skill === "SPEAKING") && p.scoringMode)
            .reduce((acc, p) => ({ ...acc, [`part:${p.id}`]: p.scoringMode }), {}),
        }),
        timerEnabled,
        program: program || undefined,
        courseLevel: courseLevel || undefined,
        description: description || undefined,
        allowRetake,
      });

      const assessmentId = assessmentResult.id;

      // 2. If editing, delete old parts/passages/qgs/questions
      if (!isNew) {
        const { data: oldParts } = await supabase.from("parts").select("id").eq("assessment_id", assessmentId);
        const oldPartIds = oldParts?.map((p) => p.id) || [];
        if (oldPartIds.length > 0) {
          const { data: oldQgs } = await supabase.from("question_groups").select("id").in("part_id", oldPartIds);
          const oldQgIds = oldQgs?.map((q) => q.id) || [];
          if (oldQgIds.length > 0) {
            await supabase.from("questions").delete().in("question_group_id", oldQgIds);
          }
          await supabase.from("question_groups").delete().in("part_id", oldPartIds);
          await supabase.from("passages").delete().in("part_id", oldPartIds);
          await supabase.from("parts").delete().eq("assessment_id", assessmentId);
        }
      }

      // 3. Insert parts, passages, question_groups, questions
      let totalQuestions = 0;
      for (const part of parts) {
        const { data: newPart, error: partErr } = await supabase
          .from("parts")
          .insert({
            assessment_id: assessmentId,
            title: part.title,
            description: part.description || null,
            order: part.order,
            audio_url: (sectionType === "LISTENING" && audioMode === "single" ? globalAudioUrl : part.audioUrl) || null,
            prep_time: part.prepTime || null,
            duration: part.duration || null,
            cue_card: part.cueCard || null,
            task_metadata: part.skill === "WRITING" ? (part.taskMetadata || null) : null,
          } as any)
          .select()
          .single();
        if (partErr || !newPart) throw partErr || new Error("Failed to save part");

        // Insert passages
        for (const ps of part.passages) {
          await supabase.from("passages").insert({
            part_id: newPart.id,
            title: ps.title,
            content: ps.content,
            description: ps.description || null,
          });
        }

        // Insert question groups + questions
        for (const qg of part.questionGroups) {
          const { data: newQg, error: qgErr } = await supabase
            .from("question_groups")
            .insert({
              part_id: newPart.id,
              title: qg.title || `Questions ${qg.startQuestionNumber}-${qg.endQuestionNumber}`,
              description: qg.description || null,
              question_type: qg.type,
              start_question_number: qg.startQuestionNumber,
              end_question_number: qg.endQuestionNumber,
              choices: ["diagram_labeling", "plan_map_diagram"].includes(qg.type)
                ? (qg.diagramPins?.length ? { pins: qg.diagramPins, displayMode: qg.diagramMode || "pins_side", answerChoices: qg.groupChoices || [] } : null)
                : (qg.groupChoices || null),
              completion_paragraph: ["diagram_labeling", "plan_map_diagram"].includes(qg.type)
                ? (qg.diagramImageUrl || null)
                : (qg.completionParagraph || null),
            })
            .select()
            .single();
          if (qgErr || !newQg) throw qgErr || new Error("Failed to save question group");

          for (const q of qg.questions) {
            totalQuestions++;
            const skipsAnswer = part.skill === "SPEAKING" || part.skill === "WRITING";
            await supabase.from("questions").insert({
              question_group_id: newQg.id,
              question_number: q.questionNumber,
              title: null,
              text: q.text || null,
              choices: q.choices || null,
              correct_answer: skipsAnswer ? (q.answer || "") : (q.answer || "N/A"),
              explain: q.explain || null,
              passage_evidence: q.passageEvidence || null,
              points: q.points ?? null,
            } as any);
          }
        }
      }

      // 4. Update total_questions
      await supabase
        .from("assessments")
        .update({ total_questions: totalQuestions })
        .eq("id", assessmentId);

      // 5. If placement context, link assessment to placement test section
      if (placementId && placementId !== "pending" && placementSkill) {
        // Remove existing section for this skill
        await supabase.from("placement_test_sections")
          .delete()
          .eq("placement_test_id", placementId)
          .eq("skill", placementSkill);
        // Insert new link
        await supabase.from("placement_test_sections").insert({
          placement_test_id: placementId,
          assessment_id: assessmentId,
          skill: placementSkill,
          sort_order: 0,
        } as any);
      }

      if (isNew) {
        if (returnTo) {
          navigate(decodeURIComponent(returnTo), { replace: true });
        } else {
          navigate(`/tests/${assessmentId}`, { replace: true });
        }
      }

      setIsDirty(false);
      lastAutoSaveRef.current = JSON.stringify(parts);
      if (!silent) toast.success("Đã lưu thành công!");
    } catch (err: any) {
      if (!silent) toast.error("Lỗi lưu: " + (err?.message || "Unknown error"));
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Auto-save every 30 seconds (silent, only when dirty and not a new unsaved test)
  const lastAutoSaveRef = useRef<string>("");
  const autoSavingRef = useRef(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    const interval = setInterval(async () => {
      if (!isDirty || autoSavingRef.current || saving) return;
      const snapshot = JSON.stringify(parts);
      if (snapshot === lastAutoSaveRef.current) return;
      autoSavingRef.current = true;
      setIsAutoSaving(true);
      try {
        await handleSave(true);
        setLastAutoSaveTime(new Date());
      } finally {
        autoSavingRef.current = false;
        setIsAutoSaving(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  });

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-extrabold flex items-center gap-2">
            {isNew ? "Tạo mới" : "Chỉnh sửa"}
            {contentType === "exercise" ? " bài tập" : " đề thi"}
            {!isNew && (
              <span className={`inline-flex items-center rounded-full text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 ${
                status === "published" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              }`}>
                {status === "published" ? "Published" : "Nháp"}
              </span>
            )}
          </h1>
        </div>
        {/* Auto-save indicator */}
        {!isNew && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            {isAutoSaving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Đang lưu...</>
            ) : lastAutoSaveTime ? (
              <><CheckCircle2 className="h-3 w-3 text-green-500" /> Đã lưu lúc {lastAutoSaveTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
            ) : null}
          </span>
        )}
        {currentStep === 4 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="rounded-xl h-9 w-9">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="rounded-xl h-9 w-9">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!isNew && (
          <Button variant="outline" onClick={() => navigate(`/tests/${id}/preview`)} className="gap-2 rounded-xl">
            <Eye className="h-4 w-4" /> Preview
          </Button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {[
          { num: 1, label: "Phân loại" },
          { num: 2, label: "Thông tin" },
          { num: 3, label: "Phân loại chi tiết" },
          { num: 4, label: "Câu hỏi" },
        ].map((step, i) => (
          <div key={step.num} className="flex items-center flex-1">
            <button
              onClick={() => !isNew || step.num <= currentStep ? setCurrentStep(step.num) : undefined}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all w-full",
                currentStep === step.num
                  ? "bg-primary text-primary-foreground shadow-md"
                  : step.num < currentStep
                    ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                    : "bg-muted text-muted-foreground"
              )}
            >
              <span className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold shrink-0",
                currentStep === step.num ? "bg-primary-foreground/20" : step.num < currentStep ? "bg-primary/20" : "bg-muted-foreground/20"
              )}>
                {step.num < currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.num}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < 3 && <div className="h-px w-2 bg-border shrink-0 mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Step 1: Content Type */}
      {currentStep === 1 && (
        <div className="bg-card rounded-xl border p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-bold text-lg">Bạn muốn tạo gì?</h2>
            <p className="text-sm text-muted-foreground">Chọn loại nội dung bạn muốn tạo</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <button
              onClick={() => setContentType("test")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-md",
                contentType === "test"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <div className={cn("p-3 rounded-xl", contentType === "test" ? "bg-primary/10" : "bg-muted")}>
                <BookOpen className={cn("h-8 w-8", contentType === "test" ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Bài thi</p>
                <p className="text-xs text-muted-foreground mt-1">Đề thi đầy đủ cho module Chinh phục</p>
              </div>
            </button>
            <button
              onClick={() => setContentType("exercise")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-md",
                contentType === "exercise"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <div className={cn("p-3 rounded-xl", contentType === "exercise" ? "bg-primary/10" : "bg-muted")}>
                <PenTool className={cn("h-8 w-8", contentType === "exercise" ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Bài tập</p>
                <p className="text-xs text-muted-foreground mt-1">Bài luyện tập cho module Luyện tập</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Basic Info */}
      {currentStep === 2 && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h2 className="font-bold text-sm">Thông tin cơ bản</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{isExercise ? "Tên bài tập" : "Tên đề thi"} *</label>
              <Input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder={isExercise ? "e.g. Matching Headings Practice" : "e.g. Reading Test 1"} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reference (nguồn tham khảo)</label>
              <Input value={bookName} onChange={(e) => setBookName(e.target.value)} placeholder="e.g. Cambridge IELTS 18" className="rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Mô tả ngắn</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn về nội dung..." className="rounded-xl" rows={2} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Thời lượng (phút) *</label>
              <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="60" className="rounded-xl" min="1" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Switch checked={hasAvailableFrom} onCheckedChange={(v) => { setHasAvailableFrom(v); if (!v) setAvailableFrom(""); }} className="scale-75" />
                <label className="text-xs font-medium text-muted-foreground">Thời gian mở</label>
              </div>
              {hasAvailableFrom ? (
                <Input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="rounded-xl" />
              ) : (
                <p className="text-xs text-muted-foreground italic mt-2">Không giới hạn</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Switch checked={hasAvailableTo} onCheckedChange={(v) => { setHasAvailableTo(v); if (!v) setAvailableTo(""); }} className="scale-75" />
                <label className="text-xs font-medium text-muted-foreground">Thời gian đóng</label>
              </div>
              {hasAvailableTo ? (
                <Input type="date" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className="rounded-xl" />
              ) : (
                <p className="text-xs text-muted-foreground italic mt-2">Không giới hạn</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Tags & Classification */}
      {currentStep === 3 && (
        <div className="bg-card rounded-xl border p-5 space-y-6">
          <h2 className="font-bold text-sm">Phân loại chi tiết</h2>

          {/* Skill selection — multi-select with skill palette */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2.5 block">Kỹ năng *</label>
            <div className="flex flex-wrap gap-2">
              {(["reading", "listening", "writing", "speaking"] as const).map((skill) => {
                const colors = SKILL_COLOR_MAP[skill];
                const Icon = colors.icon;
                const sectionKey = skill.toUpperCase();
                const isSelected = selectedSkills.includes(sectionKey);
                return (
                  <button
                    key={skill}
                    onClick={() => {
                      setSelectedSkills((prev) => {
                        const next = prev.includes(sectionKey)
                          ? prev.filter((s) => s !== sectionKey)
                          : [...prev, sectionKey];
                        if (next.length > 0 && !next.includes(sectionType)) {
                          setSectionType(next[0]);
                        }
                        return next.length > 0 ? next : prev;
                      });
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                      isSelected
                        ? `${colors.bg} ${colors.text} ring-2 ${colors.border.replace("border-", "ring-")}`
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {colors.label}
                    {isSelected && <span className={cn("ml-0.5 h-1.5 w-1.5 rounded-full", colors.bar)} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Program */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2.5 block">
              Chương trình <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "ielts", label: "IELTS", bg: "bg-indigo-500/10", text: "text-indigo-700", ring: "ring-indigo-300", dot: "bg-indigo-500" },
                { value: "wre", label: "WRE", bg: "bg-teal-500/10", text: "text-teal-700", ring: "ring-teal-300", dot: "bg-teal-500" },
                { value: "customized", label: "Customized", bg: "bg-amber-500/10", text: "text-amber-700", ring: "ring-amber-300", dot: "bg-amber-500" },
                { value: "other", label: "Khác", bg: "bg-gray-500/10", text: "text-gray-700", ring: "ring-gray-300", dot: "bg-gray-500" },
              ] as const).map((p) => {
                const isSelected = program === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setProgram(p.value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                      isSelected
                        ? `${p.bg} ${p.text} ring-2 ${p.ring}`
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {p.label}
                    {isSelected && <span className={cn("ml-0.5 h-1.5 w-1.5 rounded-full", p.dot)} />}
                  </button>
                );
              })}
            </div>
            {!program && (
              <p className="text-xs text-destructive mt-1.5">Vui lòng chọn chương trình</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Difficulty */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2.5 block">Độ khó</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "easy", label: "Dễ", bg: "bg-emerald-500/10", text: "text-emerald-700", ring: "ring-emerald-300", dot: "bg-emerald-500" },
                  { value: "medium", label: "Trung bình", bg: "bg-amber-500/10", text: "text-amber-700", ring: "ring-amber-300", dot: "bg-amber-500" },
                  { value: "hard", label: "Khó", bg: "bg-rose-500/10", text: "text-rose-700", ring: "ring-rose-300", dot: "bg-rose-500" },
                ] as const).map((d) => {
                  const isSelected = difficulty === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                        isSelected
                          ? `${d.bg} ${d.text} ring-2 ${d.ring}`
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {d.label}
                      {isSelected && <span className={cn("ml-0.5 h-1.5 w-1.5 rounded-full", d.dot)} />}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Course Level */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Cấp độ / Khoá</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2 w-full max-w-xs px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left",
                      courseLevel
                        ? (() => { const lc = getLevelColorConfig(courseLevels.find(c => c.name === courseLevel)?.color_key || courseLevel); return lc ? `${lc.bg} ${lc.text} ${lc.border} border` : "bg-primary/10 text-primary border-primary/30"; })()
                        : "bg-card text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {courseLevel ? (
                      <>
                        <span
                          className="h-3 w-3 rounded-full shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: getLevelColorConfig(courseLevels.find(c => c.name === courseLevel)?.color_key || courseLevel)?.swatch || "#94a3b8" }}
                        />
                        <span className="flex-1">{courseLevel}</span>
                        <X
                          className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={(e) => { e.stopPropagation(); setCourseLevel(""); }}
                        />
                      </>
                    ) : (
                      <span className="flex-1">Chọn cấp độ...</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-1.5" align="start">
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {courseLevels.map((cl) => {
                      const lc = getLevelColorConfig(cl.color_key || cl.name);
                      const isSelected = courseLevel === cl.name;
                      return (
                        <button
                          key={cl.id}
                          onClick={() => { setCourseLevel(isSelected ? "" : cl.name); }}
                          className={cn(
                            "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
                            isSelected
                              ? (lc ? `${lc.bg} ${lc.text}` : "bg-primary/10 text-primary")
                              : "hover:bg-accent text-foreground/80"
                          )}
                        >
                          <span
                            className="h-3 w-3 rounded-full shrink-0 ring-1 ring-black/10"
                            style={{ backgroundColor: lc?.swatch || "#94a3b8" }}
                          />
                          <span className="flex-1 text-left">{cl.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Timer + Retake — scoring moved to step 4 */}
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
              <label className="text-xs font-medium text-muted-foreground">Bật đồng hồ đếm ngược cho học viên</label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
              <label className="text-xs font-medium text-muted-foreground">
                Cho phép làm lại {allowRetake
                  ? "(Performance lấy điểm cao nhất)"
                  : "(Mỗi học viên chỉ được làm 1 lần)"}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Parts & Questions — organized by skill tabs */}
      {currentStep === 4 && (
        <>
          {/* Skill tabs */}
          {selectedSkills.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {selectedSkills.map((sk) => {
                const skillKey = sectionTypeToSkill[sk] || "reading";
                const colors = SKILL_COLOR_MAP[skillKey];
                const Icon = colors.icon;
                const skillParts = parts.filter(p => p.skill === sk);
                const qCount = skillParts.reduce((sum, p) => sum + p.questionGroups.reduce((gs, g) => gs + g.questions.length, 0), 0);
                return (
                  <button
                    key={sk}
                    onClick={() => setActiveSkillTab(sk)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      activeSkillTab === sk
                        ? `${colors.bg} ${colors.text} ring-2 ${colors.border.replace("border-", "ring-")} shadow-sm`
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {colors.label}
                    <span className={cn("text-[10px] rounded-full px-1.5 py-0.5 font-bold", activeSkillTab === sk ? colors.bar + " text-white" : "bg-muted-foreground/20")}>{qCount}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Audio Mode for Listening */}
          {(activeSkillTab === "LISTENING" || (selectedSkills.length === 1 && selectedSkills[0] === "LISTENING")) && selectedSkills.includes("LISTENING") && (
            <div className="bg-card rounded-xl border p-5 space-y-4">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Headphones className="h-4 w-4" /> Audio & Thời lượng Listening
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground"> Chế độ Audio</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audioMode" checked={audioMode === "single"} onChange={() => setAudioMode("single")} className="accent-primary" />
                      <span className="text-sm">1 audio cho toàn bài</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audioMode" checked={audioMode === "per_part"} onChange={() => setAudioMode("per_part")} className="accent-primary" />
                      <span className="text-sm">Mỗi section 1 audio</span>
                    </label>
                  </div>
                  {audioMode === "single" && (
                    <AudioUploader value={globalAudioUrl} onChange={setGlobalAudioUrl} workdriveCategory="bai_thi" workdriveItemName={testName || "Untitled"} />
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground">⏱ Thời lượng làm bài</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="listeningDuration" checked={listeningDurationMode === "audio"} onChange={() => setListeningDurationMode("audio")} className="accent-primary" />
                      <span className="text-sm">Theo độ dài audio</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="listeningDuration" checked={listeningDurationMode === "manual"} onChange={() => setListeningDurationMode("manual")} className="accent-primary" />
                      <span className="text-sm">Tự chỉnh</span>
                    </label>
                  </div>
                  {listeningDurationMode === "audio" && (
                    <p className="text-xs text-muted-foreground italic">Thời lượng sẽ tự động theo độ dài audio khi học viên làm bài.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Duration overflow check */}
          {(() => {
            const totalPartMinutes = parts.reduce((sum, p) => sum + (p.duration || 0), 0);
            const totalLimit = parseInt(durationMinutes) || 0;
            const isOverflow = totalLimit > 0 && totalPartMinutes > totalLimit;
            return isOverflow ? (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs font-medium border border-destructive/20">
                 Tổng thời lượng các phần ({totalPartMinutes} phút) vượt quá thời lượng tổng ({totalLimit} phút) — vui lòng điều chỉnh!
              </div>
            ) : null;
          })()}

          {/* Render parts for the active skill tab */}
          {selectedSkills.map((skillTab) => {
            if (selectedSkills.length > 1 && skillTab !== activeSkillTab) return null;
            const skillKey = sectionTypeToSkill[skillTab] || "reading";
            const skillColors = SKILL_COLOR_MAP[skillKey];
            const filteredParts = parts.filter(p => p.skill === skillTab);
            const filteredIndices = parts.reduce<number[]>((acc, p, i) => { if (p.skill === skillTab) acc.push(i); return acc; }, []);
            const totalPartMinutes = parts.reduce((sum, p) => sum + (p.duration || 0), 0);
            const totalLimit = parseInt(durationMinutes) || 0;
            const isDurationOverflow = totalLimit > 0 && totalPartMinutes > totalLimit;

            return (
              <div key={skillTab} className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    {React.createElement(skillColors.icon, { className: `h-4 w-4 ${skillColors.text}` })}
                    {skillColors.label} — Parts & Questions
                    <span className={cn("ml-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", skillColors.bg, skillColors.text)}>
                      {filteredParts.reduce((sum, p) => sum + p.questionGroups.reduce((gs, g) => gs + g.questions.length, 0), 0)} questions
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Scoring mode at skill level for Reading/Listening */}
                    {(skillTab === "READING" || skillTab === "LISTENING") && (
                      <Select
                        value={scoringModes[skillTab] || "ielts_band"}
                        onValueChange={(v) => setScoringModes((prev) => ({ ...prev, [skillTab]: v }))}
                      >
                        <SelectTrigger className="rounded-xl h-8 text-xs w-[180px]">
                          <span className="text-muted-foreground mr-1">Chấm:</span>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ielts_band">IELTS Band Score</SelectItem>
                          <SelectItem value="custom">Tự do (thủ công)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="outline" size="sm" onClick={() => addPart(skillTab)} className="gap-1.5 rounded-xl">
                      <Plus className="h-3.5 w-3.5" /> Add Part
                    </Button>
                  </div>
                </div>

                {filteredParts.map((part, localPi) => {
                  const pi = filteredIndices[localPi];
                  return (
                    <div
                      key={part.id}
                      className={`bg-card rounded-xl border p-5 space-y-4 transition-all duration-200 ${
                        isDraggingGroup && dragOverPartId === part.id && dragGroupRef.current?.partId !== part.id
                          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-lg'
                          : isDraggingGroup && dragGroupRef.current?.partId !== part.id
                            ? 'border-dashed border-muted-foreground/30'
                            : ''
                      }`}
                      onDragOver={(e) => { handlePartDragOver(e, pi); if (isDraggingGroup) setDragOverPartId(part.id); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverPartId(null); }}
                      onDragEnd={() => { handlePartDragEnd(); setDragOverPartId(null); setIsDraggingGroup(false); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <button onClick={() => movePart(pi, -1)} disabled={localPi === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <div
                            draggable
                            onDragStart={() => handlePartDragStart(pi)}
                            className="hidden sm:block cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <button onClick={() => movePart(pi, 1)} disabled={localPi === filteredParts.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", skillColors.bg, skillColors.text)}>Part {localPi + 1}</span>
                        <Input
                          value={part.title}
                          onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => (p.id === part.id ? { ...p, title: e.target.value } : p)))}
                          placeholder="Part title"
                          className="flex-1 rounded-xl text-sm"
                        />
                        <button onClick={() => duplicatePart(pi)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Nhân bản Part">
                          <Copy className="h-4 w-4" />
                        </button>
                        <button onClick={() => removePart(part.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {part.skill !== "SPEAKING" && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">⏱ phút</span>
                            <Input
                              type="number"
                              value={part.duration || ""}
                              onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => (p.id === part.id ? { ...p, duration: parseInt(e.target.value) || undefined } : p)))}
                              placeholder="—"
                              className={cn(
                                "w-16 h-7 rounded-lg text-xs text-center",
                                isDurationOverflow && part.duration ? "border-destructive ring-1 ring-destructive/40 bg-destructive/5 text-destructive" : ""
                              )}
                            />
                          </div>
                        )}
                      </div>

                      {((part.skill === "LISTENING" && audioMode === "per_part") || part.audioUrl) && (
                        <AudioUploader
                          value={part.audioUrl || ""}
                          onChange={(url) => setPartsWithHistory((prev) => prev.map((p) => (p.id === part.id ? { ...p, audioUrl: url } : p)))}
                          workdriveCategory="bai_thi"
                          workdriveItemName={`${testName || "Untitled"} - ${part.title || `Part ${localPi + 1}`}`}
                          entityType="assessment_part"
                          entityId={part.id}
                        />
                      )}

                      {/* Per-part scoring mode for Speaking/Writing */}
                      {(part.skill === "SPEAKING" || part.skill === "WRITING") && (
                        <div className={cn(
                          "bg-muted/30 rounded-lg p-3 border",
                          part.skill === "SPEAKING" ? "grid grid-cols-3 gap-4" : "flex items-center gap-4"
                        )}>
                          {part.skill === "SPEAKING" && (
                            <>
                              <div>
                                <label className="text-xs font-bold text-muted-foreground mb-1 block">⏱ Thời gian chuẩn bị (giây)</label>
                                <Input type="number" value={part.prepTime || ""} onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => (p.id === part.id ? { ...p, prepTime: parseInt(e.target.value) || 0 } : p)))} placeholder="e.g. 60" className="rounded-lg text-sm" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-muted-foreground mb-1 block"> Thời gian nói (giây)</label>
                                <Input type="number" value={part.duration || ""} onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => (p.id === part.id ? { ...p, duration: parseInt(e.target.value) || 0 } : p)))} placeholder="e.g. 120" className="rounded-lg text-sm" />
                              </div>
                            </>
                          )}
                          <div className={part.skill === "SPEAKING" ? "" : "flex-1"}>
                            <label className="text-xs font-bold text-muted-foreground mb-1 block"> Chế độ chấm</label>
                            <Select
                              value={part.scoringMode || "ielts_band"}
                              onValueChange={(v) => setPartsWithHistory((prev) => prev.map((p) => (p.id === part.id ? { ...p, scoringMode: v } : p)))}
                            >
                              <SelectTrigger className="rounded-lg text-sm h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ielts_band">IELTS Band Score</SelectItem>
                                <SelectItem value="custom">Tự do (thủ công)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Writing-only: per-task config (IELTS task type, stimulus image, word limits) */}
                      {part.skill === "WRITING" && (
                        <WritingTaskConfig
                          value={part.taskMetadata}
                          onChange={(meta) => setPartsWithHistory((prev) => prev.map((p) => (p.id === part.id ? { ...p, taskMetadata: meta } : p)))}
                        />
                      )}

                      {(part.skill === "READING" || part.skill === "LISTENING") && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            {part.skill === "LISTENING" ? <Headphones className="h-3.5 w-3.5 text-primary" /> : <BookOpenText className="h-3.5 w-3.5 text-primary" />}
                            <span className="text-xs font-semibold text-primary">{part.skill === "LISTENING" ? "Transcript" : "Reading Passages"}</span>
                            {part.skill === "READING" && <span className="text-[10px] text-muted-foreground">({part.passages.length} passage{part.passages.length !== 1 ? "s" : ""})</span>}
                          </div>
                          {part.passages.map((ps, psi) => {
                            const previewId = `preview-${ps.id}`;
                            const isPreviewOpen = expandedPreviews.includes(ps.id);
                            return (
                            <div key={ps.id} className="border border-primary/20 rounded-xl bg-primary/5 p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{part.skill === "LISTENING" ? "Transcript" : `Passage ${psi + 1}`}</span>
                                <button
                                  onClick={() => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, passages: p.passages.filter((pp) => pp.id !== ps.id) } : p))}
                                  className="ml-auto p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Xoá passage"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Title */}
                              <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{part.skill === "LISTENING" ? "Tiêu đề Transcript" : "Tiêu đề Passage"}</label>
                                <Input
                                  value={ps.title}
                                  onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, passages: p.passages.map((pp) => pp.id === ps.id ? { ...pp, title: e.target.value } : pp) } : p))}
                                  placeholder={part.skill === "LISTENING" ? "Ví dụ: Transcript Part 1" : "Ví dụ: Reading Passage 1"}
                                  className="rounded-lg text-sm font-semibold"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Hiển thị khi thi: <strong className="text-foreground uppercase">{ps.title || (part.skill === "LISTENING" ? "TRANSCRIPT" : "READING PASSAGE X")}</strong></p>
                              </div>

                              {/* Instruction text */}
                              <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Hướng dẫn (Instructions)</label>
                                <Textarea
                                  value={ps.description || ""}
                                  onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, passages: p.passages.map((pp) => pp.id === ps.id ? { ...pp, description: e.target.value } : pp) } : p))}
                                  placeholder="Ví dụ: You should spend about 20 minutes on <strong>Questions 1–13</strong>, which are based on Reading Passage 1 below."
                                  className="rounded-lg text-xs min-h-[50px] resize-none italic"
                                  rows={2}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Dùng <code className="bg-muted px-1 rounded">&lt;strong&gt;...&lt;/strong&gt;</code> để in đậm</p>
                              </div>

                              {/* Collapsible preview */}
                              <button
                                type="button"
                                onClick={() => setExpandedPreviews(prev => prev.includes(ps.id) ? prev.filter(id => id !== ps.id) : [...prev, ps.id])}
                                className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
                              >
                                <Eye className="h-3 w-3" />
                                Xem trước hiển thị
                                <ChevronRight className={cn("h-3 w-3 ml-auto transition-transform", isPreviewOpen && "rotate-90")} />
                              </button>
                              {isPreviewOpen && (
                                <div className="bg-background rounded-lg border border-border/50 p-4 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <p className="text-sm font-bold uppercase tracking-wide">{ps.title || "READING PASSAGE X"}</p>
                                  <p className="text-xs italic text-muted-foreground" dangerouslySetInnerHTML={{ __html: ps.description || "You should spend about 20 minutes on <strong>Questions ___–___</strong>, which are based on Reading Passage X below." }} />
                                  {ps.content && (
                                    <div className="mt-3 pt-3 border-t border-border/30 prose prose-sm max-w-none text-xs" dangerouslySetInnerHTML={{ __html: ps.content }} />
                                  )}
                                </div>
                              )}

                              {/* Passage content - rich text */}
                              <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{part.skill === "LISTENING" ? "Nội dung Transcript" : "Nội dung bài đọc"}</label>
                                <RichTextEditor
                                  scopeId={`passage-${ps.id}`}
                                  value={ps.content}
                                  onChange={(html) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, passages: p.passages.map((pp) => pp.id === ps.id ? { ...pp, content: html } : pp) } : p))}
                                  placeholder={part.skill === "LISTENING" ? "Nhập transcript (tuỳ chọn)..." : "Nhập nội dung bài đọc: các đoạn văn (paragraphs A, B, C...)..."}
                                  minHeight="200px"
                                  showHeadings
                                />
                              </div>
                            </div>
                            );
                          })}
                          {part.skill === "READING" && (
                            <button onClick={() => addPassage(part.id)} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                              <Plus className="h-3.5 w-3.5" /> Thêm Passage
                            </button>
                          )}
                        </div>
                      )}

                      {part.questionGroups.map((group, gi) => (
                        <div
                          key={group.id}
                          className="border rounded-lg p-4 space-y-3 transition-shadow"
                          onDragOver={(e) => { e.stopPropagation(); handleGroupDragOver(e, part.id, gi); }}
                          onDragEnd={handleGroupDragEnd}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center gap-0.5">
                              <button onClick={(e) => { e.stopPropagation(); moveGroup(part.id, gi, -1); }} disabled={gi === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                                <ChevronUp className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <div
                                draggable
                                onDragStart={(e) => { e.stopPropagation(); handleGroupDragStart(part.id, gi); }}
                                className="hidden sm:block cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); moveGroup(part.id, gi, 1); }} disabled={gi === part.questionGroups.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", skillColors.bg, skillColors.text)}>
                              {skillColors.label} — Group {gi + 1}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{group.type.replace(/_/g, " ")}</span>
                            <Input
                              value={group.title}
                              onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, title: e.target.value } : g) } : p))}
                              placeholder="Group title / instructions"
                              className="flex-1 rounded-lg text-xs"
                            />
                            <button onClick={() => duplicateQuestionGroup(part.id, gi)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Nhân bản nhóm">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => removeQuestionGroup(part.id, group.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Xóa nhóm">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">⏱ phút</span>
                              <Input
                                type="number"
                                value={group.duration || ""}
                                onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, duration: parseInt(e.target.value) || undefined } : g) } : p))}
                                placeholder="—"
                                className="w-14 h-6 rounded-md text-xs text-center"
                              />
                            </div>
                          </div>

                          <RichTextEditor
                            scopeId={`groupdesc-${group.id}`}
                            value={group.description || ""}
                            onChange={(html) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, description: html } : g) } : p))}
                            placeholder="Group description / instructions (supports tables, formatting, [blank_x])..."
                            minHeight="80px"
                          />

                          {/* Matching types & Pick2: group-level options editor */}
                          {(MATCHING_TYPES.includes(group.type) || group.type === "multiple_choice_pick2") && (
                            <div className="bg-muted/20 rounded-lg border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground">
                                  {group.type ==="multiple_choice_pick2"?"Đáp án (A–E) — học viên chọn 2 trong số này":
                                   group.type ==="matching_headings"?"Danh sách Headings (i, ii, iii...)":
                                   group.type ==="matching_information"?"Các đoạn văn (Paragraphs)":
                                   group.type ==="matching_features"?"Danh sách đặc điểm (Features)":
                                   "Danh sách phần kết câu (Sentence Endings)"}
                                </p>
                                <button
                                  onClick={() => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, groupChoices: [...(g.groupChoices || []), ""] } : g) } : p))}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Thêm
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {(group.groupChoices || []).map((gc, gci) => {
                                  const label = group.type === "matching_headings"
                                    ? ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"][gci] || String(gci + 1)
                                    : String.fromCharCode(65 + gci);
                                  return (
                                    <div key={gci} className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-muted-foreground w-8 shrink-0 text-right">{label}.</span>
                                      <Input
                                        value={gc}
                                        onChange={(e) => {
                                          const newChoices = [...(group.groupChoices || [])];
                                          newChoices[gci] = e.target.value;
                                          setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, groupChoices: newChoices } : g) } : p));
                                        }}
                                        placeholder={group.type === "matching_headings" ? `Heading ${label}` : `Option ${label}`}
                                        className="rounded-lg text-xs flex-1"
                                      />
                                      <button
                                        onClick={() => {
                                          const newChoices = (group.groupChoices || []).filter((_, i) => i !== gci);
                                          setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, groupChoices: newChoices } : g) } : p));
                                        }}
                                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {["diagram_labeling", "plan_map_diagram"].includes(group.type) && (
                            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-primary/10">
                                    <ImageIcon className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold text-foreground">Ảnh sơ đồ (Diagram)</span>
                                    <p className="text-[10px] text-muted-foreground">Kéo thả hoặc chọn file ảnh — tự đồng bộ WorkDrive</p>
                                  </div>
                                </div>
                                {group.diagramImageUrl && (
                                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 px-2 text-xs gap-1"
                                    onClick={async () => {
                                      // Delete from WorkDrive first
                                      deleteWorkDriveByEntity(supabase, "diagram_image", group.id).then((ok) => {
                                        if (ok) toast.success("Đã xoá ảnh trên WorkDrive");
                                      });
                                      setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, diagramImageUrl: "" } : g) } : p));
                                    }}>
                                    <Trash2 className="h-3 w-3" /> Xoá
                                  </Button>
                                )}
                              </div>

                              {group.diagramImageUrl ? (
                                <div className="space-y-3">
                                  {/* Pin Editor */}
                                  <DiagramPinEditor
                                    imageUrl={group.diagramImageUrl}
                                    pins={group.diagramPins || []}
                                    onPinsChange={(pins) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, diagramPins: pins } : g) } : p))}
                                    displayMode={group.diagramMode || "pins_side"}
                                    onDisplayModeChange={(mode) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, diagramMode: mode } : g) } : p))}
                                    startQuestionNumber={group.startQuestionNumber}
                                    endQuestionNumber={group.endQuestionNumber}
                                    answerMap={Object.fromEntries(group.questions.map(q => [q.questionNumber, q.answer]).filter(([_, a]) => a))}
                                  />
                                  {/* Answer bank for drag_drop mode */}
                                  {group.diagramMode === "drag_drop" && (
                                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                      <p className="text-xs font-bold text-muted-foreground">Ngân hàng đáp án <span className="text-primary font-normal">(gồm đáp án đúng + nhiễu — học viên sẽ kéo thả)</span></p>
                                      <div className="flex flex-wrap gap-2">
                                        {(group.groupChoices || []).map((gc, gci) => (
                                          <div key={gci} className="flex items-center gap-1 bg-card rounded-lg border px-2 py-1">
                                            <Input
                                              value={gc}
                                              onChange={(e) => {
                                                const newChoices = [...(group.groupChoices || [])];
                                                newChoices[gci] = e.target.value;
                                                setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, groupChoices: newChoices } : g) } : p));
                                              }}
                                              placeholder={`Đáp án ${gci + 1}`}
                                              className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 w-28"
                                            />
                                            <button type="button" onClick={() => {
                                              const newChoices = (group.groupChoices || []).filter((_, i) => i !== gci);
                                              setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, groupChoices: newChoices } : g) } : p));
                                            }} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                              <X className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1"
                                          onClick={() => {
                                            const newChoices = [...(group.groupChoices || []), ""];
                                            setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, groupChoices: newChoices } : g) } : p));
                                          }}>
                                          <Plus className="h-3 w-3" /> Thêm
                                        </Button>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground italic">Thêm các đáp án nhiễu (distractor) ngoài đáp án đúng để tăng độ khó. Ở phần câu hỏi bên dưới, chọn đáp án đúng cho mỗi pin.</p>
                                    </div>
                                  )}
                                  {/* Change/view image buttons */}
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" className="gap-1 text-xs h-7"
                                      onClick={() => window.open(group.diagramImageUrl, '_blank')}>
                                      <ZoomIn className="h-3 w-3" /> Xem gốc
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" className="gap-1 text-xs h-7"
                                      onClick={() => document.getElementById(`diagram-upload-${group.id}`)?.click()}>
                                      <Upload className="h-3 w-3" /> Đổi ảnh
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 py-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                  onClick={() => document.getElementById(`diagram-upload-${group.id}`)?.click()}
                                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/10"); }}
                                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/10"); }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove("border-primary", "bg-primary/10");
                                    const file = e.dataTransfer.files?.[0];
                                    if (!file || !file.type.startsWith("image/")) return;
                                    const input = document.getElementById(`diagram-upload-${group.id}`) as HTMLInputElement;
                                    if (input) {
                                      const dt = new DataTransfer();
                                      dt.items.add(file);
                                      input.files = dt.files;
                                      input.dispatchEvent(new Event("change", { bubbles: true }));
                                    }
                                  }}
                                >
                                  <div className="p-3 rounded-full bg-muted">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm font-medium text-muted-foreground">Kéo thả ảnh vào đây</p>
                                  <p className="text-xs text-muted-foreground/60">hoặc nhấn để chọn file (PNG, JPG, WebP)</p>
                                </div>
                              )}

                              {/* URL paste fallback */}
                              <div className="flex gap-2 items-center">
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">URL:</span>
                                <Input
                                  value={group.diagramImageUrl || ""}
                                  onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, diagramImageUrl: e.target.value } : g) } : p))}
                                  placeholder="Dán URL ảnh trực tiếp..."
                                  className="text-xs flex-1 h-8"
                                />
                              </div>

                              <input
                                id={`diagram-upload-${group.id}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const ext = file.name.split(".").pop() || "png";
                                  // Structured file naming: {testName}_Part{n}_diagram_{groupIndex}.{ext}
                                  const safeName = (testName || "untitled").replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]/g, "").replace(/\s+/g, "_").slice(0, 60);
                                  const partIdx = parts.findIndex(p => p.id === part.id) + 1;
                                  const groupIdx = part.questionGroups.findIndex(g => g.id === group.id) + 1;
                                  const fileName = `${safeName}_Part${partIdx}_diagram_${groupIdx}.${ext}`;
                                  const storagePath = `diagrams/${fileName}`;

                                  // Show loading toast
                                  const toastId = toast.loading("Đang upload ảnh sơ đồ...");

                                  // 1. Upload to Supabase Storage
                                  const { error } = await supabase.storage.from("exercise-images").upload(storagePath, file, { upsert: true });
                                  if (error) { toast.error("Upload thất bại", { id: toastId }); return; }
                                  const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(storagePath);
                                  const publicUrl = urlData.publicUrl;

                                  // 2. Update state
                                  setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, diagramImageUrl: publicUrl } : g) } : p));

                                  // 3. Sync to WorkDrive in background
                                  const category = isExercise ? "bai_tap" : "bai_thi";
                                  const itemName = testName || "Untitled";
                                  uploadToWorkDrive({
                                    file,
                                    fileName,
                                    category,
                                    skill: "",
                                    itemName,
                                    entityType: "diagram_image",
                                    entityId: group.id,
                                    audioUrl: publicUrl,
                                  }).then((res) => {
                                    if (res) toast.success(`Đã upload & đồng bộ WorkDrive`, { id: toastId });
                                    else toast.success("Đã upload ảnh (WorkDrive sync bỏ qua)", { id: toastId });
                                  }).catch(() => {
                                    toast.success("Đã upload ảnh", { id: toastId });
                                  });

                                  e.target.value = "";
                                }}
                              />
                            </div>
                          )}

                          {["sentence_completion", "summary_completion", "form_completion", "note_completion", "table_completion"].includes(group.type) && (
                            <div className="bg-muted/20 rounded-lg border p-3 space-y-3">
                              <p className="text-xs font-bold text-muted-foreground">Completion Paragraph — <span className="text-primary">bôi đen chữ</span> rồi bấm <strong>Blank</strong> để tạo ô trống (đáp án = chữ được bôi)</p>
                              <RichTextEditor
                                scopeId={`group-${group.id}`}
                                blankStart={group.startQuestionNumber || 1}
                                value={group.completionParagraph || ""}
                                onChange={(html) => {
                                  // Extract blanks from both formats
                                  const blankInfos = extractBlanksFromHtml(html, group.startQuestionNumber || 1);
                                  setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => {
                                    if (g.id !== group.id) return g;
                                    const existingAnswers = new Map(g.questions.map(q => [q.questionNumber, q.answer]));
                                    const baseNum = g.startQuestionNumber || 1;
                                    const newQuestions = blankInfos.map((info, idx) => {
                                      const qNum = baseNum + idx;
                                      const existingAnswer = existingAnswers.get(qNum);
                                      // Use existing answer if available, otherwise use mark text
                                      const answer = existingAnswer || info.text || "";
                                      return { id: `q-${info.blankNum}`, text: `Blank ${info.blankNum}`, answer, questionNumber: qNum };
                                    });
                                    return { ...g, completionParagraph: html, questions: newQuestions, endQuestionNumber: newQuestions.length > 0 ? newQuestions[newQuestions.length - 1].questionNumber : g.startQuestionNumber };
                                  }) } : p));
                                }}
                                onBlankCreated={(blankNumber, selectedText) => {
                                  // Auto-populate the answer for the newly created blank
                                  setTimeout(() => {
                                    setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => {
                                      if (g.id !== group.id) return g;
                                      const blankInfos = extractBlanksFromHtml(g.completionParagraph || "", g.startQuestionNumber || 1);
                                      const blankIdx = blankInfos.findIndex(b => b.blankNum === blankNumber);
                                      if (blankIdx === -1) return g;
                                      return { ...g, questions: g.questions.map((q, idx) => idx === blankIdx ? { ...q, answer: q.answer || selectedText } : q) };
                                    }) } : p));
                                  }, 100);
                                }}
                                placeholder="Nhập nội dung, bôi đen chữ rồi bấm Blank để tạo ô trống"
                                minHeight="120px"
                              />
                              <BlankAnswerKeySync
                                scopeId={`group-${group.id}`}
                                startQuestionNumber={group.startQuestionNumber || 1}
                                onBlankFocus={(num) => {
                                  // Scope to current group container so we don't jump to a blank in another passage/group.
                                  const root = document.getElementById(`blank-answer-group-${group.id}-${num}`)?.closest(".rounded-lg");
                                  const el = (root || document).querySelector(`[data-blank-num="${num}"]`);
                                  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("blank-shortcode-flash"); setTimeout(() => el.classList.remove("blank-shortcode-flash"), 1200); }
                                }}
                                html={group.completionParagraph || ""}
                                answers={Object.fromEntries(
                                  (() => {
                                    const blankInfos = extractBlanksFromHtml(group.completionParagraph || "", group.startQuestionNumber || 1);
                                    return blankInfos.map((info, idx) => [info.blankNum, group.questions[idx]?.answer || info.text || ""]);
                                  })()
                                )}
                                onAnswersChange={(newAnswers) => {
                                  const blankInfos = extractBlanksFromHtml(group.completionParagraph || "", group.startQuestionNumber || 1);
                                  setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((q, idx) => ({ ...q, answer: newAnswers[blankInfos[idx]?.blankNum] ?? q.answer })) } : g) } : p));
                                }}
                              />
                            </div>
                          )}

                          {!["sentence_completion", "summary_completion", "form_completion", "note_completion", "table_completion"].includes(group.type) && (
                            <>
                              {group.questions.map((q, qi) => (
                                <div id={`question-row-${q.id}`} key={q.id} className="flex gap-3 items-start pl-4 group/q rounded-md transition-colors" onDragOver={(e) => handleQuestionDragOver(e, part.id, group.id, qi)} onDragEnd={handleQuestionDragEnd}>
                                  <div draggable onDragStart={(e) => handleQuestionDragStart(e, part.id, group.id, qi)} className="cursor-grab active:cursor-grabbing mt-2.5 text-muted-foreground hover:text-foreground">
                                    <GripVertical className="h-3 w-3" />
                                  </div>
                                  <span className="text-xs font-bold text-muted-foreground mt-2.5 w-8">Q{q.questionNumber}.</span>
                                  <div className="flex gap-1 mt-2 opacity-0 group-hover/q:opacity-100 transition-opacity">
                                    <button onClick={() => duplicateQuestion(part.id, group.id, qi)} className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Nhân bản">
                                      <Copy className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => {
                                      setPartsWithHistory(prev => renumberQuestions(prev.map(p => p.id !== part.id ? p : { ...p, questionGroups: p.questionGroups.map(g => g.id !== group.id ? g : { ...g, questions: g.questions.filter((_, i) => i !== qi) }) })));
                                    }} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Xóa">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                   <div className="flex-1 space-y-2">
                                    {(() => {
                                      const effectiveScoringMode = (part.skill === "WRITING" || part.skill === "SPEAKING")
                                        ? (part.scoringMode || "ielts_band")
                                        : (scoringModes[part.skill] || "ielts_band");
                                      const isCustomScoring = effectiveScoringMode === "custom";
                                      const isWritingOrSpeaking = part.skill === "WRITING" || part.skill === "SPEAKING";
                                      const isSpeaking = part.skill === "SPEAKING";
                                      const isWriting = part.skill === "WRITING";
                                      const isCueCard = group.type === "part2";
                                      return (
                                        <>
                                          <div className="flex gap-2 items-start">
                                            <div className="flex-1">
                                              <Textarea value={q.text} onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, text: e.target.value } : qq) } : g) } : p))} placeholder={isWriting ? "Đề bài Writing (prompt / task description)..." : isSpeaking ? (isCueCard ? "Cue Card topic (ví dụ: Describe a place you have visited)" : "Question / topic") : "Question text (hỗ trợ nhiều dòng)"} className="rounded-lg text-sm min-h-[56px] resize-y" rows={isWriting ? 4 : isCueCard ? 3 : 2} />
                                            </div>
                                            {isCustomScoring && (
                                              <div className="shrink-0 w-20">
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">Điểm</label>
                                                <Input
                                                  type="number"
                                                  step="0.5"
                                                  min="0"
                                                  value={q.points ?? ""}
                                                  onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, points: parseFloat(e.target.value) || undefined } : qq) } : g) } : p))}
                                                  placeholder="1"
                                                  className="rounded-lg text-xs h-8 text-center border-amber-300 bg-amber-50/50 dark:bg-amber-950/10"
                                                />
                                              </div>
                                            )}
                                          </div>

                                          {/* Cue Card bullet points for Speaking Part 2 */}
                                          {isCueCard && (
                                            <div className="border border-primary/20 rounded-lg bg-primary/5 p-3 space-y-2">
                                              <label className="text-[10px] font-semibold text-primary uppercase tracking-wider block"> Cue Card — You should say:</label>
                                              {(q.choices || ["", "", "", ""]).map((bullet, bi) => (
                                                <div key={bi} className="flex items-center gap-2">
                                                  <span className="text-xs text-muted-foreground shrink-0">•</span>
                                                  <Input
                                                    value={bullet}
                                                    onChange={(e) => {
                                                      const newBullets = [...(q.choices || ["", "", "", ""])];
                                                      newBullets[bi] = e.target.value;
                                                      setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, choices: newBullets } : qq) } : g) } : p));
                                                    }}
                                                    placeholder={`Bullet point ${bi + 1} (ví dụ: where it is)`}
                                                    className="rounded-lg text-xs flex-1"
                                                  />
                                                </div>
                                              ))}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newBullets = [...(q.choices || []), ""];
                                                  setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, choices: newBullets } : qq) } : g) } : p));
                                                }}
                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                              >
                                                <Plus className="h-3 w-3" /> Thêm bullet point
                                              </button>
                                            </div>
                                          )}

                                          {q.choices && !isCueCard && (
                                            <div className="space-y-1.5">
                                              {q.choices.map((c, ci) => {
                                                const letter = String.fromCharCode(65 + ci);
                                                const isCorrect = q.answer.toUpperCase() === letter;
                                                const canRemove = (q.choices?.length || 0) > 2;
                                                return (
                                                  <div key={ci} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors", isCorrect ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-muted-foreground/30")}>
                                                    <input type="radio" name={`correct-${q.id}`} checked={isCorrect} onChange={() => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, answer: letter } : qq) } : g) } : p))} className="accent-emerald-600 h-4 w-4 shrink-0 cursor-pointer" title="Đánh dấu là đáp án đúng" />
                                                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{letter}.</span>
                                                    <Input value={c} onChange={(e) => { const newChoices = [...(q.choices || [])]; newChoices[ci] = e.target.value; setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, choices: newChoices } : qq) } : g) } : p)); }} placeholder={`Option ${letter}`} className="rounded-lg text-xs flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-7" />
                                                    {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                                    <button
                                                      type="button"
                                                      disabled={!canRemove}
                                                      onClick={() => {
                                                        const newChoices = (q.choices || []).filter((_, idx) => idx !== ci);
                                                        // If correct answer was on a removed/shifted letter, recompute
                                                        const oldLetter = letter;
                                                        let newAnswer = q.answer;
                                                        if (q.answer.toUpperCase() === oldLetter) newAnswer = "";
                                                        setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, choices: newChoices, answer: newAnswer } : qq) } : g) } : p));
                                                      }}
                                                      className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                                                      title={canRemove ? "Xóa lựa chọn này" : "Tối thiểu 2 lựa chọn"}
                                                    >
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                              {(q.choices?.length || 0) < 8 && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newChoices = [...(q.choices || []), ""];
                                                    setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, choices: newChoices } : qq) } : g) } : p));
                                                  }}
                                                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium pt-1"
                                                >
                                                  <Plus className="h-3 w-3" /> Thêm lựa chọn ({(q.choices?.length || 0)}/8)
                                                </button>
                                              )}
                                            </div>
                                          )}
                                          {!q.choices && !isWritingOrSpeaking && (
                                            <>
                                              {/* Diagram drag_drop: select correct answer from bank */}
                                              {["diagram_labeling", "plan_map_diagram"].includes(group.type) && group.diagramMode === "drag_drop" && group.groupChoices && group.groupChoices.length > 0 ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-xs text-muted-foreground shrink-0">Đáp án đúng:</span>
                                                  {group.groupChoices.filter(gc => gc.trim()).map((gc, gci) => {
                                                    const isSelected = q.answer === gc;
                                                    return (
                                                      <button
                                                        key={gci}
                                                        type="button"
                                                        onClick={() => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, answer: gc } : qq) } : g) } : p))}
                                                        className={cn(
                                                          "px-2.5 py-1 rounded-md text-xs font-semibold transition-all border",
                                                          isSelected
                                                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ring-1 ring-emerald-300"
                                                            : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground"
                                                        )}
                                                      >
                                                        {gc}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              ) : (MATCHING_TYPES.includes(group.type) || group.type === "multiple_choice_pick2") && group.groupChoices && group.groupChoices.length > 0 ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-xs text-muted-foreground shrink-0">
                                                    {group.type === "multiple_choice_pick2" ? "Đáp án (chọn nhiều):" : "Đáp án:"}
                                                  </span>
                                                  {group.groupChoices.map((gc, gci) => {
                                                    const optLabel = group.type === "matching_headings"
                                                      ? ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"][gci] || String(gci + 1)
                                                      : String.fromCharCode(65 + gci);
                                                    const isMulti = group.type === "multiple_choice_pick2";
                                                    const selectedLetters = isMulti
                                                      ? (q.answer || "").split("|").map(s => s.trim()).filter(Boolean)
                                                      : [];
                                                    const isSelected = isMulti
                                                      ? selectedLetters.includes(optLabel)
                                                      : q.answer === optLabel;
                                                    return (
                                                      <button
                                                        key={gci}
                                                        type="button"
                                                        onClick={() => {
                                                          let nextAnswer: string;
                                                          if (isMulti) {
                                                            const next = isSelected
                                                              ? selectedLetters.filter(l => l !== optLabel)
                                                              : [...selectedLetters, optLabel].sort();
                                                            nextAnswer = next.join("|");
                                                          } else {
                                                            nextAnswer = optLabel;
                                                          }
                                                          setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, answer: nextAnswer } : qq) } : g) } : p));
                                                        }}
                                                        className={cn(
                                                          "px-2.5 py-1 rounded-md text-xs font-semibold transition-all border",
                                                          isSelected
                                                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ring-1 ring-emerald-300"
                                                            : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground"
                                                        )}
                                                        title={gc || optLabel}
                                                      >
                                                        {optLabel}
                                                      </button>
                                                    );
                                                  })}
                                                  {group.type === "multiple_choice_pick2" && q.answer && (
                                                    <span className="text-[10px] text-muted-foreground ml-1">
                                                      → lưu: <code className="bg-muted px-1 rounded">{q.answer}</code>
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <Input value={q.answer} onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, answer: e.target.value } : qq) } : g) } : p))} placeholder="Correct answer"className="rounded-lg text-xs border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10"/>
                                              )}
                                            </>
                                          )}
                                          {/* Explain & passage evidence — only for Reading/Listening */}
                                          {!isWritingOrSpeaking && (
                                            <>
                                              <Input value={q.explain ||""} onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, explain: e.target.value } : qq) } : g) } : p))} placeholder="Giải thích (tùy chọn)"className="rounded-lg text-xs text-muted-foreground"/>
                                              <Input value={q.passageEvidence ||""} onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, passageEvidence: e.target.value } : qq) } : g) } : p))} placeholder="Đoạn văn liên quan (tùy chọn — sẽ highlight khi xem lại)"className="rounded-lg text-xs text-muted-foreground"/>
                                            </>
                                          )}
                                          {/* Writing sample answer */}
                                          {(group.type === "task1" || group.type === "task2") && (
                                            <div className="relative">
                                              <Textarea value={q.answer} onChange={(e) => setPartsWithHistory((prev) => prev.map((p) => p.id === part.id ? { ...p, questionGroups: p.questionGroups.map((g) => g.id === group.id ? { ...g, questions: g.questions.map((qq) => qq.id === q.id ? { ...qq, answer: e.target.value } : qq) } : g) } : p))} placeholder="Sample answer / Model essay..." className="min-h-[200px] resize-y text-sm" rows={8} />
                                              <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground/50 pointer-events-none">{(q.answer || "").trim().split(/\s+/).filter(Boolean).length} words</span>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ))}
                              <div className="h-6 ml-4 rounded border-2 border-dashed border-transparent transition-all duration-200 hover:border-primary/40 hover:bg-primary/5" onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { handleQuestionDropOnGroup(e, part.id, group.id); handleQuestionDragEnd(); }} />
                              <button onClick={() => addQuestion(part.id, group.id)} className="flex items-center gap-1.5 text-xs text-primary hover:underline pl-4">
                                <Plus className="h-3.5 w-3.5" /> Add Question
                              </button>
                            </>
                          )}
                        </div>
                      ))}

                      <div className={`h-8 ml-4 rounded border-2 border-dashed transition-all duration-200 ${isDraggingGroup && dragOverPartId === part.id && dragGroupRef.current?.partId !== part.id ? 'border-primary bg-primary/10 h-12' : 'border-transparent'}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverPartId(part.id); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverPartId(null); }} onDrop={(e) => { setDragOverPartId(null); handleGroupDropOnPart(e, part.id); handleGroupDragEnd(); }} />

                      {(() => {
                        const qTypes = (skillTab === "READING" || skillTab === "LISTENING")
                          ? getQuestionTypes(skillTab)
                          : skillTab === "WRITING"
                            ? [{ value: "task1", label: "Task 1" }, { value: "task2", label: "Task 2 (Essay)" }]
                            : [{ value: "part1", label: "Part 1" }, { value: "part2", label: "Part 2 (Cue Card)" }, { value: "part3", label: "Part 3" }];
                        const hasRichTypes = skillTab === "READING" || skillTab === "LISTENING";
                        const searchKey = `qtype-search-${part.id}`;

                        return (
                          <div className="rounded-xl border bg-card ml-4 overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                              <Plus className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-bold text-foreground">Thêm nhóm câu hỏi</span>
                              {hasRichTypes && (
                                <div className="ml-auto relative">
                                  <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                  <input
                                    type="text"
                                    placeholder="Tìm dạng..."
                                    className="h-6 w-32 pl-6 pr-2 text-[10px] bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                    onChange={(e) => {
                                      const val = e.target.value.toLowerCase();
                                      document.querySelectorAll(`[data-qtype-group="${part.id}"]`).forEach((el) => {
                                        const label = el.getAttribute("data-label")?.toLowerCase() || "";
                                        (el as HTMLElement).style.display = label.includes(val) ? "" : "none";
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                              {qTypes.map((qt) => {
                                const meta = QUESTION_TYPE_META[qt.value];
                                if (!meta) {
                                  return (
                                    <button
                                      key={qt.value}
                                      data-qtype-group={part.id}
                                      data-label={qt.label}
                                      onClick={() => addQuestionGroup(part.id, qt.value)}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-card border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                                    >
                                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                      {qt.label}
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    key={qt.value}
                                    data-qtype-group={part.id}
                                    data-label={qt.label}
                                    onClick={() => addQuestionGroup(part.id, qt.value)}
                                    className={cn(
                                      "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left group hover:shadow-sm hover:scale-[1.01]",
                                      meta.color
                                    )}
                                  >
                                    <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                      {meta.icon}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold truncate">{qt.label}</p>
                                      <p className="text-[10px] opacity-70 truncate">{meta.desc}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {filteredParts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    <p className="text-sm font-medium">Chưa có phần nào cho {skillColors.label}</p>
                    <p className="text-xs mt-1">Nhấn "Add Part" để bắt đầu tạo câu hỏi</p>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Bottom navigation bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t p-3 flex items-center justify-between -mx-6 px-6 mt-4 z-10">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="gap-2 rounded-xl">
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentStep < 4 && (
            <Button
              onClick={() => {
                if (currentStep === 2 && !testName.trim()) {
                  toast.error("Vui lòng nhập tên");
                  return;
                }
                if (currentStep === 3) {
                  if (!program) {
                    toast.error("Vui lòng chọn chương trình");
                    return;
                  }
                  if (!courseLevel) {
                    toast.error("Vui lòng chọn cấp độ / khoá");
                    return;
                  }
                }
                setCurrentStep(currentStep + 1);
              }}
              className="gap-2 rounded-xl"
            >
              Tiếp theo <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          )}
          {currentStep === 4 && (
            <>
              <Button className="gap-2 rounded-xl" onClick={() => handleSave()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
              {!isNew && status !== "published" && (
                <Button className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSave(false, "published")} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4" /> Publish
                </Button>
              )}
              {!isNew && status === "published" && (
                <Button variant="outline" className="gap-2 rounded-xl border-destructive/40 text-destructive" onClick={() => handleSave(false, "draft")} disabled={saving}>
                  <EyeOff className="h-4 w-4" /> Unpublish
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onSaveAndExit={handleSaveAndExit}
        onDiscard={handleDiscard}
        saving={saving}
      />
    </div>
  );
}

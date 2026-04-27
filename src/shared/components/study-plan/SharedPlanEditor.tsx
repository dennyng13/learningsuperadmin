import { useState } from "react";
import { getLevelColorConfig } from "@shared/utils/levelColors";
import { useStudyPlanEntries, useStudyPlanMutations, type StudyPlan } from "@shared/hooks/useStudyPlan";
import { useAuth } from "@shared/hooks/useAuth";
import { useTeacherAccessScope } from "@shared/hooks/useTeacherAccessScope";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@shared/components/ui/dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@shared/components/ui/breadcrumb";
import { toast } from "sonner";
import {
  Plus, Pencil, Upload, X, ArrowLeft, ArrowRight, BookOpen, GraduationCap,
  Users, Search, Library, ChevronDown, ChevronUp, Copy, Sparkles, Layers,
  ClipboardList, School, UserCheck, FileText as FileTextIcon, type LucideIcon,
  FilePlus2, Calendar, RefreshCw, Ban, Shield, User as UserIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { Calendar as CalendarWidget } from "@shared/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@shared/lib/utils";
import UnsavedChangesDialog from "@admin/features/tests/components/UnsavedChangesDialog";
import { SessionCard, SESSION_TYPES } from "./SessionCard";

const ALL_SKILLS = ["Listen", "Read", "Write", "Speak", "Vocab", "Grammar", "Diagnosis", "Review", "Others"];
const SESSION_SKILLS = ["L", "R", "W", "S"];
const PROGRAMS = [
  { value: "ielts", label: "IELTS" },
  { value: "wre", label: "WRE" },
  { value: "customized", label: "Customized" },
];
const SKILL_LABELS: Record<string, string> = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dayOfWeek(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

interface SharedPlanEditorProps {
  plan: Partial<StudyPlan> | null;
  onClose: () => void;
  teacherMode?: boolean;
}

// ─── Step config ───────────────────────────────────────
const STEPS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "init", label: "Khởi tạo", icon: FilePlus2 },
  { key: "program", label: "Chương trình", icon: ClipboardList },
  { key: "level", label: "Level", icon: GraduationCap },
  { key: "class", label: "Lớp", icon: School },
  { key: "student", label: "Học viên", icon: UserCheck },
  { key: "detail", label: "Chi tiết", icon: FileTextIcon },
];

export function SharedPlanEditor({ plan, onClose, teacherMode = false }: SharedPlanEditorProps) {
  const isNew = !plan?.id;
  const isEditing = !!plan?.id;
  const { user } = useAuth();
  const { data: scope } = useTeacherAccessScope();
  const { upsertPlan, bulkUpsertEntries } = useStudyPlanMutations();

  const [createMode, setCreateMode] = useState<"new" | "copy">("new");
  const [copySourceId, setCopySourceId] = useState<string | null>(null);
  const [copySearch, setCopySearch] = useState("");

  const [step, setStep] = useState(isEditing ? 6 : 1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [program, setProgram] = useState((plan?.program || "").toLowerCase());
  const [selectedLevel, setSelectedLevel] = useState<string>(plan?.assigned_level || "");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(plan?.class_ids || []);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    plan?.student_ids?.length ? plan.student_ids : (plan?.teachngo_student_id ? [plan.teachngo_student_id] : [])
  );

  const [form, setForm] = useState({
    teachngo_student_id: plan?.teachngo_student_id || "",
    test_date: plan?.test_date || "",
    progress: plan?.progress || 0,
    status: plan?.status || "On track",
    current_score: plan?.current_score || { overall: 0, listening: 0, reading: 0, writing: 0, speaking: 0 },
    target_score: plan?.target_score || { overall: 0, listening: 0, reading: 0, writing: 0, speaking: 0 },
  });

  const [structuredForm, setStructuredForm] = useState({
    plan_name: plan?.plan_name || "",
    total_sessions: plan?.total_sessions || 10,
    session_duration: plan?.session_duration || 60,
    skills: plan?.skills || [],
    materials_links: plan?.materials_links || [],
    exercise_ids: plan?.exercise_ids || [],
    flashcard_set_ids: plan?.flashcard_set_ids || [],
    teacher_notes: plan?.teacher_notes || "",
  });

  const [exerciseSearch, setExerciseSearch] = useState("");
  const [flashcardSearch, setFlashcardSearch] = useState("");
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [showAllFlashcards, setShowAllFlashcards] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [entryForm, setEntryForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [materialsText, setMaterialsText] = useState(
    (plan?.materials_links || []).map((l: any) => `${l.label}|${l.url}`).join("\n")
  );
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  // ─── Schedule state ──────────────────────────────────
  const [scheduleType, setScheduleType] = useState<"weekly" | "custom" | "from_class">(
    (plan?.schedule_pattern?.type as "weekly" | "custom" | "from_class") || "weekly"
  );
  const [weeklyDays, setWeeklyDays] = useState<string[]>(
    plan?.schedule_pattern?.days || ["mon", "wed", "fri"]
  );
  const [startDate, setStartDate] = useState<string>(
    plan?.start_date || new Date().toISOString().split("T")[0]
  );
  const [excludedDates, setExcludedDates] = useState<string[]>(
    Array.isArray(plan?.excluded_dates) ? plan.excluded_dates : []
  );
  const [recalcConfirmOpen, setRecalcConfirmOpen] = useState(false);
  const [recalcPreview, setRecalcPreview] = useState<{ original: string; updated: string; homework: string }[] | null>(null);
  const [quickGenOpen, setQuickGenOpen] = useState(false);
  const [quickGenFrom, setQuickGenFrom] = useState("");
  const [quickGenTo, setQuickGenTo] = useState("");
  const [quickGenInterval, setQuickGenInterval] = useState(1);

  const isCustomized = program === "customized";
  const isStructured = program === "wre" || program === "ielts";

  // ─── Queries ─────────────────────────────────────────
  // Lọc levels thuộc program ACTIVE (ẩn level của program đã ngưng).
  const { levels: courseLevels = [] } = useCourseLevels();

  const { data: classes } = useQuery({
    queryKey: ["classes-for-plan", program, selectedLevel, teacherMode, scope?.teacherId, scope?.canViewAllClasses],
    enabled: !!program,
    queryFn: async () => {
      let q = (supabase as any).from("classes" as any).select("id, class_name, level, program, teacher_name, schedule").order("class_name");
      if (program) q = q.eq("program", program === "customized" ? "Customized" : program === "wre" ? "WRE" : "IELTS");
      if (selectedLevel) q = q.eq("level", selectedLevel);
      if (teacherMode && !scope?.canViewAllClasses && scope?.teacherId) q = q.eq("teacher_id", scope.teacherId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: classStudents } = useQuery({
    queryKey: ["students-for-plan", selectedClassIds],
    enabled: selectedClassIds.length > 0,
    queryFn: async () => {
      const { data: cs } = await (supabase as any)
        .from("class_students")
        .select("teachngo_student_id, class_id")
        .in("class_id", selectedClassIds);
      if (!cs || cs.length === 0) return [];
      const ids = [...new Set(cs.map(c => c.teachngo_student_id))];
      const { data: students } = await (supabase as any)
        .from("synced_students")
        .select("teachngo_id, full_name")
        .in("teachngo_id", ids)
        .order("full_name");
      return students || [];
    },
  });

  const { data: allStudents } = useQuery({
    queryKey: ["all-students-for-plan", teacherMode, scope?.teacherId, scope?.canViewAllClasses],
    queryFn: async () => {
      if (teacherMode && !scope?.canViewAllClasses && scope?.teacherId) {
        const { data: tc } = await (supabase as any).from("classes" as any).select("id").eq("teacher_id", scope.teacherId);
        if (!tc || tc.length === 0) return [];
        const { data: cs } = await (supabase as any).from("class_students" as any).select("teachngo_student_id").in("class_id", tc.map(c => c.id));
        if (!cs || cs.length === 0) return [];
        const ids = [...new Set(cs.map(c => c.teachngo_student_id))];
        const { data } = await (supabase as any).from("synced_students" as any).select("teachngo_id, full_name").in("teachngo_id", ids).order("full_name");
        return data || [];
      }
      const { data } = await (supabase as any).from("synced_students" as any).select("teachngo_id, full_name").order("full_name");
      return data || [];
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["exercises-for-plan", program, selectedLevel],
    enabled: isStructured,
    queryFn: async () => {
      let q = supabase.from("practice_exercises").select("id, title, skill, course_level, program").eq("status", "published").order("title");
      // Customized program → fetch all; otherwise filter by program
      if (program && program !== "customized") q = q.eq("program", program);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: flashcardSets } = useQuery({
    queryKey: ["flashcard-sets-for-plan", program, selectedLevel],
    enabled: isStructured,
    queryFn: async () => {
      let q = supabase.from("flashcard_sets").select("id, title, course_level, program, description").eq("status", "published").order("title");
      if (program && program !== "customized") q = q.eq("program", program);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: assessments } = useQuery({
    queryKey: ["assessments-for-plan", program, selectedLevel],
    enabled: isStructured,
    queryFn: async () => {
      let q = supabase.from("assessments").select("id, name, section_type, course_level, program").eq("status", "published").order("name");
      if (program && program !== "customized") q = q.eq("program", program);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: existingPlans } = useQuery({
    queryKey: ["existing-plans-for-copy", teacherMode, scope?.teacherId, scope?.canViewAllClasses],
    enabled: isNew,
    queryFn: async () => {
      const { data: plans } = await supabase.from("study_plans").select("id, plan_name, program, plan_type, assigned_level, teachngo_student_id, class_ids, student_ids, total_sessions, session_duration, skills, materials_links, exercise_ids, flashcard_set_ids, teacher_notes, test_date, target_score, current_score, status, progress").order("updated_at", { ascending: false });
      if (!plans || plans.length === 0) return [];

      // Enrich with student names
      const studentIds = plans.map(p => p.teachngo_student_id).filter(Boolean) as string[];
      let nameMap = new Map<string, string>();
      if (studentIds.length > 0) {
        const { data: students } = await (supabase as any).from("synced_students" as any).select("teachngo_id, full_name").in("teachngo_id", studentIds);
        nameMap = new Map((students || []).map(s => [s.teachngo_id, s.full_name]));
      }

      // Enrich with class names
      const allClassIds = plans.flatMap(p => Array.isArray(p.class_ids) ? p.class_ids as string[] : []);
      let classNameMap = new Map<string, string>();
      if (allClassIds.length > 0) {
        const { data: classes } = await (supabase as any).from("classes" as any).select("id, class_name").in("id", [...new Set(allClassIds)]);
        classNameMap = new Map((classes || []).map(c => [c.id, c.class_name]));
      }

      return plans.map(p => ({
        ...p,
        _student_name: p.teachngo_student_id ? nameMap.get(p.teachngo_student_id) || null : null,
        _class_names: (Array.isArray(p.class_ids) ? (p.class_ids as string[]) : []).map(cid => classNameMap.get(cid)).filter(Boolean),
      }));
    },
  });

  const { data: copySourceEntries } = useQuery({
    queryKey: ["copy-source-entries", copySourceId],
    enabled: !!copySourceId,
    queryFn: async () => {
      const { data } = await supabase.from("study_plan_entries").select("*").eq("plan_id", copySourceId!).order("entry_date");
      return data || [];
    },
  });

  // ─── Copy logic ──────────────────────────────────────
  const applyCopyFromPlan = (sourcePlan: any) => {
    setCopySourceId(sourcePlan.id);
    setProgram((sourcePlan.program || "").toLowerCase());
    setSelectedLevel(sourcePlan.assigned_level || "");
    setSelectedClassIds([]);
    setSelectedStudentIds([]);
    setForm(f => ({
      ...f,
      test_date: sourcePlan.test_date || "",
      target_score: sourcePlan.target_score || { overall: 0, listening: 0, reading: 0, writing: 0, speaking: 0 },
      current_score: sourcePlan.current_score || { overall: 0, listening: 0, reading: 0, writing: 0, speaking: 0 },
      status: sourcePlan.status || "On track",
      progress: 0,
    }));
    setStructuredForm(sf => ({
      ...sf,
      plan_name: (sourcePlan.plan_name || "") + " (Copy)",
      total_sessions: sourcePlan.total_sessions || 10,
      session_duration: sourcePlan.session_duration || 60,
      skills: sourcePlan.skills || [],
      materials_links: sourcePlan.materials_links || [],
      exercise_ids: sourcePlan.exercise_ids || [],
      flashcard_set_ids: sourcePlan.flashcard_set_ids || [],
      teacher_notes: sourcePlan.teacher_notes || "",
    }));
    setMaterialsText((sourcePlan.materials_links || []).map((l: any) => `${l.label}|${l.url}`).join("\n"));
    toast.success("Đã copy dữ liệu từ kế hoạch gốc");
    setStep(3);
  };

  // Apply copied entries
  const [copiedEntriesApplied, setCopiedEntriesApplied] = useState(false);
  if (copySourceEntries && copySourceId && !copiedEntriesApplied) {
    setEntries(copySourceEntries.map(e => ({
      entry_date: e.entry_date,
      day_of_week: e.day_of_week,
      skills: e.skills,
      homework: e.homework,
      class_note: e.class_note,
      class_note_files: (e as any).class_note_files || [],
      links: e.links,
      plan_status: null,
      student_note: {},
      session_type: (e as any).session_type,
      exercise_ids: (e as any).exercise_ids || [],
      flashcard_set_ids: (e as any).flashcard_set_ids || [],
    })));
    setCopiedEntriesApplied(true);
    setEntriesLoaded(true);
  }

  const { data: existingEntries } = useStudyPlanEntries(plan?.id || null);

  if (existingEntries && !entriesLoaded) {
    setEntries(existingEntries.map(e => ({
      entry_date: e.entry_date,
      day_of_week: e.day_of_week,
      skills: e.skills,
      homework: e.homework,
      class_note: e.class_note,
      class_note_files: (e as any).class_note_files || [],
      links: e.links,
      plan_status: e.plan_status,
      student_note: e.student_note,
      session_type: e.session_type,
      exercise_ids: e.exercise_ids || [],
      flashcard_set_ids: e.flashcard_set_ids || [],
    })));
    setEntriesLoaded(true);
  }

  // ─── Helpers ─────────────────────────────────────────
  const studentsToShow = selectedClassIds.length > 0 ? classStudents : allStudents;

  const toggleClass = (id: string) => setSelectedClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleStudent = (id: string) => setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSkill = (sk: string) => setStructuredForm(f => ({ ...f, skills: f.skills.includes(sk) ? f.skills.filter(x => x !== sk) : [...f.skills, sk] }));
  const toggleExercise = (id: string) => setStructuredForm(f => ({ ...f, exercise_ids: f.exercise_ids.includes(id) ? f.exercise_ids.filter(x => x !== id) : [...f.exercise_ids, id] }));
  const toggleFlashcardSet = (id: string) => setStructuredForm(f => ({ ...f, flashcard_set_ids: f.flashcard_set_ids.includes(id) ? f.flashcard_set_ids.filter(x => x !== id) : [...f.flashcard_set_ids, id] }));

  const setScore = (kind: "current_score" | "target_score", sk: string, val: string) => {
    setForm(f => ({ ...f, [kind]: { ...f[kind], [sk]: parseFloat(val) || 0 } }));
  };

  const openEntryEditor = (idx: number) => {
    if (idx >= 0) {
      setEntryForm({ ...entries[idx] });
      setEditingEntry(idx);
    } else {
      setEntryForm({ entry_date: "", skills: ["Read"], homework: "", class_note: "", class_note_files: [], links: [], plan_status: null, student_note: {}, session_type: null });
      setEditingEntry(-1);
    }
  };

  const saveEntry = () => {
    if (!entryForm) return;
    const e = { ...entryForm, day_of_week: entryForm.entry_date ? dayOfWeek(entryForm.entry_date) : "" };
    if (editingEntry === -1) {
      setEntries(prev => [...prev, e].sort((a, b) => a.entry_date.localeCompare(b.entry_date)));
    } else if (editingEntry !== null) {
      setEntries(prev => prev.map((x, i) => i === editingEntry ? e : x).sort((a, b) => a.entry_date.localeCompare(b.entry_date)));
    }
    setEditingEntry(null);
    setEntryForm(null);
  };

  const parseBulk = () => {
    const lines = bulkText.split("\n").filter(l => l.trim());
    const parsed = lines.map(line => {
      const parts = line.split("|").map(x => x.trim());
      const [date, skill, homework, classNote, linksRaw] = [...parts, "", "", "", "", ""];
      const links = (linksRaw || "").split(";").filter(Boolean).map(x => {
        const [label, ...rest] = x.split("=");
        return { label: label.trim(), url: (rest.join("=") || "#").trim() };
      });
      return {
        entry_date: date || "",
        day_of_week: date ? dayOfWeek(date) : "",
        skills: skill ? skill.split(",").map(s => s.trim()) : ["Read"],
        homework: homework || "",
        class_note: classNote || "",
        links,
        plan_status: null,
        student_note: {},
        session_type: null,
      };
    }).filter(p => p.entry_date);

    setEntries(prev => {
      const merged = [...prev];
      parsed.forEach(p => {
        const idx = merged.findIndex(x => x.entry_date === p.entry_date);
        if (idx >= 0) merged[idx] = p;
        else merged.push(p);
      });
      return merged.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    });
    setBulkText("");
    setBulkOpen(false);
    toast.success(`Đã nhập ${parsed.length} ngày`);
  };

  // ─── Schedule date generator ─────────────────────────
  const DAY_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const DAY_LABELS: Record<string, string> = { mon: "T2", tue: "T3", wed: "T4", thu: "T5", fri: "T6", sat: "T7", sun: "CN" };

  function generateScheduledDates(
    type: "weekly" | "custom" | "from_class",
    totalSessions: number,
    days: string[],
    start: string,
    excluded: string[]
  ): string[] {
    if (type === "custom") return [];
    const targetDays = days.map(d => DAY_MAP[d]).filter(d => d !== undefined);
    if (targetDays.length === 0 || !start) return [];
    const dates: string[] = [];
    const excludeSet = new Set(excluded);
    const current = new Date(start + "T00:00:00");
    const maxIterations = totalSessions * 10;
    let iterations = 0;
    while (dates.length < totalSessions && iterations < maxIterations) {
      const dateStr = current.toISOString().split("T")[0];
      if (targetDays.includes(current.getDay()) && !excludeSet.has(dateStr)) {
        dates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
      iterations++;
    }
    return dates;
  }

  const applyScheduleDates = (count?: number) => {
    const total = count ?? structuredForm.total_sessions;
    if (scheduleType === "custom") {
      // For custom: just ensure we have the right count of entries
      setEntries(prev => {
        if (prev.length === total) return prev;
        if (prev.length < total) {
          const newEntries = [...prev];
          for (let i = prev.length; i < total; i++) {
            newEntries.push({
              entry_date: "",
              day_of_week: "",
              skills: structuredForm.skills.length > 0 ? structuredForm.skills : ["L", "R"],
              homework: `Buổi ${i + 1}`,
              class_note: "",
              links: [],
              plan_status: null,
              student_note: {},
              session_type: "Study",
              exercise_ids: [],
              flashcard_set_ids: [],
              session_number: i + 1,
              is_makeup: false,
            });
          }
          return newEntries;
        }
        return prev.slice(0, total);
      });
      return;
    }

    const dates = generateScheduledDates(scheduleType, total, weeklyDays, startDate, excludedDates);
    setEntries(prev => {
      const result: any[] = [];
      for (let i = 0; i < total; i++) {
        const existing = prev[i];
        const dateStr = dates[i] || "";
        if (existing) {
          // Keep homework/skills/notes, update date
          result.push({
            ...existing,
            entry_date: dateStr,
            day_of_week: dateStr ? dayOfWeek(dateStr) : "",
            session_number: i + 1,
          });
        } else {
          result.push({
            entry_date: dateStr,
            day_of_week: dateStr ? dayOfWeek(dateStr) : "",
            skills: structuredForm.skills.length > 0 ? structuredForm.skills : ["L", "R"],
            homework: `Buổi ${i + 1}`,
            class_note: "",
            links: [],
            plan_status: null,
            student_note: {},
            session_type: "Study",
            exercise_ids: [],
            flashcard_set_ids: [],
            session_number: i + 1,
            is_makeup: false,
          });
        }
      }
      return result;
    });
  };

  const handleRecalcSchedule = () => {
    const hasDoneEntries = entries.some(e => e.plan_status === "done");
    if (hasDoneEntries) {
      showRecalcPreview();
    } else {
      applyScheduleDates();
    }
  };

  const buildReschedulePreview = () => {
    const doneEntries = entries.filter(e => e.plan_status === "done");
    const pendingEntries = entries.filter(e => e.plan_status !== "done");
    const usedDates = new Set(doneEntries.map(e => e.entry_date));
    const allNewDates = generateScheduledDates(
      scheduleType,
      structuredForm.total_sessions * 2, // generate extra to filter
      weeklyDays, startDate, excludedDates
    );
    const availableDates = allNewDates.filter(d => !usedDates.has(d));

    const changes: { original: string; updated: string; homework: string }[] = [];
    pendingEntries.forEach((entry, idx) => {
      const newDate = availableDates[idx] || entry.entry_date;
      if (newDate !== entry.entry_date) {
        changes.push({ original: entry.entry_date, updated: newDate, homework: entry.homework || `Buổi ${idx + 1}` });
      }
    });
    return changes;
  };

  const showRecalcPreview = () => {
    const preview = buildReschedulePreview();
    setRecalcPreview(preview);
    setRecalcConfirmOpen(true);
  };

  const confirmRecalc = () => {
    const doneEntries = entries.filter(e => e.plan_status === "done");
    const pendingEntries = entries.filter(e => e.plan_status !== "done");
    const usedDates = new Set(doneEntries.map(e => e.entry_date));
    const allNewDates = generateScheduledDates(
      scheduleType,
      structuredForm.total_sessions * 2,
      weeklyDays, startDate, excludedDates
    );
    const availableDates = allNewDates.filter(d => !usedDates.has(d));

    const rescheduled = pendingEntries.map((entry, idx) => ({
      ...entry,
      entry_date: availableDates[idx] || entry.entry_date,
      day_of_week: availableDates[idx] ? dayOfWeek(availableDates[idx]) : entry.day_of_week,
    }));

    const result = [...doneEntries, ...rescheduled]
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      .map((e, i) => ({ ...e, session_number: i + 1 }));

    setEntries(result);
    setRecalcConfirmOpen(false);
    setRecalcPreview(null);
    toast.success(`Đã tính lại lịch (${doneEntries.length} buổi done giữ nguyên)`);
  };

  const handleQuickGen = () => {
    if (!quickGenFrom || !quickGenTo) return;
    const dates: string[] = [];
    const current = new Date(quickGenFrom + "T00:00:00");
    const end = new Date(quickGenTo + "T00:00:00");
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + quickGenInterval);
    }
    setEntries(dates.map((d, i) => ({
      entry_date: d,
      day_of_week: dayOfWeek(d),
      skills: structuredForm.skills.length > 0 ? structuredForm.skills : ["L", "R"],
      homework: `Buổi ${i + 1}`,
      class_note: "",
      links: [],
      plan_status: null,
      student_note: {},
      session_type: "Study",
      exercise_ids: [],
      flashcard_set_ids: [],
      session_number: i + 1,
      is_makeup: false,
    })));
    setStructuredForm(f => ({ ...f, total_sessions: dates.length }));
    setQuickGenOpen(false);
    toast.success(`Đã tạo ${dates.length} buổi`);
  };

  const updateSessionEntry = (idx: number, field: string, value: any) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  // ─── Save ────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // ─── Scope enforcement ────────────────────────────
      // Teachers (non-admin) must operate within their own classes/students.
      if (teacherMode && !scope?.canViewAllClasses) {
        if (!scope?.teacherId) {
          toast.error("Không xác định được phạm vi giáo viên. Vui lòng tải lại trang.");
          setSaving(false);
          return;
        }
        // Validate class_ids belong to this teacher
        const classIdsToCheck = isCustomized ? selectedClassIds : selectedClassIds;
        if (classIdsToCheck.length > 0) {
          const { data: ownClasses } = await (supabase as any)
            .from("classes")
            .select("id")
            .eq("teacher_id", scope.teacherId)
            .in("id", classIdsToCheck);
          const ownIds = new Set((ownClasses || []).map((c: any) => c.id));
          const foreign = classIdsToCheck.filter(id => !ownIds.has(id));
          if (foreign.length > 0) {
            toast.error("Bạn không có quyền tạo/sửa kế hoạch cho lớp ngoài phạm vi của mình.");
            setSaving(false);
            return;
          }
        }
        // Validate selected students belong to teacher's classes
        if (selectedStudentIds.length > 0) {
          const { data: tc } = await (supabase as any)
            .from("classes")
            .select("id")
            .eq("teacher_id", scope.teacherId);
          const teacherClassIds = (tc || []).map((c: any) => c.id);
          if (teacherClassIds.length > 0) {
            const { data: cs } = await (supabase as any)
              .from("class_students")
              .select("teachngo_student_id")
              .in("class_id", teacherClassIds);
            const ownStudentIds = new Set((cs || []).map((r: any) => r.teachngo_student_id));
            const foreignStudents = selectedStudentIds.filter(id => !ownStudentIds.has(id));
            if (foreignStudents.length > 0) {
              toast.error("Một số học viên không nằm trong lớp của bạn.");
              setSaving(false);
              return;
            }
          }
        }
      }

      if (isCustomized) {
        const studentIds = (selectedStudentIds.length > 0
          ? selectedStudentIds
          : [form.teachngo_student_id]).filter(Boolean);
        if (studentIds.length === 0) {
          toast.error("Vui lòng chọn ít nhất 1 học viên");
          setSaving(false);
          return;
        }

        // Auto-link classes: union (manually selected) ∪ (classes the chosen students are in)
        let mergedClassIds = [...selectedClassIds];
        const { data: enrollments } = await (supabase as any)
          .from("class_students")
          .select("class_id")
          .in("teachngo_student_id", studentIds);
        if (enrollments?.length) {
          const auto = enrollments.map((e: any) => e.class_id);
          mergedClassIds = [...new Set([...mergedClassIds, ...auto])];
        }

        // 1 plan / many students (no duplicate records)
        const planId = await upsertPlan.mutateAsync({
          ...plan,
          ...form,
          teachngo_student_id: studentIds.length === 1 ? studentIds[0] : null,
          program,
          plan_type: "customized",
          class_ids: mergedClassIds,
          assigned_level: selectedLevel || null,
          student_ids: studentIds,
          created_by: user?.id,
        } as any);
        await bulkUpsertEntries.mutateAsync({ planId, entries: entries as any });
      } else {
        const links = materialsText.split("\n").filter(Boolean).map(line => {
          const [label, ...rest] = line.split("|");
          return { label: label.trim(), url: (rest.join("|") || "#").trim() };
        });
        const planDates = entries.map(e => e.entry_date).filter(Boolean).sort();
        const planId = await upsertPlan.mutateAsync({
          ...plan,
          program,
          plan_type: "structured",
          plan_name: structuredForm.plan_name,
          class_ids: selectedClassIds,
          assigned_level: selectedLevel || null,
          student_ids: selectedStudentIds,
          teachngo_student_id: selectedStudentIds.length === 1 ? selectedStudentIds[0] : null,
          total_sessions: structuredForm.total_sessions,
          session_duration: structuredForm.session_duration,
          skills: structuredForm.skills as any,
          materials_links: links as any,
          exercise_ids: structuredForm.exercise_ids as any,
          flashcard_set_ids: structuredForm.flashcard_set_ids as any,
          teacher_notes: structuredForm.teacher_notes,
          created_by: user?.id,
          schedule_pattern: scheduleType === "custom" ? { type: "custom" } : {
            type: scheduleType,
            days: weeklyDays,
            start_date: startDate,
          },
          excluded_dates: excludedDates,
          start_date: startDate || null,
          end_date: planDates[planDates.length - 1] || null,
        } as any);
        if (entries.length > 0) {
          const sessionEntries = entries.map((e, i) => ({
            ...e,
            day_of_week: e.entry_date ? dayOfWeek(e.entry_date) : "",
            session_number: e.session_number ?? i + 1,
            is_makeup: e.is_makeup ?? false,
          }));
          await bulkUpsertEntries.mutateAsync({ planId, entries: sessionEntries as any });
        }
      }
      toast.success(isNew ? "Đã tạo kế hoạch" : "Đã cập nhật kế hoạch");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu kế hoạch");
    } finally {
      setSaving(false);
    }
  };

  // ========== STEP RENDERERS ==========

  const renderStepInit = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Chọn cách tạo kế hoạch học tập</p>
      <div className="grid grid-cols-2 gap-3">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${createMode === "new" ? "ring-2 ring-primary shadow-md" : ""}`}
          onClick={() => setCreateMode("new")}
        >
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-primary/10 text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm">Tạo mới</p>
            <p className="text-[10px] text-muted-foreground mt-1">Bắt đầu từ đầu</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${createMode === "copy" ? "ring-2 ring-primary shadow-md" : ""}`}
          onClick={() => setCreateMode("copy")}
        >
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-accent/10 text-accent">
              <Copy className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm">Copy từ có sẵn</p>
            <p className="text-[10px] text-muted-foreground mt-1">Sao chép & gán lại</p>
          </CardContent>
        </Card>
      </div>

      {createMode === "copy" && (
        <>
          <p className="text-sm text-muted-foreground">Chọn kế hoạch để sao chép (assignment sẽ được chọn lại)</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kế hoạch..." value={copySearch} onChange={e => setCopySearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="max-h-[280px] overflow-y-auto space-y-1.5">
            {(() => {
              const filteredCopyPlans = (existingPlans || []).filter((p: any) => {
                if (!copySearch.trim()) return true;
                const q = copySearch.toLowerCase();
                return (p.plan_name || "").toLowerCase().includes(q) || (p.program || "").toLowerCase().includes(q);
              });
              if (filteredCopyPlans.length === 0) return (
                <p className="text-center text-muted-foreground text-sm py-6">Không tìm thấy kế hoạch nào</p>
              );
              return filteredCopyPlans.map((p: any) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    copySourceId === p.id ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => applyCopyFromPlan(p)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    (p.program || "").toLowerCase() === "ielts" ? "bg-blue-500" :
                    (p.program || "").toLowerCase() === "wre" ? "bg-purple-500" :
                    "bg-amber-500"
                  }`}>
                    {(p.program || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {p.plan_name || (p._student_name ? p._student_name : `Kế hoạch ${(p.program || "").toUpperCase() || "Customized"}${p.assigned_level ? ` – ${p.assigned_level}` : ""}`)}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[9px]">{(p.program || "customized").toUpperCase()}</Badge>
                      {p.plan_type === "structured" && <Badge variant="secondary" className="text-[9px]">{p.total_sessions} buổi</Badge>}
                      {p.assigned_level && <Badge variant="outline" className="text-[9px]">{p.assigned_level}</Badge>}
                      {p._student_name && <Badge variant="secondary" className="text-[9px]">{p._student_name}</Badge>}
                      {(p._class_names || []).map((cn: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[9px]">{cn}</Badge>
                      ))}
                    </div>
                  </div>
                  <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ));
            })()}
          </div>
        </>
      )}
    </div>
  );

  const renderStepProgram = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Chọn chương trình cho kế hoạch học tập</p>
      <div className="grid grid-cols-3 gap-3">
        {PROGRAMS.map(p => (
          <Card
            key={p.value}
            className={`cursor-pointer transition-all hover:shadow-md ${program === p.value ? "ring-2 ring-primary shadow-md" : ""}`}
            onClick={() => setProgram(p.value)}
          >
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                p.value === "ielts" ? "bg-blue-100 text-blue-700" :
                p.value === "wre" ? "bg-purple-100 text-purple-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {p.value === "ielts" ? <GraduationCap className="w-6 h-6" /> :
                 p.value === "wre" ? <BookOpen className="w-6 h-6" /> :
                 <Users className="w-6 h-6" />}
              </div>
              <p className="font-bold text-sm">{p.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {p.value === "customized" ? "Kế hoạch 1-1 theo ngày" : "Kế hoạch theo buổi"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStepLevel = () => {
    const levels = courseLevels || [];
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Chọn level (không bắt buộc — bỏ qua để xem tất cả lớp)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${!selectedLevel ? "ring-2 ring-primary shadow-md" : ""}`}
            onClick={() => setSelectedLevel("")}
          >
            <CardContent className="p-3 text-center">
              <p className="font-medium text-sm">Tất cả level</p>
            </CardContent>
          </Card>
          {levels.map((l: any) => {
            const colorCfg = getLevelColorConfig(l.color_key || l.name);
            const isSelected = selectedLevel === l.name;
            return (
              <Card
                key={l.id}
                className={`cursor-pointer transition-all hover:shadow-md border ${isSelected ? "ring-2 ring-primary shadow-md" : ""} ${colorCfg ? `${colorCfg.bg} ${colorCfg.border}` : ""}`}
                onClick={() => setSelectedLevel(l.name)}
              >
                <CardContent className="p-3 text-center flex items-center justify-center gap-2">
                  {colorCfg && <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorCfg.swatch }} />}
                  <p className={`font-medium text-sm ${colorCfg ? colorCfg.text : ""}`}>{l.name}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStepClasses = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Chọn lớp (không bắt buộc, cho phép chọn nhiều)</p>
      <div className="max-h-[350px] overflow-y-auto space-y-1.5">
        {(classes || []).length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-6">
            Không tìm thấy lớp nào cho chương trình {PROGRAMS.find(p => p.value === program)?.label}
          </p>
        )}
        {(classes || []).map((c: any) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              selectedClassIds.includes(c.id) ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
            }`}
            onClick={() => toggleClass(c.id)}
          >
            <Checkbox checked={selectedClassIds.includes(c.id)} />
            <div className="flex-1">
              <p className="font-medium text-sm">{c.class_name}</p>
              <div className="flex gap-2 mt-0.5">
                {c.level && <Badge variant="outline" className="text-[10px]">{c.level}</Badge>}
                {c.teacher_name && <span className="text-[10px] text-muted-foreground">GV: {c.teacher_name}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepStudents = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Chọn học viên (không bắt buộc, cho phép chọn nhiều)
        {selectedClassIds.length > 0 && ` — từ ${selectedClassIds.length} lớp đã chọn`}
      </p>
      <div className="max-h-[350px] overflow-y-auto space-y-1.5">
        {(studentsToShow || []).length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-6">Không tìm thấy học viên</p>
        )}
        {(studentsToShow || []).map((s: any) => (
          <div
            key={s.teachngo_id}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              selectedStudentIds.includes(s.teachngo_id) ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
            }`}
            onClick={() => toggleStudent(s.teachngo_id)}
          >
            <Checkbox checked={selectedStudentIds.includes(s.teachngo_id)} />
            <p className="font-medium text-sm">{s.full_name}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepCustomized = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {isNew && selectedStudentIds.length > 1 ? (
          <div className="col-span-2">
            <Label>Học viên đã chọn</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedStudentIds.map(sid => {
                const s = (studentsToShow || []).find((x: any) => x.teachngo_id === sid);
                return <Badge key={sid} variant="secondary" className="text-xs">{(s as any)?.full_name || sid}</Badge>;
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Mỗi học viên sẽ được tạo 1 kế hoạch riêng</p>
          </div>
        ) : (
          <div>
            <Label>Học viên</Label>
            <Select value={selectedStudentIds[0] || form.teachngo_student_id} onValueChange={v => {
              setSelectedStudentIds([v]);
              setForm(f => ({ ...f, teachngo_student_id: v }));
            }} disabled={isEditing}>
              <SelectTrigger><SelectValue placeholder="Chọn học viên" /></SelectTrigger>
              <SelectContent>
                {(studentsToShow || allStudents || []).map((s: any) => (
                  <SelectItem key={s.teachngo_id} value={s.teachngo_id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Ngày thi</Label>
          <Input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))} />
        </div>
        <div>
          <Label>Tiến độ (%)</Label>
          <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))} />
        </div>
        <div>
          <Label>Trạng thái</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="On track">Đúng tiến độ</SelectItem>
              <SelectItem value="Ahead">Vượt tiến độ</SelectItem>
              <SelectItem value="Behind">Cần chú ý</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(["current_score", "target_score"] as const).map(kind => (
          <Card key={kind}>
            <CardContent className="p-3">
              <p className="text-xs font-bold mb-2">{kind === "current_score" ? "Band hiện tại" : "Band mục tiêu"}</p>
              {["overall", "listening", "reading", "writing", "speaking"].map(sk => (
                <div key={sk} className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs w-20 capitalize">{SKILL_LABELS[sk] || sk}</Label>
                  <Input type="number" step={0.5} min={0} max={9} className="w-20 h-7 text-center text-sm"
                    value={form[kind][sk] || 0} onChange={e => setScore(kind, sk, e.target.value)} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Entries */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Kế hoạch học tập ({entries.length} ngày)</Label>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => openEntryEditor(-1)}>
              <Plus className="w-3 h-3 mr-1" /> Thêm ngày
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(!bulkOpen)}>
              <Upload className="w-3 h-3 mr-1" /> Nhập nhiều
            </Button>
          </div>
        </div>

        {bulkOpen && (
          <Card className="mb-3">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Mỗi dòng = 1 ngày. Định dạng: <code className="bg-muted px-1 rounded text-[10px]">YYYY-MM-DD | Skill | Bài tập | Ghi chú | Link=URL</code>
              </p>
              <Textarea className="font-mono text-xs min-h-[120px]" value={bulkText} onChange={e => setBulkText(e.target.value)}
                placeholder={"2025-04-14 | Read | Làm Reading Passage 1\n2025-04-15 | Listen | Listening Section 1+2"} />
              <div className="flex gap-2">
                <Button size="sm" onClick={parseBulk}>Nhập ({bulkText.split("\n").filter(l => l.trim()).length} ngày)</Button>
                <Button size="sm" variant="ghost" onClick={() => { setBulkOpen(false); setBulkText(""); }}>Huỷ</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {entryForm && (
          <Card className="mb-3 border-primary/30">
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ngày</Label>
                  <Input type="date" value={entryForm.entry_date} onChange={e => setEntryForm((f: any) => ({ ...f, entry_date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Kỹ năng</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ALL_SKILLS.map(sk => {
                      const active = (entryForm.skills || []).includes(sk);
                      return (
                        <Badge key={sk} variant={active ? "default" : "outline"} className="cursor-pointer text-[10px]"
                          onClick={() => setEntryForm((f: any) => {
                            const cur = f.skills || [];
                            const next = cur.includes(sk) ? cur.filter((x: string) => x !== sk) : [...cur, sk];
                            return { ...f, skills: next.length ? next : ["Read"] };
                          })}>
                          {sk}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs">Bài tập</Label>
                <Textarea className="text-sm min-h-[50px]" value={entryForm.homework} onChange={e => setEntryForm((f: any) => ({ ...f, homework: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Ghi chú giáo viên</Label>
                <Textarea className="text-sm min-h-[40px]" value={entryForm.class_note} onChange={e => setEntryForm((f: any) => ({ ...f, class_note: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Links (mỗi dòng: nhãn|url)</Label>
                <Textarea className="font-mono text-xs min-h-[40px]"
                  value={(entryForm.links || []).map((l: any) => `${l.label}|${l.url}`).join("\n")}
                  onChange={e => {
                    const links = e.target.value.split("\n").filter(Boolean).map(line => {
                      const [label, ...rest] = line.split("|");
                      return { label: label.trim(), url: (rest.join("|") || "#").trim() };
                    });
                    setEntryForm((f: any) => ({ ...f, links }));
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEntry}>Lưu</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingEntry(null); setEntryForm(null); }}>Huỷ</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {entries.map((p, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 text-sm">
              <span className="text-[10px] text-muted-foreground min-w-[54px]">{fmtDate(p.entry_date)}</span>
              {(Array.isArray(p.skills) ? p.skills : [p.skills]).map((sk: string) => (
                <Badge key={sk} variant="outline" className="text-[9px]">{sk}</Badge>
              ))}
              <span className="flex-1 text-xs truncate">{p.homework}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEntryEditor(i)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setEntries(prev => prev.filter((_, j) => j !== i))}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {entries.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">Chưa có ngày học nào.</p>}
        </div>
      </div>
    </div>
  );

  const renderStepStructured = () => {
    const sortByRelevance = (items: any[]) => {
      return items.sort((a, b) => {
        const aMatch = a.course_level === selectedLevel ? 0 : !a.course_level ? 1 : 2;
        const bMatch = b.course_level === selectedLevel ? 0 : !b.course_level ? 1 : 2;
        return aMatch - bMatch;
      });
    };

    const matchedExercises = (exercises || []).filter((ex: any) => {
      if (exerciseSearch && !ex.title.toLowerCase().includes(exerciseSearch.toLowerCase())) return false;
      if (!selectedLevel) return true;
      const matchLevel = ex.course_level === selectedLevel || !ex.course_level;
      return showAllExercises ? true : matchLevel;
    });

    const matchedFlashcards = (flashcardSets || []).filter((fs: any) => {
      if (flashcardSearch && !fs.title.toLowerCase().includes(flashcardSearch.toLowerCase())) return false;
      if (!selectedLevel) return true;
      const matchLevel = fs.course_level === selectedLevel || !fs.course_level;
      return showAllFlashcards ? true : matchLevel;
    });

    const sortedExercises = sortByRelevance([...matchedExercises]);
    const sortedFlashcards = sortByRelevance([...matchedFlashcards]);

    return (
      <div className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs font-medium">Tên kế hoạch</Label>
            <Input className="mt-1" value={structuredForm.plan_name} onChange={e => setStructuredForm(f => ({ ...f, plan_name: e.target.value }))}
              placeholder={`Kế hoạch ${program?.toUpperCase()} - ${new Date().toLocaleDateString("vi-VN")}`} />
          </div>
          <div>
            <Label className="text-xs font-medium">Số buổi</Label>
            <Input type="number" min={1} max={50} className="mt-1" value={structuredForm.total_sessions}
              onChange={e => {
                const n = Math.min(50, Math.max(1, parseInt(e.target.value) || 1));
                setStructuredForm(f => ({ ...f, total_sessions: n }));
                // Will regenerate when user clicks "Tính lại lịch" or on first create
              }} />
          </div>
          <div>
            <Label className="text-xs font-medium">Thời lượng/buổi (phút)</Label>
            <Input type="number" min={15} step={15} className="mt-1" value={structuredForm.session_duration}
              onChange={e => setStructuredForm(f => ({ ...f, session_duration: parseInt(e.target.value) || 60 }))} />
          </div>
        </div>

        {/* Default skills */}
        <div>
          <Label className="text-xs font-medium">Kỹ năng mặc định</Label>
          <div className="flex gap-2 mt-1.5">
            {SESSION_SKILLS.map(sk => (
              <Badge key={sk} variant={structuredForm.skills.includes(sk) ? "default" : "outline"} className="cursor-pointer px-3 py-1" onClick={() => toggleSkill(sk)}>
                {sk === "L" ? "Listening" : sk === "R" ? "Reading" : sk === "W" ? "Writing" : "Speaking"}
              </Badge>
            ))}
          </div>
        </div>

        {/* Assignment summary */}
        {(selectedLevel || selectedClassIds.length > 0 || selectedStudentIds.length > 0) && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">Gán cho</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedLevel && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <GraduationCap className="w-3 h-3" /> {selectedLevel}
                </Badge>
              )}
              {selectedClassIds.map(id => {
                const c = (classes || []).find((x: any) => x.id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                    <School className="w-3 h-3" /> {(c as any)?.class_name || id}
                  </Badge>
                );
              })}
              {selectedStudentIds.map(id => {
                const s = (studentsToShow || []).find((x: any) => x.teachngo_id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                    <UserCheck className="w-3 h-3" /> {(s as any)?.full_name || id}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Schedule Section ─── */}
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" /> Lịch học
          </Label>

          {/* Schedule type selector */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "weekly" as const, label: "Theo tuần", icon: Calendar, desc: "Chọn ngày cố định trong tuần" },
              ...(selectedClassIds.length > 0 ? [{ value: "from_class" as const, label: "Từ lịch lớp", icon: School, desc: "Lấy lịch từ TeachNGo" }] : []),
              { value: "custom" as const, label: "Tùy chỉnh", icon: Pencil, desc: "Chọn ngày thủ công" },
            ] as const).map(t => (
              <Card
                key={t.value}
                className={`cursor-pointer transition-all hover:shadow-sm ${scheduleType === t.value ? "ring-2 ring-primary shadow-sm" : ""}`}
                onClick={() => setScheduleType(t.value)}
              >
                <CardContent className="p-3 text-center">
                  <t.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="font-bold text-xs">{t.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Weekly day picker */}
          {(scheduleType === "weekly" || scheduleType === "from_class") && (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1.5 block">Ngày học trong tuần</Label>
                <div className="flex gap-1.5">
                  {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map(day => {
                    const active = weeklyDays.includes(day);
                    return (
                      <button
                        key={day}
                        className={cn(
                          "min-w-[44px] h-[44px] rounded-xl text-xs font-bold transition-all",
                          active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => {
                          setWeeklyDays(prev => {
                            const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
                            return next.length > 0 ? next : prev; // prevent empty
                          });
                        }}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Ngày bắt đầu</Label>
                <Input type="date" className="w-48 h-9 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>

              {/* Preview first 10 sessions */}
              {weeklyDays.length > 0 && startDate && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">
                    Preview ({Math.min(10, structuredForm.total_sessions)} buổi đầu)
                  </p>
                  <div className="space-y-0.5">
                    {generateScheduledDates(scheduleType, Math.min(10, structuredForm.total_sessions), weeklyDays, startDate, excludedDates)
                      .map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          Buổi {i + 1}: {DAY_LABELS[["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(d + "T00:00:00").getDay()]]}, {fmtDate(d)}
                        </p>
                      ))}
                    {structuredForm.total_sessions > 10 && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">...và {structuredForm.total_sessions - 10} buổi nữa</p>
                    )}
                  </div>
                </div>
              )}

              {/* Excluded dates */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label className="text-[10px] text-muted-foreground">Ngày nghỉ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Ban className="w-3 h-3" /> Thêm ngày nghỉ
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarWidget
                        mode="single"
                        onSelect={(date) => {
                          if (date) {
                            const ds = format(date, "yyyy-MM-dd");
                            if (!excludedDates.includes(ds)) {
                              setExcludedDates(prev => [...prev, ds].sort());
                            }
                          }
                        }}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {excludedDates.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {excludedDates.map(d => (
                      <Badge key={d} variant="outline" className="bg-destructive/10 text-destructive text-xs gap-1">
                        {fmtDate(d)}
                        <button onClick={() => setExcludedDates(prev => prev.filter(x => x !== d))}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate / Recalc button */}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRecalcSchedule}>
                <RefreshCw className="w-3.5 h-3.5" />
                {entries.length === 0 ? `Tạo ${structuredForm.total_sessions} buổi` : "Tính lại lịch"}
              </Button>
            </div>
          )}

          {/* From class */}
          {scheduleType === "from_class" && selectedClassIds.length > 0 && (() => {
            const selectedClass = (classes || []).find((c: any) => c.id === selectedClassIds[0]);
            const schedule = (selectedClass as any)?.schedule;
            if (!schedule) return (
              <p className="text-xs text-muted-foreground">Lớp không có thông tin lịch học. Vui lòng chọn ngày thủ công.</p>
            );

            // Parse schedule string like "Mon, Wed, Fri 18:00-19:30"
            const parseClassSchedule = (s: string): string[] => {
              const dayAbbrevMap: Record<string, string> = {
                mon: "mon", tue: "tue", wed: "wed", thu: "thu", fri: "fri", sat: "sat", sun: "sun",
                "t2": "mon", "t3": "tue", "t4": "wed", "t5": "thu", "t6": "fri", "t7": "sat", "cn": "sun",
              };
              const words = s.toLowerCase().replace(/[,;]/g, " ").split(/\s+/);
              return words.map(w => dayAbbrevMap[w]).filter(Boolean);
            };

            const parsedDays = parseClassSchedule(schedule);
            return (
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p className="text-xs">Lịch lớp: <span className="font-medium">{schedule}</span></p>
                {parsedDays.length > 0 ? (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                    setWeeklyDays(parsedDays);
                    toast.success("Đã áp dụng lịch lớp");
                  }}>
                    Dùng lịch này ({parsedDays.map(d => DAY_LABELS[d]).join(", ")})
                  </Button>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Không thể đọc lịch. Vui lòng chọn ngày thủ công.</p>
                )}
              </div>
            );
          })()}

          {/* Custom mode */}
          {scheduleType === "custom" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Mỗi buổi chọn ngày riêng trong danh sách bên dưới.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => applyScheduleDates()}>
                  <Plus className="w-3 h-3" /> Tạo {structuredForm.total_sessions} buổi
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setQuickGenOpen(true)}>
                  <Sparkles className="w-3 h-3" /> Tạo nhanh
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Per-session list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-primary" /> Chi tiết từng buổi ({entries.length})
            </Label>
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-1.5 pr-1">
            {entries.map((entry, idx) => (
              <SessionCard
                key={idx}
                entry={entry}
                idx={idx}
                isExpanded={expandedSession === idx}
                onToggle={() => setExpandedSession(expandedSession === idx ? null : idx)}
                onUpdate={(field, value) => updateSessionEntry(idx, field, value)}
                exercises={exercises || []}
                flashcardSets={flashcardSets || []}
                assessments={assessments || []}
                selectedLevel={selectedLevel}
              />
            ))}
            {entries.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-6">
                Chọn lịch ở trên rồi bấm "Tạo buổi" để bắt đầu
              </p>
            )}
          </div>
        </div>

        {/* Exercise bank */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Bài tập từ kho ({structuredForm.exercise_ids.length} đã chọn)
            </Label>
            {selectedLevel && (
              <button className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                onClick={() => setShowAllExercises(v => !v)}>
                {showAllExercises ? "Chỉ hiện phù hợp" : "Hiện tất cả"} {showAllExercises ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="relative mt-1 mb-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-sm" placeholder="Tìm bài tập..." value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} />
          </div>
          <div className="max-h-[150px] overflow-y-auto space-y-1">
            {sortedExercises.slice(0, 50).map((ex: any) => {
              const isMatch = !selectedLevel || ex.course_level === selectedLevel;
              const isNoLevel = !ex.course_level;
              return (
                <div key={ex.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                  structuredForm.exercise_ids.includes(ex.id) ? "bg-primary/10" : "hover:bg-muted/50"
                } ${!isMatch && !isNoLevel ? "opacity-60" : ""}`} onClick={() => toggleExercise(ex.id)}>
                  <Checkbox checked={structuredForm.exercise_ids.includes(ex.id)} />
                  <span className="flex-1 text-xs">{ex.title}</span>
                  <Badge variant="outline" className="text-[9px]">{ex.skill}</Badge>
                  {ex.course_level && <Badge variant="secondary" className="text-[8px]">{ex.course_level}</Badge>}
                </div>
              );
            })}
            {sortedExercises.length === 0 && <p className="text-center text-muted-foreground text-xs py-3">Không tìm thấy bài tập</p>}
          </div>
        </div>

        {/* Flashcard sets */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Library className="w-3.5 h-3.5 text-purple-600" /> Bộ từ vựng ({structuredForm.flashcard_set_ids.length} đã chọn)
            </Label>
            {selectedLevel && (
              <button className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                onClick={() => setShowAllFlashcards(v => !v)}>
                {showAllFlashcards ? "Chỉ hiện phù hợp" : "Hiện tất cả"} {showAllFlashcards ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="relative mt-1 mb-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-sm" placeholder="Tìm bộ từ vựng..." value={flashcardSearch} onChange={e => setFlashcardSearch(e.target.value)} />
          </div>
          <div className="max-h-[150px] overflow-y-auto space-y-1">
            {sortedFlashcards.slice(0, 50).map((fs: any) => {
              const isMatch = !selectedLevel || fs.course_level === selectedLevel;
              const isNoLevel = !fs.course_level;
              return (
                <div key={fs.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                  structuredForm.flashcard_set_ids.includes(fs.id) ? "bg-primary/10" : "hover:bg-muted/50"
                } ${!isMatch && !isNoLevel ? "opacity-60" : ""}`} onClick={() => toggleFlashcardSet(fs.id)}>
                  <Checkbox checked={structuredForm.flashcard_set_ids.includes(fs.id)} />
                  <span className="flex-1 text-xs">{fs.title}</span>
                  {fs.course_level && <Badge variant="secondary" className="text-[8px]">{fs.course_level}</Badge>}
                  {fs.program && <Badge variant="outline" className="text-[8px]">{fs.program}</Badge>}
                </div>
              );
            })}
            {sortedFlashcards.length === 0 && <p className="text-center text-muted-foreground text-xs py-3">Không tìm thấy bộ từ vựng</p>}
          </div>
        </div>

        {/* Global teacher notes */}
        <div>
          <Label className="text-xs font-medium">Ghi chú chung</Label>
          <Textarea className="text-sm min-h-[50px] mt-1" value={structuredForm.teacher_notes}
            onChange={e => setStructuredForm(f => ({ ...f, teacher_notes: e.target.value }))}
            placeholder="Ghi chú tổng quan cho toàn bộ kế hoạch..." />
        </div>
      </div>
    );
  };

  // ─── Navigation ──────────────────────────────────────
  const canNext = step === 1 ? (createMode === "copy" ? !!copySourceId : true) : step === 2 ? !!program : true;
  const totalSteps = 6;

  const hasChanges = step > 1 || program || entries.length > 0 || structuredForm.plan_name || selectedClassIds.length > 0 || selectedStudentIds.length > 0;

  const handleCloseAttempt = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog open onOpenChange={() => handleCloseAttempt()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Kế hoạch học tập</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{isEditing ? "Chỉnh sửa kế hoạch" : "Tạo kế hoạch"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <DialogTitle className="text-base">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{isEditing ? "Chỉnh sửa kế hoạch" : "Tạo kế hoạch học tập"}</span>
                {scope && (
                  scope.canViewAllClasses ? (
                    <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary font-normal">
                      <Shield className="w-3 h-3" /> Admin
                    </Badge>
                  ) : scope.teacherId ? (
                    <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                      <UserIcon className="w-3 h-3" /> Giáo viên
                    </Badge>
                  ) : null
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isEditing ? "Chọn bước để chỉnh sửa, hoặc bấm Lưu" :
                step === 1 ? "Tạo mới hoặc sao chép từ kế hoạch có sẵn" :
                step === 2 ? "Chọn loại chương trình phù hợp" :
                step === 3 ? "Chọn level nếu cần lọc lớp (không bắt buộc)" :
                step === 4 ? "Chọn lớp để gán kế hoạch (không bắt buộc)" :
                step === 5 ? "Chọn học viên cụ thể (không bắt buộc)" :
                isCustomized ? "Thiết lập kế hoạch học 1-1" : "Thiết lập kế hoạch theo buổi"}
            </DialogDescription>

            {/* Step indicator — with icons and labels */}
            <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-border/50">
              {(isEditing ? STEPS.slice(2) : STEPS).map((s, i) => {
                const stepNum = isEditing ? i + 3 : i + 1;
                const isActive = step === stepNum;
                const isPast = step > stepNum;
                const StepIcon = s.icon;
                return (
                  <button
                    key={s.key}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all text-center ${
                      isActive ? "bg-primary/10" : isPast ? "hover:bg-muted/50" : ""
                    } ${isEditing || isPast ? "cursor-pointer" : "cursor-default"}`}
                    onClick={(isEditing || isPast) ? () => setStep(stepNum) : undefined}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? "bg-primary text-primary-foreground shadow-sm" :
                      isPast ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <StepIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-[9px] leading-tight font-medium transition-colors ${
                      isActive ? "text-primary" : isPast ? "text-foreground/70" : "text-muted-foreground"
                    }`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          <div className="mt-1">
            {step === 1 && renderStepInit()}
            {step === 2 && renderStepProgram()}
            {step === 3 && renderStepLevel()}
            {step === 4 && renderStepClasses()}
            {step === 5 && renderStepStudents()}
            {step === 6 && isCustomized && renderStepCustomized()}
            {step === 6 && isStructured && renderStepStructured()}
          </div>

          <DialogFooter className="gap-2 mt-4">
            {step > (isEditing ? 3 : 1) && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Quay lại
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={handleCloseAttempt}>Huỷ</Button>
            {step < totalSteps ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}>
                Tiếp <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : isNew ? "Tạo kế hoạch" : "Lưu thay đổi"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        onSaveAndExit={async () => {
          setShowExitConfirm(false);
          await handleSave();
        }}
        onDiscard={() => {
          setShowExitConfirm(false);
          onClose();
        }}
        saving={saving}
      />

      {/* Recalculate confirm dialog */}
      <Dialog open={recalcConfirmOpen} onOpenChange={v => { setRecalcConfirmOpen(v); if (!v) setRecalcPreview(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Tính lại lịch?</DialogTitle>
            <DialogDescription className="text-xs">
              Tính lại sẽ cập nhật ngày của các buổi <span className="font-semibold">chưa hoàn thành</span>. Buổi đã done giữ nguyên ngày gốc.
            </DialogDescription>
          </DialogHeader>
          {recalcPreview && recalcPreview.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {recalcPreview.length} buổi sẽ đổi ngày
              </p>
              <div className="max-h-[200px] overflow-y-auto space-y-1 rounded-lg border bg-muted/30 p-2">
                {recalcPreview.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    <span className="text-muted-foreground line-through min-w-[70px]">{c.original ? fmtDate(c.original) : "—"}</span>
                    <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                    <span className="font-medium min-w-[70px]">{fmtDate(c.updated)}</span>
                    <span className="text-muted-foreground truncate flex-1">{c.homework}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : recalcPreview ? (
            <p className="text-xs text-muted-foreground py-2">Không có buổi nào cần đổi ngày.</p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRecalcConfirmOpen(false); setRecalcPreview(null); }}>Huỷ</Button>
            <Button size="sm" onClick={confirmRecalc} disabled={recalcPreview?.length === 0}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Xác nhận tính lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick generate dialog */}
      <Dialog open={quickGenOpen} onOpenChange={setQuickGenOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Tạo nhanh buổi học</DialogTitle>
            <DialogDescription className="text-xs">
              Tạo danh sách buổi trong khoảng ngày, mỗi N ngày 1 buổi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Từ ngày</Label>
              <Input type="date" value={quickGenFrom} onChange={e => setQuickGenFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Đến ngày</Label>
              <Input type="date" value={quickGenTo} onChange={e => setQuickGenTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Mỗi bao nhiêu ngày?</Label>
              <Input type="number" min={1} max={30} value={quickGenInterval} onChange={e => setQuickGenInterval(parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickGenOpen(false)}>Huỷ</Button>
            <Button size="sm" onClick={handleQuickGen} disabled={!quickGenFrom || !quickGenTo}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

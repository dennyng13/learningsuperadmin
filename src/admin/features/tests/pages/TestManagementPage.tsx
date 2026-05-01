import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  Plus, Search, MoreVertical, FileText, Trash2, Eye, Pencil, Copy, Loader2, BookOpen, Cloud, ChevronDown, Tags, X, Layers, Upload, GraduationCap, Library, ClipboardList, Sparkles, Headphones, PenLine, Mic,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { useAssessments, useDeleteAssessment, useDuplicateAssessment } from "@shared/hooks/useAssessments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { toast } from "sonner";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getLevelColorConfig } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";
import { formatDateDDMMYYYY } from "@shared/utils/dateFormat";
import ResourceTagManager from "@admin/features/settings/components/ResourceTagManager";
import QuestionTypeBadge from "@shared/components/misc/QuestionTypeBadge";
import { ALL_TYPE_LABELS_EN as ALL_QUESTION_TYPE_LABELS } from "@shared/utils/questionTypes";
import { ResourceFilterBar } from "@shared/components/resources/ResourceFilterBar";
import { useResourceList } from "@shared/hooks/useResourceList";
import { BulkCourseAssignDialog } from "@shared/components/resources/BulkCourseAssignDialog";
import { useBulkSelection } from "@shared/hooks/useBulkSelection";
import { Checkbox } from "@shared/components/ui/checkbox";

const statusLabels: Record<string, { label: string; className: string; dot: string }> = {
  published: {
    label: "Đã xuất bản",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  draft: {
    label: "Nháp",
    className: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    dot: "bg-amber-500",
  },
  archived: {
    label: "Đã lưu trữ",
    className: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
    dot: "bg-slate-400",
  },
};

const sectionTypeLabels: Record<string, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string; active: string; gradient: string; icon: any }> = {
  READING:   { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     active: "bg-sky-500 text-white border-sky-500",        gradient: "from-sky-500 to-blue-600",       icon: BookOpen },
  LISTENING: { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  active: "bg-violet-500 text-white border-violet-500",  gradient: "from-violet-500 to-purple-600",  icon: Headphones },
  WRITING:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   active: "bg-amber-500 text-white border-amber-500",    gradient: "from-amber-500 to-orange-500",   icon: PenLine },
  SPEAKING:  { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    active: "bg-rose-500 text-white border-rose-500",      gradient: "from-rose-500 to-pink-600",      icon: Mic },
};

export default function TestManagementPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [levelFilters, setLevelFilters] = useState<Set<string>>(new Set());
  const [sectionFilters, setSectionFilters] = useState<Set<string>>(new Set());
  const [programFilters, setProgramFilters] = useState<Set<string>>(new Set());
  const [courseFilters, setCourseFilters] = useState<Set<string>>(new Set());
  const [levelExpanded, setLevelExpanded] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const [programExpanded, setProgramExpanded] = useState(false);
  const [courseExpanded, setCourseExpanded] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [syncedAssessmentIds, setSyncedAssessmentIds] = useState<Set<string>>(new Set());
  const [assessmentQuestionTypes, setAssessmentQuestionTypes] = useState<Record<string, string[]>>({});
  const { levels: courseLevels } = useCourseLevels();

  const { data: assessments, isLoading } = useAssessments();
  const deleteMutation = useDeleteAssessment();
  const duplicateMutation = useDuplicateAssessment();
  const { user } = useAuth();

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  useEffect(() => {
    const fetchSyncStatus = async () => {
      const { data } = await supabase
        .from("workdrive_sync")
        .select("entity_id")
        .eq("entity_type", "assessment_part");
      if (!data || data.length === 0) return;
      const partIds = data.map(d => d.entity_id);
      const { data: parts } = await supabase
        .from("parts")
        .select("assessment_id")
        .in("id", partIds);
      if (parts) {
        setSyncedAssessmentIds(new Set(parts.map(p => p.assessment_id)));
      }
    };
    fetchSyncStatus();
  }, [assessments]);

  useEffect(() => {
    const fetchQuestionTypes = async () => {
      if (!assessments || assessments.length === 0) return;
      const ids = assessments.map(a => a.id);
      const { data: parts } = await supabase
        .from("parts")
        .select("id, assessment_id")
        .in("assessment_id", ids);
      if (!parts || parts.length === 0) return;
      const partIds = parts.map(p => p.id);
      const { data: qgs } = await supabase
        .from("question_groups")
        .select("part_id, question_type")
        .in("part_id", partIds);
      if (!qgs) return;
      const partToAssessment: Record<string, string> = {};
      parts.forEach(p => { partToAssessment[p.id] = p.assessment_id; });
      const result: Record<string, Set<string>> = {};
      qgs.forEach(qg => {
        const aId = partToAssessment[qg.part_id];
        if (!aId) return;
        if (!result[aId]) result[aId] = new Set();
        result[aId].add(qg.question_type);
      });
      const final: Record<string, string[]> = {};
      Object.entries(result).forEach(([k, v]) => { final[k] = Array.from(v); });
      setAssessmentQuestionTypes(final);
    };
    fetchQuestionTypes();
  }, [assessments]);

  const createFlashcardForTest = async (testId: string, testName: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert({
        title: `Flashcard — ${testName}`,
        linked_assessment_id: testId,
        created_by: user.id,
      } as any)
      .select()
      .single();
    if (error) { toast.error("Lỗi tạo flashcard"); return; }
    toast.success("Đã tạo bộ flashcard");
    navigate(`/flashcards?edit=${(data as any).id}`);
  };

  const usedLevels = [...new Set((assessments || []).map(t => (t as any).course_level).filter(Boolean))];
  const usedSections = [...new Set((assessments || []).map(t => t.section_type).filter(Boolean))];
  const usedPrograms = [...new Set((assessments || []).map(t => (t as any).program).filter(Boolean))];

  const PROGRAM_LABELS: Record<string, string> = { ielts: "IELTS", wre: "WRE", customized: "Customized", other: "Khác" };

  const hasFilters = statusFilters.size > 0 || levelFilters.size > 0 || sectionFilters.size > 0 || programFilters.size > 0 || courseFilters.size > 0 || search.trim().length > 0;
  const clearFilters = () => { setStatusFilters(new Set()); setLevelFilters(new Set()); setSectionFilters(new Set()); setProgramFilters(new Set()); setCourseFilters(new Set()); setSearch(""); setShowSearch(false); };

  // Stage 1: Program + Course (pivot)
  const {
    filtered: programCourseFiltered,
    matched: matchedToCourse,
    untagged: untaggedItems,
  } = useResourceList("assessment", (assessments || []) as any, {
    programIds: programFilters,
    courseIds: courseFilters,
    includeUntagged: true,
  });

  const filtered = (programCourseFiltered as any[]).filter((t) => {
    // Content type filter
    if (contentTypeFilter !== "all" && (t as any).content_type !== contentTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      if (!t.name.toLowerCase().includes(q) && !(t.book_name || "").toLowerCase().includes(q)) return false;
    }
    if (statusFilters.size > 0 && !statusFilters.has(t.status)) return false;
    if (levelFilters.size > 0 && (!(t as any).course_level || !levelFilters.has((t as any).course_level))) return false;
    if (sectionFilters.size > 0 && !sectionFilters.has(t.section_type)) return false;
    return true;
  });

  const contentTypeLabel = contentTypeFilter === "exercise" ? "bài tập" : contentTypeFilter === "test" ? "đề thi" : "đề";
  const testCount = (assessments || []).filter(a => (a as any).content_type !== "exercise").length;
  const exerciseCount = (assessments || []).filter(a => (a as any).content_type === "exercise").length;

  // Bulk selection
  const visibleIds = useMemo(() => filtered.map((t: any) => t.id as string), [filtered]);
  const bulkSel = useBulkSelection(visibleIds);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 md:space-y-6">
      {/* ===== Hero header ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-5 md:p-6">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Học thuật
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
              <Library className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              Ngân hàng đề
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Tạo và quản lý kho đề thi, bài tập theo từng kỹ năng IELTS — gắn vào khoá học, đồng bộ WorkDrive, gán flashcard.
            </p>

            {/* Inline mini-stats */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur border border-border/60 px-3 py-1 text-xs font-semibold shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {isLoading ? "Đang tải..." : `${assessments?.length || 0} mục`}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-semibold">
                <ClipboardList className="h-3 w-3" /> {testCount} bài thi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30 px-3 py-1 text-xs font-semibold">
                <Layers className="h-3 w-3" /> {exerciseCount} bài tập
              </span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate("/tests/import")}
              className="gap-2 rounded-xl bg-card/80 backdrop-blur border-border/60 hover:bg-card"
            >
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button
              onClick={() => navigate("/tests/new")}
              className="gap-2 rounded-xl shadow-md shadow-primary/30 bg-gradient-to-br from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/40 transition-shadow"
            >
              <Plus className="h-4 w-4" /> Tạo mới
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Content type tabs — vivid segmented ===== */}
      <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card p-1.5 shadow-sm">
        {[
          {
            value: "all", label: "Tất cả", count: (assessments || []).length, icon: Library,
            activeClass: "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/30",
            inactiveHover: "hover:text-primary",
          },
          {
            value: "test", label: "Bài thi", count: testCount, icon: ClipboardList,
            activeClass: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30",
            inactiveHover: "hover:text-emerald-600 dark:hover:text-emerald-400",
          },
          {
            value: "exercise", label: "Bài tập", count: exerciseCount, icon: Layers,
            activeClass: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30",
            inactiveHover: "hover:text-violet-600 dark:hover:text-violet-400",
          },
        ].map(tab => {
          const active = contentTypeFilter === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setContentTypeFilter(tab.value)}
              className={cn(
                "group relative flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl text-sm font-bold transition-all",
                active
                  ? `${tab.activeClass} scale-[1.03]`
                  : `text-muted-foreground ${tab.inactiveHover} hover:bg-muted/60`,
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className={cn(
                "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[22px] text-center",
                active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground group-hover:bg-card",
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chip-based filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          {showSearch ? (
            <div className="relative min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Tìm đề thi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm rounded-full"
              />
              <button onClick={() => { setSearch(""); setShowSearch(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
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
            <FileText className="h-3.5 w-3.5" />
            Tất cả
            <span className={cn(
              "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
              !hasFilters ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {(assessments || []).length}
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
                  levelFilters.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                Level
                {levelFilters.size > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{levelFilters.size}</span>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", levelExpanded && "rotate-180")} />
              </button>
            </>
          )}

          {/* Section type toggle */}
          {usedSections.length > 1 && (
            <>
              <span className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={() => setSectionExpanded(!sectionExpanded)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                  sectionFilters.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Kỹ năng
                {sectionFilters.size > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{sectionFilters.size}</span>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", sectionExpanded && "rotate-180")} />
              </button>
            </>
          )}

          {/* Status toggle */}
          <>
            <span className="h-5 w-px bg-border mx-0.5" />
            <button
              onClick={() => setStatusExpanded(!statusExpanded)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                statusFilters.size > 0
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              Trạng thái
              {statusFilters.size > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{statusFilters.size}</span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform", statusExpanded && "rotate-180")} />
            </button>
          </>

          {/* Program + Course (cascading, dùng chung component) */}
          <span className="h-5 w-px bg-border mx-0.5" />
          <ResourceFilterBar
            programIds={programFilters}
            courseIds={courseFilters}
            onProgramsChange={(next) => {
              setProgramFilters(next);
              if (next.size === 0) setCourseFilters(new Set());
            }}
            onCoursesChange={setCourseFilters}
            programExpanded={programExpanded}
            courseExpanded={courseExpanded}
            onToggleProgram={() => setProgramExpanded(!programExpanded)}
            onToggleCourse={() => setCourseExpanded(!courseExpanded)}
            matchedCount={matchedToCourse.length}
            untaggedCount={untaggedItems.length}
          />

          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} / {(assessments || []).length} đề thi</span>

          {bulkSel.count > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 transition-colors">
                  <Tags className="h-3.5 w-3.5" />
                  Hành động ({bulkSel.count})
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setBulkDialogOpen(true)}>
                  <GraduationCap className="h-4 w-4 mr-2" /> Gán khoá học...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={bulkSel.clear}>
                  <X className="h-4 w-4 mr-2" /> Bỏ chọn tất cả
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Level chips row */}
        {levelExpanded && usedLevels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {courseLevels.filter(l => usedLevels.includes(l.name)).map(l => {
              const count = (assessments || []).filter(t => (t as any).course_level === l.name).length;
              const active = levelFilters.has(l.name);
              const lc = getLevelColorConfig(l.color_key || l.name);
              return (
                <button
                  key={l.id}
                  onClick={() => toggleFilter(setLevelFilters, l.name)}
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

        {/* Section type chips row */}
        {sectionExpanded && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {usedSections.map(sec => {
              const count = (assessments || []).filter(t => t.section_type === sec).length;
              const active = sectionFilters.has(sec);
              const sc = SECTION_COLORS[sec] || { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", active: "bg-gray-200 text-gray-700 border-gray-300" };
              return (
                <button
                  key={sec}
                  onClick={() => toggleFilter(setSectionFilters, sec)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    active ? `${sc.active} shadow-md scale-105 ring-1 ring-offset-1` : `${sc.bg} ${sc.text} ${sc.border} hover:shadow-md hover:scale-[1.02]`
                  )}
                >
                  {sectionTypeLabels[sec] || sec}
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", active ? `bg-white/40 ${sc.text}` : `bg-white/60 ${sc.text}`)}>
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
              { value: "draft", label: "Draft", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", active: "bg-gray-200 text-gray-700 border-gray-300" },
              { value: "archived", label: "Archived", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", active: "bg-orange-200 text-orange-700 border-orange-300" },
            ].map(st => {
              const count = (assessments || []).filter(t => t.status === st.value).length;
              if (count === 0) return null;
              const active = statusFilters.has(st.value);
              return (
                <button
                  key={st.value}
                  onClick={() => toggleFilter(setStatusFilters, st.value)}
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

      {/* Test list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-muted/30">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 mb-4">
            <Library className="h-8 w-8 text-primary" />
          </div>
          <p className="font-display font-bold text-base text-foreground">Chưa có đề thi nào khớp bộ lọc</p>
          <p className="text-sm text-muted-foreground mt-1">Thử bỏ bớt bộ lọc, hoặc bấm <span className="font-semibold text-foreground">"Tạo mới"</span> để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Checkbox
                checked={bulkSel.allSelected}
                onCheckedChange={() => bulkSel.toggleAll()}
                aria-label="Chọn tất cả"
              />
              <span>
                {bulkSel.count > 0 ? `Đã chọn ${bulkSel.count} / ${filtered.length}` : `Chọn tất cả`}
              </span>
            </div>
          )}
          {filtered.map((test) => {
            const st = statusLabels[test.status] || statusLabels.draft;
            const sec = SECTION_COLORS[test.section_type];
            const SecIcon = sec?.icon || FileText;
            return (
              <div
                key={test.id}
                className={cn(
                  "group relative bg-card rounded-2xl border border-border/70 p-4 flex items-center gap-4 transition-all duration-200",
                  "hover:shadow-lg hover:shadow-foreground/5 hover:border-primary/40 hover:-translate-y-0.5",
                  bulkSel.isSelected(test.id) && "border-primary/60 bg-primary/[0.04] shadow-md shadow-primary/10",
                )}
              >
                {/* Color strip theo skill */}
                {sec && (
                  <span className={cn(
                    "absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b",
                    sec.gradient,
                  )} />
                )}
                <Checkbox
                  checked={bulkSel.isSelected(test.id)}
                  onCheckedChange={() => bulkSel.toggle(test.id)}
                  aria-label={`Chọn ${test.name}`}
                />
                <div
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ring-1 ring-white/20",
                    sec
                      ? `bg-gradient-to-br ${sec.gradient} text-white`
                      : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
                  )}
                >
                  <SecIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-sm md:text-[15px] text-foreground group-hover:text-primary transition-colors">
                      {test.name}
                    </p>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      st.className,
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", st.dot, test.status === "published" && "animate-pulse")} />
                      {st.label}
                    </span>
                  </div>
                  {test.book_name && <p className="text-xs text-muted-foreground mt-0.5">{test.book_name}</p>}
                  <div className="flex gap-2 mt-1 flex-wrap items-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold border",
                      sec ? `${sec.bg} ${sec.text} ${sec.border}` : "bg-secondary text-secondary-foreground border-transparent",
                    )}>
                      <SecIcon className="h-3 w-3" />
                      {sectionTypeLabels[test.section_type] || test.section_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {test.total_questions} câu • {Math.floor(test.duration / 60)} phút
                    </span>
                    {syncedAssessmentIds.has(test.id) && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-1.5 py-0.5 font-bold">
                        <Cloud className="h-3 w-3" /> Đã đồng bộ
                      </span>
                    )}
                  </div>
                  {assessmentQuestionTypes[test.id] && assessmentQuestionTypes[test.id].length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {assessmentQuestionTypes[test.id].map(t => (
                        <QuestionTypeBadge key={t} type={t} size="xs" />
                      ))}
                    </div>
                  )}
                  <ResourceTagManager resourceType="assessment" resourceId={test.id} compact />
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground text-right">
                  {test.available_from && (
                    <p>Từ: {formatDateDDMMYYYY(test.available_from)}</p>
                  )}
                  {test.available_until && (
                    <p>Đến: {formatDateDDMMYYYY(test.available_until)}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-60 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}`)}>
                      <Pencil className="h-4 w-4 mr-2" /> Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}/preview`)}>
                      <Eye className="h-4 w-4 mr-2" /> Xem trước
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => duplicateMutation.mutate(test.id)}
                      disabled={duplicateMutation.isPending}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Nhân bản
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => createFlashcardForTest(test.id, test.name)}>
                      <BookOpen className="h-4 w-4 mr-2" /> Tạo Flashcard
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(test.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Xoá
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đề thi?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn đề thi và tất cả câu hỏi liên quan. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkCourseAssignDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        kind="assessment"
        resourceIds={bulkSel.selectedIds}
        resourceLabel="đề thi"
        onDone={() => bulkSel.clear()}
      />
    </div>
  );
}

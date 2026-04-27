import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  Plus, Search, MoreVertical, FileText, Trash2, Eye, Pencil, Copy, Loader2, BookOpen, Cloud, ChevronDown, Tags, X, Layers, Upload,
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
import ResourceTagManager from "@admin/features/settings/components/ResourceTagManager";
import QuestionTypeBadge from "@shared/components/misc/QuestionTypeBadge";
import { ALL_TYPE_LABELS_EN as ALL_QUESTION_TYPE_LABELS } from "@shared/utils/questionTypes";
import { ResourceFilterBar } from "@shared/components/resources/ResourceFilterBar";
import { useResourceList } from "@shared/hooks/useResourceList";

const statusLabels: Record<string, { label: string; className: string }> = {
  published: { label: "Published", className: "bg-primary/15 text-primary" },
  draft: { label: "Draft", className: "bg-accent/15 text-accent" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

const sectionTypeLabels: Record<string, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string; active: string }> = {
  READING: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", active: "bg-blue-200 text-blue-800 border-blue-300" },
  LISTENING: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", active: "bg-purple-200 text-purple-800 border-purple-300" },
  WRITING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", active: "bg-amber-200 text-amber-800 border-amber-300" },
  SPEAKING: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", active: "bg-rose-200 text-rose-800 border-rose-300" },
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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold">Ngân hàng đề</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Đang tải..." : `${assessments?.length || 0} đề · ${testCount} bài thi · ${exerciseCount} bài tập`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/tests/import")} className="gap-2 rounded-xl">
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => navigate("/tests/new")} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Tạo mới
          </Button>
        </div>
      </div>

      {/* Content type tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {[
          { value: "all", label: "Tất cả", count: (assessments || []).length },
          { value: "test", label: "Bài thi", count: testCount },
          { value: "exercise", label: "Bài tập", count: exerciseCount },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setContentTypeFilter(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              contentTypeFilter === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
              contentTypeFilter === tab.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
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
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có đề thi nào</p>
          <p className="text-sm mt-1">Bấm "Tạo đề mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((test) => {
            const st = statusLabels[test.status] || statusLabels.draft;
            return (
              <div
                key={test.id}
                className="bg-card rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-dark flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{test.name}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.className}`}>
                      {st.label}
                    </span>
                  </div>
                  {test.book_name && <p className="text-xs text-muted-foreground mt-0.5">{test.book_name}</p>}
                  <div className="flex gap-2 mt-1 flex-wrap items-center">
                    <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-medium">
                      {sectionTypeLabels[test.section_type] || test.section_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {test.total_questions} questions • {Math.floor(test.duration / 60)}min
                    </span>
                    {syncedAssessmentIds.has(test.id) && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                        <Cloud className="h-3 w-3" /> WorkDrive
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
                    <p>From: {new Date(test.available_from).toLocaleDateString()}</p>
                  )}
                  {test.available_until && (
                    <p>Until: {new Date(test.available_until).toLocaleDateString()}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}`)}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}/preview`)}>
                      <Eye className="h-4 w-4 mr-2" /> Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => duplicateMutation.mutate(test.id)}
                      disabled={duplicateMutation.isPending}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => createFlashcardForTest(test.id, test.name)}>
                      <BookOpen className="h-4 w-4 mr-2" /> Tạo Flashcard
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(test.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
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
    </div>
  );
}

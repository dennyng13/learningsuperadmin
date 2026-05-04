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

/* Day 7 polish: emojis make section filter chips playful per mockup
   pages-test-create.jsx (Reading 📖 / Listening 🎧 / Writing ✍️ / Speaking 🎙️). */
const SECTION_EMOJI: Record<string, string> = {
  READING: "📖",
  LISTENING: "🎧",
  WRITING: "✍️",
  SPEAKING: "🎙️",
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
      {/* ===== Hero header — ink pop-card ===== */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(120deg, var(--lp-cream, #F9F8F4) 0%, #FFF 55%, var(--lp-teal-soft, #E6F7F6) 100%)",
        border: "2.5px solid var(--lp-ink, #0B0C0E)",
        borderRadius: 22, padding: "24px 28px 26px",
        boxShadow: "6px 6px 0 0 var(--lp-ink, #0B0C0E)",
      }}>
        {/* decorative glyphs */}
        <span style={{ position: "absolute", top: 8, right: 80, fontSize: 88, fontWeight: 900, color: "var(--lp-coral, #FA7D64)", opacity: 0.1, pointerEvents: "none", userSelect: "none", fontFamily: "var(--ff-display, inherit)" }}>⌜</span>
        <span style={{ position: "absolute", bottom: -16, left: "42%", fontSize: 76, fontWeight: 900, color: "var(--lp-yellow, #F59E0B)", opacity: 0.13, pointerEvents: "none", userSelect: "none", fontFamily: "var(--ff-display, inherit)" }}>✦</span>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 28, alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--ff-display, inherit)", fontWeight: 800, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--lp-coral, #FA7D64)", marginBottom: 6 }}>
              <span style={{ color: "var(--lp-yellow, #F59E0B)", fontSize: 13 }}>✦</span> Library · Tests · Exercises
            </div>
            <h1 style={{ fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 42, lineHeight: 1.02, letterSpacing: "-0.035em", color: "var(--lp-ink, #0B0C0E)", margin: "0 0 10px", maxWidth: 680 }}>
              Test bank, your{" "}
              <span style={{ color: "var(--lp-coral, #FA7D64)", background: "var(--lp-yellow-soft, #FFFBEB)", padding: "0 8px", borderRadius: 8, boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)", display: "inline-block", transform: "rotate(-1deg)" }}>armory</span>
            </h1>
            <p style={{ fontSize: 14, color: "var(--lp-body, #6B7280)", lineHeight: 1.55, margin: 0 }}>
              {isLoading ? "Đang tải..." : `${assessments?.length || 0} tests · ${exerciseCount} exercises`} · Tạo, quản lý và gắn đề vào khoá học.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={() => navigate("/tests/import")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "#fff", border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 12, padding: "9px 18px",
                fontFamily: "var(--ff-display, inherit)", fontWeight: 800, fontSize: 13,
                boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)", cursor: "pointer",
                transition: "all .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "4px 4px 0 0 var(--lp-ink)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 0 var(--lp-ink)"; }}
            >
              <Upload className="h-3.5 w-3.5" /> Import .docx
            </button>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "var(--lp-yellow, #F59E0B)", border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 12, padding: "9px 18px",
                fontFamily: "var(--ff-display, inherit)", fontWeight: 800, fontSize: 13,
                boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)", cursor: "pointer",
                transition: "all .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "4px 4px 0 0 var(--lp-ink)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 0 var(--lp-ink)"; }}
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Generate
            </button>
            <button
              onClick={() => navigate("/tests/new")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "var(--lp-coral, #FA7D64)", border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 12, padding: "9px 18px", color: "#fff",
                fontFamily: "var(--ff-display, inherit)", fontWeight: 800, fontSize: 13,
                boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)", cursor: "pointer",
                transition: "all .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "4px 4px 0 0 var(--lp-ink)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 0 var(--lp-ink)"; }}
            >
              <Plus className="h-3.5 w-3.5" /> Tạo đề mới
            </button>
          </div>
        </div>
      </div>

      {/* ===== 4-column skill KPI strip ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {([
          { skill: "Reading",   count: (assessments||[]).filter(a=>a.section_type==="READING").length,   color: "var(--lp-teal, #2DD4BF)",   soft: "var(--lp-teal-soft, #E6F7F6)",   icon: BookOpen },
          { skill: "Listening", count: (assessments||[]).filter(a=>a.section_type==="LISTENING").length, color: "#8B5CF6",                    soft: "#EDE9FE",                        icon: Headphones },
          { skill: "Writing",   count: (assessments||[]).filter(a=>a.section_type==="WRITING").length,   color: "var(--lp-coral, #FA7D64)",  soft: "var(--lp-coral-soft, #FFF1EF)",  icon: PenLine },
          { skill: "Speaking",  count: (assessments||[]).filter(a=>a.section_type==="SPEAKING").length,  color: "var(--lp-yellow, #F59E0B)", soft: "var(--lp-yellow-soft, #FFFBEB)", icon: Mic },
        ] as const).map(s => {
          const Icon = s.icon;
          return (
            <div key={s.skill} style={{
              background: s.soft,
              border: "2.5px solid var(--lp-ink, #0B0C0E)",
              borderRadius: 18, padding: "16px 18px",
              boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lp-body, #6B7280)" }}>{s.skill}</span>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: s.color, border: "2px solid var(--lp-ink, #0B0C0E)",
                  boxShadow: "2px 2px 0 0 var(--lp-ink, #0B0C0E)",
                  display: "grid", placeItems: "center",
                }}>
                  <Icon style={{ width: 16, height: 16, color: "#fff" }} strokeWidth={1.85} />
                </div>
              </div>
              <div style={{ fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--lp-ink, #0B0C0E)", marginBottom: 4 }}>{s.count}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--lp-body, #6B7280)" }}>tests · exercises</div>
            </div>
          );
        })}
      </div>

      {/* ===== Content type tab bar — ink pop style ===== */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "var(--lp-cream, #F9F8F4)",
        border: "2px solid var(--lp-ink, #0B0C0E)",
        borderRadius: 14, padding: 5,
        boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)",
      }}>
        {([
          { value: "all",      label: "Tất cả",  count: (assessments||[]).length, Icon: Library,      activeBg: "var(--lp-ink, #0B0C0E)",    activeColor: "#fff" },
          { value: "test",     label: "Bài thi", count: testCount,               Icon: ClipboardList, activeBg: "var(--lp-teal, #2DD4BF)",   activeColor: "var(--lp-ink, #0B0C0E)" },
          { value: "exercise", label: "Bài tập", count: exerciseCount,            Icon: Layers,        activeBg: "#8B5CF6",                    activeColor: "#fff" },
        ] as const).map(t => {
          const active = contentTypeFilter === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setContentTypeFilter(t.value)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 16px", borderRadius: 10,
                fontFamily: "var(--ff-display, inherit)", fontWeight: 800, fontSize: 13,
                border: active ? "1.5px solid var(--lp-ink, #0B0C0E)" : "1.5px solid transparent",
                background: active ? t.activeBg : "transparent",
                color: active ? t.activeColor : "var(--lp-body, #6B7280)",
                boxShadow: active ? "2px 2px 0 0 var(--lp-ink, #0B0C0E)" : "none",
                cursor: "pointer", transition: "all .12s",
              }}
            >
              <t.Icon style={{ width: 14, height: 14 }} strokeWidth={1.85} />
              {t.label}
              <span style={{
                fontSize: 10, fontWeight: 900,
                padding: "1px 6px", borderRadius: 99,
                background: active ? "rgba(255,255,255,0.22)" : "rgba(11,12,14,0.08)",
                color: active ? t.activeColor : "var(--lp-body, #6B7280)",
              }}>{t.count}</span>
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
                  <span className="text-base leading-none" aria-hidden>{SECTION_EMOJI[sec] ?? ""}</span>
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
            const sec = SECTION_COLORS[test.section_type];
            const SecIcon = sec?.icon || FileText;
            const SKILL_ACCENT: Record<string, string> = {
              READING: "var(--lp-teal, #2DD4BF)", LISTENING: "#8B5CF6",
              WRITING: "var(--lp-coral, #FA7D64)", SPEAKING: "var(--lp-yellow, #F59E0B)",
            };
            const SKILL_SOFT: Record<string, string> = {
              READING: "var(--lp-teal-soft, #E6F7F6)", LISTENING: "#EDE9FE",
              WRITING: "var(--lp-coral-soft, #FFF1EF)", SPEAKING: "var(--lp-yellow-soft, #FFFBEB)",
            };
            const accent = SKILL_ACCENT[test.section_type] ?? "var(--lp-ink, #0B0C0E)";
            const soft = SKILL_SOFT[test.section_type] ?? "var(--lp-cream, #F9F8F4)";
            const STATUS_PILL: Record<string, { bg: string; color: string; border: string; dot: string }> = {
              published: { bg: "#ECFDF5", color: "#059669", border: "#6EE7B7", dot: "#10B981" },
              draft:     { bg: "#F9FAFB", color: "#6B7280", border: "#D1D5DB", dot: "#9CA3AF" },
              archived:  { bg: "#FFF7ED", color: "#D97706", border: "#FCD34D", dot: "#F59E0B" },
            };
            const sp = STATUS_PILL[test.status] ?? STATUS_PILL.draft;
            return (
              <div
                key={test.id}
                className="group"
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "#fff",
                  border: bulkSel.isSelected(test.id) ? `2px solid ${accent}` : "1.5px solid var(--lp-line, #E5E7EB)",
                  borderRadius: 14, padding: "12px 14px",
                  transition: "all .15s", cursor: "pointer",
                  boxShadow: bulkSel.isSelected(test.id) ? `2px 2px 0 0 ${accent}` : "none",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--lp-ink)"; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0 0 var(--lp-ink)"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bulkSel.isSelected(test.id) ? accent : "var(--lp-line, #E5E7EB)"; (e.currentTarget as HTMLElement).style.boxShadow = bulkSel.isSelected(test.id) ? `2px 2px 0 0 ${accent}` : "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <Checkbox
                  checked={bulkSel.isSelected(test.id)}
                  onCheckedChange={() => bulkSel.toggle(test.id)}
                  aria-label={`Chọn ${test.name}`}
                />
                {/* Skill icon badge */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: soft, border: "2px solid var(--lp-ink, #0B0C0E)",
                  boxShadow: `2px 2px 0 0 ${accent}`,
                  display: "grid", placeItems: "center", fontFamily: "var(--ff-display, inherit)",
                  fontWeight: 900, fontSize: 13, color: "var(--lp-ink, #0B0C0E)",
                }}>
                  {SECTION_EMOJI[test.section_type] ?? <SecIcon style={{ width: 16, height: 16 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontFamily: "var(--ff-display, inherit)", fontWeight: 800, fontSize: 14, color: "var(--lp-ink, #0B0C0E)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {test.name}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      background: sp.bg, color: sp.color, border: `1px solid ${sp.border}`,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: 99, background: sp.dot, display: "inline-block" }} />
                      {test.status === "published" ? "Đã xuất bản" : test.status === "draft" ? "Nháp" : "Đã lưu trữ"}
                    </span>
                  </div>
                  {test.book_name && <div style={{ fontSize: 11.5, color: "var(--lp-body, #6B7280)", marginBottom: 2 }}>{test.book_name}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: soft, border: `1.5px solid ${accent}`, color: "var(--lp-ink, #0B0C0E)",
                    }}>
                      {SECTION_EMOJI[test.section_type]} {sectionTypeLabels[test.section_type] || test.section_type}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--lp-body, #6B7280)" }}>
                      {test.total_questions} câu · {Math.floor(test.duration / 60)} phút
                    </span>
                    {syncedAssessmentIds.has(test.id) && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        background: "#ECFDF5", border: "1px solid #6EE7B7", color: "#059669",
                        display: "inline-flex", alignItems: "center", gap: 3,
                      }}>
                        <Cloud style={{ width: 10, height: 10 }} /> Đã đồng bộ
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

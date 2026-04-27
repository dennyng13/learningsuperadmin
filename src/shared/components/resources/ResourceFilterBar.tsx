/**
 * ResourceFilterBar — bộ filter Program → Course (cascading) tái dùng cho
 * Practice / Flashcards / Assessments list pages.
 *
 * - Programs: lấy từ usePrograms (động).
 * - Courses: chỉ hiện khi đã chọn ít nhất 1 program; fetch theo program đó.
 * - Multi-select cho cả 2 (Set<string>).
 * - Có chip "Chưa phân loại" tách riêng giúp admin dọn data.
 *
 * UX: chip-style, theo phong cách của PracticeExercisesPage hiện tại để đồng nhất.
 */
import { useMemo } from "react";
import { ChevronDown, Tags, GraduationCap, X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { usePrograms } from "@shared/hooks/usePrograms";
import { useCourses } from "@/admin/features/academic/hooks/useCourses";
import { getProgramIcon } from "@shared/utils/programColors";

export interface ResourceFilterBarProps {
  programIds: Set<string>;
  courseIds: Set<string>;
  onProgramsChange: (next: Set<string>) => void;
  onCoursesChange: (next: Set<string>) => void;
  /** Toggles whether the Courses chip is rendered (some pages may not need it). */
  showCourses?: boolean;
  /** Hiển thị block panel nào đang expand (controlled bởi parent). */
  programExpanded: boolean;
  courseExpanded: boolean;
  onToggleProgram: () => void;
  onToggleCourse: () => void;
  /** Counts for nice UX (eg. "5 khớp khoá / 3 chưa phân loại"). */
  matchedCount?: number;
  untaggedCount?: number;
}

export function ResourceFilterBar({
  programIds,
  courseIds,
  onProgramsChange,
  onCoursesChange,
  showCourses = true,
  programExpanded,
  courseExpanded,
  onToggleProgram,
  onToggleCourse,
  matchedCount,
  untaggedCount,
}: ResourceFilterBarProps) {
  const { programs } = usePrograms();

  // Khi programs đã chọn, fetch courses thuộc TẤT CẢ programs đó.
  // Trick: useCourses hỗ trợ 1 programId → gọi nhiều lần nếu cần,
  // ở đây hiệu năng không phải concern (số program nhỏ < 5).
  const firstProgramId = useMemo(() => {
    if (programIds.size === 0) return undefined;
    const key = [...programIds][0];
    return programs.find((p) => p.key.toLowerCase() === key)?.id;
  }, [programIds, programs]);

  const { courses } = useCourses({ programId: firstProgramId, withStats: false });

  const togglePrograms = (key: string) => {
    const next = new Set(programIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onProgramsChange(next);
    // Khi đổi program, courseIds nên reset (course không còn thuộc program đó)
    if (next.size === 0 && courseIds.size > 0) onCoursesChange(new Set());
  };
  const toggleCourses = (id: string) => {
    const next = new Set(courseIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onCoursesChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Program chip */}
        <button
          onClick={onToggleProgram}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
            programIds.size > 0
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
          )}
        >
          <Tags className="h-3.5 w-3.5" />
          Chương trình
          {programIds.size > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              {programIds.size}
            </span>
          )}
          <ChevronDown className={cn("h-3 w-3 transition-transform", programExpanded && "rotate-180")} />
        </button>

        {/* Course chip — disabled khi chưa chọn program */}
        {showCourses && (
          <button
            onClick={() => programIds.size > 0 && onToggleCourse()}
            disabled={programIds.size === 0}
            title={programIds.size === 0 ? "Chọn chương trình trước" : ""}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-sm",
              programIds.size === 0 && "opacity-50 cursor-not-allowed",
              programIds.size > 0 && "cursor-pointer",
              courseIds.size > 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-emerald-400/40",
            )}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Khoá học
            {courseIds.size > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                {courseIds.size}
              </span>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", courseExpanded && "rotate-180")} />
          </button>
        )}

        {/* Inline counts */}
        {(matchedCount !== undefined || untaggedCount !== undefined) && courseIds.size > 0 && (
          <span className="text-[10px] text-muted-foreground ml-1">
            {matchedCount ?? 0} khớp khoá · {untaggedCount ?? 0} chưa phân loại
          </span>
        )}
      </div>

      {/* Program panel */}
      {programExpanded && (
        <div className="flex flex-wrap gap-1.5 pl-1 pt-1 animate-in fade-in slide-in-from-top-1">
          {programs.map((p) => {
            const Icon = getProgramIcon(p.key);
            const active = programIds.has(p.key.toLowerCase());
            return (
              <button
                key={p.id}
                onClick={() => togglePrograms(p.key.toLowerCase())}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                <Icon className="h-3 w-3" /> {p.name}
                {active && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Course panel */}
      {courseExpanded && programIds.size > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1 pt-1 animate-in fade-in slide-in-from-top-1">
          {courses.length === 0 && (
            <span className="text-[11px] text-muted-foreground italic">
              Chương trình này chưa có khoá học nào.
            </span>
          )}
          {courses.map((c) => {
            const active = courseIds.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCourses(c.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all",
                  active
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-card border-border hover:border-emerald-400/60",
                )}
              >
                <GraduationCap className="h-3 w-3" /> {c.name}
                {active && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
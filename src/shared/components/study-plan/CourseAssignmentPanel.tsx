import { useEffect, useMemo, useState } from "react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { Input } from "@shared/components/ui/input";
import { GraduationCap, Plus, X, Search, Check, Loader2 } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";
import {
  type ResourceKind,
  useCoursesForResource,
  useResourceCourseMutations,
} from "@shared/hooks/useResourceCourses";
import { useCourses } from "@/admin/features/academic/hooks/useCourses";
import { usePrograms } from "@shared/hooks/usePrograms";

interface Props {
  kind: ResourceKind;
  resourceId: string;
  /** Optional: pre-filter the assignable courses to a single program. */
  defaultProgramId?: string;
  className?: string;
  /** Visual density. */
  compact?: boolean;
}

/**
 * CourseAssignmentPanel — drop-in widget to manage which courses a single
 * resource (exercise / flashcard set / assessment) belongs to.
 *
 * Displayed as a row of course chips + a "+" button that opens a searchable
 * picker grouped by Program.
 */
export function CourseAssignmentPanel({
  kind, resourceId, defaultProgramId, className, compact = false,
}: Props) {
  const { data: links = [], isLoading } = useCoursesForResource(kind, resourceId);
  const { assign, unassign } = useResourceCourseMutations();
  const { programs } = usePrograms();
  const { courses } = useCourses({ withStats: false });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState<string>(defaultProgramId || "all");

  useEffect(() => {
    if (defaultProgramId) setProgramFilter(defaultProgramId);
  }, [defaultProgramId]);

  const assignedIds = useMemo(() => new Set(links.map((l) => l.course_id)), [links]);

  const programNameById = useMemo(
    () => new Map(programs.map((p) => [p.id, p.name])),
    [programs],
  );

  const assignedCourses = useMemo(
    () => courses.filter((c) => assignedIds.has(c.id)),
    [courses, assignedIds],
  );

  const pickable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => c.status === "active")
      .filter((c) => programFilter === "all" || c.program_id === programFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [courses, query, programFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof pickable>();
    pickable.forEach((c) => {
      const arr = m.get(c.program_id) || [];
      arr.push(c);
      m.set(c.program_id, arr);
    });
    return Array.from(m.entries());
  }, [pickable]);

  const toggle = async (courseId: string) => {
    try {
      if (assignedIds.has(courseId)) {
        await unassign.mutateAsync({ kind, resourceId, courseId });
      } else {
        await assign.mutateAsync({ kind, resourceId, courseId });
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi cập nhật khoá học");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GraduationCap className={cn("text-emerald-600", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            Khoá học gắn với
          </span>
          {assignedCourses.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {assignedCourses.length}
            </Badge>
          )}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className={cn("text-[11px]", compact ? "h-6 px-2" : "h-7 px-2.5")}>
              <Plus className="w-3 h-3 mr-1" /> Gắn khoá
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="end">
            <div className="p-2 border-b border-border space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  className="h-8 text-xs pl-7"
                  placeholder="Tìm khoá học..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setProgramFilter("all")}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border",
                    programFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border",
                  )}
                >
                  Tất cả CT
                </button>
                {programs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProgramFilter(p.id)}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border",
                      programFilter === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border",
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-1">
              {grouped.length === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground py-6">
                  Không có khoá học phù hợp
                </p>
              ) : (
                grouped.map(([progId, list]) => (
                  <div key={progId} className="mb-1">
                    <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      {programNameById.get(progId) || "—"}
                    </div>
                    {list.map((c) => {
                      const selected = assignedIds.has(c.id);
                      const busy = (assign.isPending || unassign.isPending);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={busy}
                          onClick={() => toggle(c.id)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 hover:bg-muted transition-colors",
                            selected && "bg-primary/5",
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0",
                            selected ? "bg-primary border-primary" : "border-border",
                          )}>
                            {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <span className="flex-1 truncate font-medium">{c.name}</span>
                          {c.level_ids.length > 0 && (
                            <span className="text-[8px] bg-muted px-1 py-0.5 rounded">
                              {c.level_ids.length} level
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Assigned chips */}
      {isLoading ? (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
        </div>
      ) : assignedCourses.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">
          Chưa gắn khoá nào — bài này sẽ hiện ở mục "Chưa phân loại" trong Study Plan editor.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {assignedCourses.map((c) => (
            <Badge
              key={c.id}
              variant="default"
              className="text-[10px] gap-1 pr-1 bg-emerald-600 text-white hover:bg-emerald-600/90"
            >
              <GraduationCap className="w-2.5 h-2.5" />
              <span className="truncate max-w-[180px]">{c.name}</span>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className="hover:bg-white/20 rounded-full w-3.5 h-3.5 flex items-center justify-center"
                aria-label="Bỏ gắn"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
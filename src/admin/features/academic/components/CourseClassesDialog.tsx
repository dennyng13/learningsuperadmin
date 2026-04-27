/**
 * CourseClassesDialog — Hiển thị danh sách lớp đang gán với một Khoá học.
 *
 * Match logic (auto-detect):
 *   1. Nếu bảng `classes` có cột `course_id` → match trực tiếp
 *      `classes.course_id === course.id` (chính xác tuyệt đối, lớp cùng
 *      level vẫn có thể thuộc khoá khác nhau).
 *   2. Fallback (cột chưa tồn tại) → match qua tên level:
 *      `classes.level ∈ {tên các level đã gán cho course}`.
 *
 * Detection được cache 1 lần / phiên qua `hasClassesCourseIdColumn()`.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, Users, MapPin, GraduationCap, ExternalLink, Inbox,
  ArrowUpRight, Search, X, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Skeleton } from "@shared/components/ui/skeleton";
import ClassStatusBadge from "@shared/components/admin/ClassStatusBadge";
import { cn } from "@shared/lib/utils";
import { getProgramPalette } from "@shared/utils/programColors";
import type { Course } from "@admin/features/academic/hooks/useCourses";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import { hasClassesCourseIdColumn } from "@admin/features/academic/utils/classesCourseIdSupport";

interface ClassRow {
  id: string;
  name: string | null;
  class_name?: string | null;
  class_code: string | null;
  level: string | null;
  program: string | null;
  branch: string | null;
  schedule: string | null;
  room: string | null;
  teacher_name: string | null;
  student_count: number | null;
  start_date: string | null;
  end_date: string | null;
  lifecycle_status: any;
  status_changed_at: string | null;
  cancellation_reason: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: Course;
  programKey: string;
  programName: string;
  /** Tất cả levels của program để resolve id → name */
  levels: CourseLevel[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return d; }
}

export default function CourseClassesDialog({
  open, onOpenChange, course, programKey, programName, levels,
}: Props) {
  const palette = getProgramPalette(programKey);

  /** Tên các level mà course này đang gán — dùng để filter classes.level */
  const linkedLevelNames = useMemo(() => {
    const map = new Map(levels.map((l) => [l.id, l.name]));
    return Array.from(new Set(
      course.level_ids.map((id) => map.get(id)).filter(Boolean) as string[],
    ));
  }, [levels, course.level_ids]);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["course-classes", course.id, linkedLevelNames.join("|")],
    // Khi đã có cột `course_id`, ta vẫn truy vấn được kể cả khi course chưa
    // có level nào — vì matching dựa vào course_id chứ không phải tên level.
    // Vì vậy chỉ disable khi dialog đóng.
    enabled: open,
    queryFn: async (): Promise<ClassRow[]> => {
      const useCourseId = await hasClassesCourseIdColumn();
      let q = (supabase as any)
        .from("classes")
        .select(
          "id, name, class_name, class_code, level, program, branch, schedule, room, teacher_name, student_count, start_date, end_date, lifecycle_status, status_changed_at, cancellation_reason",
        );
      if (useCourseId) {
        q = q.eq("course_id", course.id);
      } else {
        // Fallback: không có cột course_id → match qua tên level. Khi course
        // chưa có level nào, trả mảng rỗng cho an toàn (tránh `.in("level", [])`
        // bị Supabase coi là điều kiện rỗng → trả tất cả).
        if (linkedLevelNames.length === 0) return [];
        q = q.in("level", linkedLevelNames);
      }
      const { data, error } = await q.order("start_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
    staleTime: 30_000,
  });

  /* ── Quick search + phân trang client-side ───────────────────────────
     Lý do làm client-side: dialog chỉ mở cho 1 course nên dữ liệu
     thường < 1000 dòng, fetch một lần rẻ hơn nhiều round-trip. Hiển thị
     dần dần để DOM không phình khi có vài trăm lớp. */
  const PAGE_OPTIONS = [20, 50, 100] as const;
  type PageSize = (typeof PAGE_OPTIONS)[number] | "all";

  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [visibleCount, setVisibleCount] = useState<number>(20);

  // Reset paging mỗi lần mở dialog hoặc đổi course.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPageSize(20);
    setVisibleCount(20);
  }, [open, course.id]);

  // Khi đổi pageSize hoặc query, reset cửa sổ hiển thị.
  useEffect(() => {
    setVisibleCount(pageSize === "all" ? Number.MAX_SAFE_INTEGER : pageSize);
  }, [pageSize, query]);

  const total = classes?.length ?? 0;

  /** Lọc theo query (tên / code / teacher / level / room / branch). */
  const filtered = useMemo(() => {
    const list = classes ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const blob = [
        c.name, c.class_name, c.class_code, c.level, c.teacher_name, c.room, c.branch,
      ].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [classes, query]);

  const filteredCount = filtered.length;
  const effectiveVisible = Math.min(visibleCount, filteredCount);
  /** Lát theo cửa sổ hiển thị TRƯỚC khi group, để cap tổng dòng render. */
  const sliced = useMemo(
    () => filtered.slice(0, effectiveVisible),
    [filtered, effectiveVisible],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ClassRow[]>();
    for (const c of sliced) {
      const k = c.level ?? "(chưa rõ cấp độ)";
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "vi"));
  }, [sliced]);

  const hasMore = effectiveVisible < filteredCount;
  const remaining = filteredCount - effectiveVisible;
  const loadMoreStep = pageSize === "all" ? filteredCount : (pageSize as number);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className={cn("relative px-6 pt-5 pb-4 border-b", palette.accentSoftBg)}>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-display font-extrabold leading-tight flex items-center gap-2">
              <span className={cn("inline-flex h-8 w-8 rounded-lg items-center justify-center", palette.progressFill)}>
                <GraduationCap className="h-4 w-4 text-white" />
              </span>
              Lớp đang dùng khoá <span className={palette.accentText}>{course.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chương trình <strong className="text-foreground">{programName}</strong>
              {" · "}{linkedLevelNames.length} cấp độ
              {" · "}<strong className="text-foreground">{total}</strong> lớp
              {query.trim() && total > 0 && (
                <> {" · "}lọc còn <strong className="text-foreground">{filteredCount}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Toolbar: search + page size — chỉ hiện khi có dữ liệu */}
        {!isLoading && total > 0 && (
          <div className="px-6 py-2.5 border-b bg-background flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên · code · giáo viên · level · phòng…"
                className="h-8 pl-8 pr-8 text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Xoá tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="inline-flex items-center gap-1 text-[11px]">
              <span className="text-muted-foreground">Hiện</span>
              <div className="inline-flex rounded-md border bg-background p-0.5">
                {(["20", "50", "100", "all"] as const).map((opt) => {
                  const v: PageSize = opt === "all" ? "all" : (Number(opt) as PageSize);
                  const isActive = pageSize === v;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPageSize(v)}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-colors",
                        isActive
                          ? cn(palette.iconBg, palette.iconText)
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt === "all" ? "Tất cả" : opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-prominent px-6 py-4 space-y-5">
          {isLoading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : total === 0 ? (
            <EmptyState
              title="Chưa có lớp nào dùng khoá này"
              hint={
                linkedLevelNames.length === 0
                  ? "Khoá học chưa có cấp độ — hãy gán cấp độ hoặc tạo lớp gán trực tiếp vào khoá này."
                  : `Không tìm thấy lớp khớp với khoá này (cấp độ: ${linkedLevelNames.join(", ")}).`
              }
            />
          ) : filteredCount === 0 ? (
            <EmptyState
              title="Không có lớp khớp tìm kiếm"
              hint={`Không tìm thấy lớp khớp "${query}". Thử bỏ filter hoặc đổi từ khoá.`}
            />
          ) : (
            <>
            {grouped.map(([levelName, items]) => (
              <section key={levelName}>
                <header className="flex items-center gap-2 mb-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", palette.progressFill)} aria-hidden />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {levelName}
                  </h4>
                  <span className="text-[10px] text-muted-foreground">({items.length})</span>
                </header>
                <ul className="space-y-2">
                  {items.map((cls) => (
                    <ClassRowItem key={cls.id} cls={cls} palette={palette} />
                  ))}
                </ul>
              </section>
            ))}

            {/* Load more / hết danh sách */}
            {hasMore ? (
              <div className="pt-1 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setVisibleCount((n) => n + loadMoreStep)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Hiện thêm {Math.min(loadMoreStep, remaining)} lớp
                  <span className="text-muted-foreground font-normal">
                    (còn {remaining})
                  </span>
                </Button>
              </div>
            ) : filteredCount > (PAGE_OPTIONS[0] as number) && (
              <p className="text-[11px] text-center text-muted-foreground italic pt-1">
                Đã hiển thị toàn bộ {filteredCount} lớp.
              </p>
            )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between gap-3">
          <MatchInfo />
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link to={`/classes/list?program=${encodeURIComponent(programKey)}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Mở trang Lớp học
              </Link>
            </Button>
            <Button size="sm" className="h-8" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Sub-components ─────────────────────────── */

function ClassRowItem({
  cls, palette,
}: {
  cls: ClassRow;
  palette: ReturnType<typeof getProgramPalette>;
}) {
  const name = cls.name ?? cls.class_name ?? "(không tên)";
  return (
    <li>
      <Link
        to={`/classes/${cls.id}`}
        className={cn(
          "group block rounded-xl border bg-card p-3 transition-all",
          "hover:shadow-md hover:-translate-y-0.5",
          palette.accentBorder,
          palette.accentBorderHover,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm truncate">{name}</p>
              {cls.class_code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground">
                  {cls.class_code}
                </span>
              )}
              <ClassStatusBadge
                status={cls.lifecycle_status}
                size="sm"
                compact
                reason={cls.cancellation_reason ?? undefined}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-muted-foreground">
              {cls.teacher_name && (
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {cls.teacher_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {cls.student_count ?? 0} HV
              </span>
              {cls.schedule && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {cls.schedule}
                </span>
              )}
              {cls.room && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {cls.room}
                  {cls.branch && ` · ${cls.branch}`}
                </span>
              )}
              {(cls.start_date || cls.end_date) && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {fmtDate(cls.start_date)} → {fmtDate(cls.end_date)}
                </span>
              )}
            </div>
          </div>
          <ArrowUpRight className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/60",
            "transition-all group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
          )} />
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-bold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-md">{hint}</p>
    </div>
  );
}

/**
 * Hiển thị nguồn match (course_id vs level) để admin biết cơ chế hiện hành.
 * Dùng `useQuery` với staleTime vô hạn để chỉ probe đúng 1 lần / phiên.
 */
function MatchInfo() {
  const { data: useCourseId } = useQuery({
    queryKey: ["classes-course-id-support"],
    queryFn: () => hasClassesCourseIdColumn(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const codeCls = "text-[10px] bg-background px-1 py-0.5 rounded border";
  return (
    <p className="text-[11px] text-muted-foreground">
      Lớp được match qua{" "}
      {useCourseId ? (
        <code className={codeCls}>classes.course_id</code>
      ) : (
        <>
          <code className={codeCls}>classes.level</code>{" "}
          <span className="text-muted-foreground/70">(fallback)</span>
        </>
      )}
      .
    </p>
  );
}
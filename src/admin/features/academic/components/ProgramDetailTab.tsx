import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, Layers, Users, GraduationCap, ArrowRight, Loader2, BookOpen,
  CalendarDays, EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import type { CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { COLOR_PRESETS } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";

/**
 * Tab nội dung cho 1 program (vd. IELTS / WRE / Customized).
 *
 * Layout:
 *   • Hero: icon + tên + mô tả ngắn + nút "Sửa".
 *   • Stats strip: số level, số class đang chạy, số học viên (unique).
 *   • Mô tả chi tiết (long_description).
 *   • Outcomes list.
 *   • Cấp độ thuộc program (đã sắp xếp theo program_levels.sort_order).
 *   • Lớp học đang chạy (active/upcoming, link → /classes/:id).
 */

interface Props {
  program: CourseProgram;
  levels: CourseLevel[];
  onEdit: () => void;
}

interface ClassRow {
  id: string;
  name: string | null;
  class_name: string | null;
  class_code: string | null;
  level: string | null;
  start_date: string | null;
  end_date: string | null;
  student_count: number | null;
  lifecycle_status: string | null;
  student_ids: any;
}

export default function ProgramDetailTab({ program, levels, onEdit }: Props) {
  const Icon = getProgramIcon(program.key);
  const palette = getProgramPalette(program.key);
  const isInactive = program.status === "inactive";

  const linkedLevels = useMemo(
    () => program.level_ids
      .map((id) => levels.find((l) => l.id === id))
      .filter((l): l is CourseLevel => !!l),
    [program.level_ids, levels],
  );

  /* ─── Fetch classes & student count ─── */
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setClasses(null);
      setClassesError(null);
      const { data, error } = await (supabase as any)
        .from("classes")
        .select(
          "id, name, class_name, class_code, level, start_date, end_date, student_count, lifecycle_status, student_ids",
        )
        .eq("program", program.key)
        .order("start_date", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        setClassesError(error.message);
        setClasses([]);
        return;
      }
      setClasses((data ?? []) as ClassRow[]);
    })();
    return () => { cancelled = true; };
  }, [program.key]);

  /* ─── Aggregated stats ─── */
  const stats = useMemo(() => {
    if (!classes) return null;
    const active = classes.filter((c) =>
      ["active", "in_progress", "ongoing", "upcoming", "scheduled"].includes((c.lifecycle_status ?? "").toLowerCase()),
    );
    const studentSet = new Set<string>();
    let countSum = 0;
    for (const c of classes) {
      countSum += c.student_count ?? 0;
      const ids = Array.isArray(c.student_ids) ? c.student_ids : [];
      for (const id of ids) if (typeof id === "string") studentSet.add(id);
    }
    return {
      totalClasses: classes.length,
      activeClasses: active.length,
      uniqueStudents: studentSet.size,
      countSum,
    };
  }, [classes]);

  return (
    <div className={cn("space-y-5", isInactive && "opacity-80")}>
      {/* ─── Hero ─── */}
      <section className={cn("rounded-2xl border bg-card overflow-hidden")}>
        <div className={cn("h-1 w-full", palette.progressFill)} />
        <div className="p-5 flex items-start gap-4">
          <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center shrink-0", palette.iconBg)}>
            <Icon className={cn("h-7 w-7", palette.iconText)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl md:text-2xl font-extrabold truncate">{program.name}</h2>
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{program.key}</code>
              {isInactive && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  <EyeOff className="h-3 w-3" /> Đã ẩn
                </span>
              )}
            </div>
            {program.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{program.description}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onEdit} className="shrink-0">
            Sửa khóa học
          </Button>
        </div>
      </section>

      {/* ─── Stats strip ─── */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Cấp độ"
          value={linkedLevels.length}
          tone={palette}
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Lớp đang chạy"
          value={stats?.activeClasses ?? "—"}
          subValue={stats ? `tổng ${stats.totalClasses}` : undefined}
          tone={palette}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Học viên (unique)"
          value={stats?.uniqueStudents ?? "—"}
          tone={palette}
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Sĩ số tổng"
          value={stats?.countSum ?? "—"}
          subValue="tổng student_count"
          tone={palette}
        />
      </section>

      {/* ─── 2-column: long desc + outcomes ─── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className={cn("h-4 w-4", palette.iconText)} />
            <h3 className="font-display font-bold text-sm">Mô tả chi tiết</h3>
          </div>
          {program.long_description ? (
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {program.long_description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Chưa có mô tả chi tiết. Bấm "Sửa khóa học" để thêm.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={cn("h-4 w-4", palette.iconText)} />
            <h3 className="font-display font-bold text-sm">
              Đầu ra ({program.outcomes.length})
            </h3>
          </div>
          {program.outcomes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Chưa có outcome nào.</p>
          ) : (
            <ul className="space-y-1.5">
              {program.outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", palette.iconText)} />
                  <span className="text-foreground/85 leading-snug">{o}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── Levels of this program ─── */}
      <section className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className={cn("h-4 w-4", palette.iconText)} />
            <h3 className="font-display font-bold text-sm">
              Cấp độ thuộc khóa ({linkedLevels.length})
            </h3>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onEdit}>
            Gán lại <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {linkedLevels.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Chưa gán level nào. Bấm "Sửa khóa học" hoặc dùng tab "Gán cấp độ" để gán nhanh.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {linkedLevels.map((l, idx) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-muted/40 text-xs font-medium"
              >
                <span className="text-[10px] font-mono text-muted-foreground">{idx + 1}</span>
                <span
                  className="h-2.5 w-2.5 rounded-full border shrink-0"
                  style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                />
                {l.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ─── Classes running this program ─── */}
      <section className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className={cn("h-4 w-4", palette.iconText)} />
            <h3 className="font-display font-bold text-sm">
              Lớp đang dùng khóa này {classes && `(${classes.length})`}
            </h3>
          </div>
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link to={`/classes/list?program=${encodeURIComponent(program.key)}`}>
              Xem tất cả <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

        {classes === null ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : classesError ? (
          <p className="text-xs text-destructive">Lỗi tải lớp: {classesError}</p>
        ) : classes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Chưa có lớp nào dùng khóa <code className="font-mono">{program.key}</code>.
          </p>
        ) : (
          <div className="rounded-lg border divide-y overflow-hidden">
            {classes.slice(0, 8).map((c) => {
              const status = (c.lifecycle_status ?? "").toLowerCase();
              const statusTone =
                status === "active" || status === "in_progress" || status === "ongoing"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : status === "upcoming" || status === "scheduled"
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                  : status === "completed"
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/60 text-muted-foreground";
              return (
                <Link
                  key={c.id}
                  to={`/classes/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {c.name ?? c.class_name ?? "(không tên)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.class_code ?? "—"}
                      {c.level ? ` · ${c.level}` : ""}
                      {c.start_date ? ` · ${c.start_date}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {c.student_count ?? 0} HV
                  </span>
                  {status && (
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", statusTone)}>
                      {status}
                    </span>
                  )}
                </Link>
              );
            })}
            {classes.length > 8 && (
              <Link
                to={`/classes/list?program=${encodeURIComponent(program.key)}`}
                className="block text-center text-[11px] text-muted-foreground hover:text-foreground py-2 hover:bg-muted/40"
              >
                +{classes.length - 8} lớp khác — xem tất cả
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ───────────── Stat card ───────────── */
function StatCard({
  icon,
  label,
  value,
  subValue,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
  tone: ReturnType<typeof getProgramPalette>;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone.iconBg)}>
        <span className={cn(tone.iconText)}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-display font-extrabold leading-tight">{value}</p>
        {subValue && <p className="text-[10px] text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  );
}
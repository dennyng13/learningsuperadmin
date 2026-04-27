import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft, EyeOff, Layers, Loader2, Pencil,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { useCoursesAdmin } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { useCourses } from "@admin/features/academic/hooks/useCourses";
import ProgramLevelManager from "@admin/features/academic/components/ProgramLevelManager";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

/**
 * /courses/programs/:key — chi tiết 1 chương trình (mô tả, đầu ra, cấp độ, khoá học gắn).
 * Dùng khi user click "Chi tiết" trong tab program ở /courses, hoặc gõ trực tiếp URL.
 */
export default function ProgramDetailPage() {
  const { key = "" } = useParams<{ key: string }>();
  const { programs, loading: programsLoading, refetch } = useCoursesAdmin();
  const { levels, refetch: refetchLevels } = useCourseLevels({ includeOrphans: true });

  const program = useMemo(
    () => programs.find((p) => p.key.toLowerCase() === key.toLowerCase()),
    [programs, key],
  );
  const { courses, loading: coursesLoading } = useCourses({
    programId: program?.id,
    withStats: false,
  });

  if (programsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!program) return <Navigate to="/courses" replace />;

  const Icon = getProgramIcon(program.key);
  const palette = getProgramPalette(program.key);
  const isInactive = program.status === "inactive";

  const onChanged = async () => {
    await Promise.all([refetch(), refetchLevels()]);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <Button asChild size="sm" variant="ghost" className="h-8 -ml-2 gap-1.5 text-xs text-muted-foreground">
        <Link to="/courses">
          <ArrowLeft className="h-3.5 w-3.5" /> Tất cả chương trình
        </Link>
      </Button>

      {/* Hero */}
      <section className={cn("rounded-2xl border bg-card overflow-hidden", isInactive && "opacity-80")}>
        <div className={cn("h-1.5 w-full", palette.progressFill)} />
        <div className="p-5 md:p-6 flex items-start gap-4">
          <div className={cn("h-16 w-16 rounded-xl flex items-center justify-center shrink-0", palette.iconBg)}>
            <Icon className={cn("h-8 w-8", palette.iconText)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chương trình</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl md:text-3xl font-extrabold truncate">{program.name}</h1>
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {program.key}
              </code>
              {isInactive && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  <EyeOff className="h-3 w-3" /> Đã ẩn
                </span>
              )}
            </div>
            {program.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{program.description}</p>
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
            <Link to="/courses/programs">
              <Pencil className="h-3.5 w-3.5" /> Sửa
            </Link>
          </Button>
        </div>
      </section>

      {/* Note: Program chỉ giữ phạm vi (key/name/description ngắn).
          Mô tả chi tiết + đầu ra giờ thuộc về Course bên dưới. */}

      {/* Cấp độ thuộc chương trình */}
      <ProgramLevelManager program={program} allLevels={levels} onChanged={onChanged} />

      {/* Khoá học gắn vào chương trình (read-only list, edit ở /courses) */}
      <section className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className={cn("h-4 w-4", palette.iconText)} />
            <h2 className="font-display font-bold text-sm">
              Khoá học gắn vào chương trình ({courses.length})
            </h2>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link to={`/courses?tab=${encodeURIComponent(program.key)}`}>
              Quản lý khoá học
            </Link>
          </Button>
        </div>

        {coursesLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Chưa có khoá học nào trong chương trình này.
          </p>
        ) : (
          <div className="rounded-lg border divide-y overflow-hidden">
            {courses.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                <BookOpen className={cn("h-3.5 w-3.5 shrink-0", palette.iconText)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  {c.description && (
                    <p className="text-[11px] text-muted-foreground truncate">{c.description}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {c.level_ids.length} cấp độ · {c.outcomes.length} đầu ra
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
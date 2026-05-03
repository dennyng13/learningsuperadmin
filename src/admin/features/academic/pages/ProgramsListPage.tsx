import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, DatabaseZap, Layers, Loader2, GraduationCap,
  AlertTriangle, ArrowRight, EyeIcon, MoreHorizontal,
} from "lucide-react";
import { Skeleton } from "@shared/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { useCoursesAdmin } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette, getProgramEmoji, getProgramColorKey } from "@shared/utils/programColors";
import { ProgramHero } from "@admin/features/academic/components/program-detail";
import { cn } from "@shared/lib/utils";
import { CANONICAL_PROGRAMS } from "@admin/features/academic/lib/courseCatalog";
import { repairCanonicalCourseCatalog } from "@admin/features/academic/lib/courseCatalogRepair";

/**
 * /programs — Source of truth cho 3 chương trình chuẩn.
 * Không cho tạo/xoá tuỳ ý nữa để tránh phát sinh rows rác và lệch program_levels.
 */
export default function ProgramsListPage() {
  const { programs, loading, refetch } = useCoursesAdmin();
  const { levels, refetch: refetchLevels } = useCourseLevels({ includeOrphans: true });
  const [repairing, setRepairing] = useState(false);

  const programStats = useMemo(() => {
    const map = new Map<string, { levelCount: number; configured: boolean }>();
    for (const preset of CANONICAL_PROGRAMS) {
      const row = programs.find((p) => p.key === preset.key);
      map.set(preset.key, {
        levelCount: row?.level_ids.length ?? 0,
        configured: Boolean(row),
      });
    }
    return map;
  }, [programs]);

  const missingCount = CANONICAL_PROGRAMS.filter((preset) => !programs.some((p) => p.key === preset.key)).length;

  const handleRepair = async () => {
    setRepairing(true);
    try {
      const result = await repairCanonicalCourseCatalog();
      await Promise.all([refetch(), refetchLevels()]);
      toast.success(
        `Đã chuẩn hóa: +${result.createdPrograms} chương trình, chuyển ${result.movedLevelLinks} level, xoá ${result.deletedPrograms} dòng rác.`,
      );
    } catch (err: any) {
      toast.error(`Không thể chuẩn hóa: ${err.message ?? "Unknown"}`);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Hero Section for Programs Management */}
      <ProgramHero
        program={{
          code: "ALL",
          name: "Quản trị chương trình",
          tagline: "IELTS • WRE • Customized",
          level: "",
          emoji: "🎓",
          color: "coral",
          status: "active",
          desc: "Hệ thống chỉ dùng 3 chương trình chuẩn. Không cho tạo/xoá tuỳ ý nữa để tránh phát sinh rows rác.",
          students: programStats.size > 0
            ? Array.from(programStats.values()).reduce((acc, s) => acc + s.levelCount, 0)
            : 0,
          classes: 0,
          courses: CANONICAL_PROGRAMS.length,
          weeks: 0,
          bandLiftAvg: 0,
          pricing: { full: 0, perWeek: 0 },
          revenue: 0,
          target: 3,
          completion: programs.length >= 3 ? 100 : Math.round((programs.length / 3) * 100),
          satisfaction: 0,
          retention: 0,
        }}
        onEdit={() => {}}
      />

      {(missingCount > 0 || programs.length !== CANONICAL_PROGRAMS.length) && !loading && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-sm">Dữ liệu chương trình chưa sạch</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Bấm <strong>Chuẩn hóa dữ liệu</strong> để tạo đủ IELTS/WRE/Customized, chuyển level từ chương trình rác về IELTS và xoá các dòng không hợp lệ.
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {loading
          ? CANONICAL_PROGRAMS.map((preset) => (
              <article key={preset.key} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                <div className="h-1.5 w-full bg-muted" />
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  {/* Stats row skeleton */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                    <div className="text-center space-y-1">
                      <Skeleton className="h-6 w-6 mx-auto" />
                      <Skeleton className="h-2 w-10 mx-auto" />
                    </div>
                    <div className="text-center space-y-1 border-l">
                      <Skeleton className="h-6 w-6 mx-auto" />
                      <Skeleton className="h-2 w-10 mx-auto" />
                    </div>
                    <div className="text-center space-y-1 border-l">
                      <Skeleton className="h-6 w-6 mx-auto" />
                      <Skeleton className="h-2 w-10 mx-auto" />
                    </div>
                    <div className="text-center space-y-1 border-l">
                      <Skeleton className="h-6 w-6 mx-auto" />
                      <Skeleton className="h-2 w-8 mx-auto" />
                    </div>
                  </div>
                  {/* Progress bar skeleton */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-2 w-10" />
                  </div>
                </div>
                <div className="border-t p-3 flex items-center justify-between gap-2 bg-muted/20">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-2 w-16 ml-1" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                </div>
              </article>
            ))
          : CANONICAL_PROGRAMS.map((preset) => {
            const row = programs.find((p) => p.key === preset.key);
            const Icon = getProgramIcon(preset.key);
            const palette = getProgramPalette(preset.key);
            const emoji = getProgramEmoji(preset.key);
            const stats = programStats.get(preset.key);
            
            // Mock data for visual display (will be replaced with real data)
            const mockCourses = stats?.levelCount ?? 0;
            const mockClasses = Math.floor((stats?.levelCount ?? 0) * 1.5);
            const mockStudents = Math.floor(Math.random() * 100) + 20;
            const mockWeeks = mockCourses * 3;
            const mockRevenue = mockStudents * 18500000;
            const mockTarget = mockStudents * 20000000;
            const completionPct = Math.min(100, Math.round((mockRevenue / mockTarget) * 100));
            
            return (
              <article key={preset.key} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                {/* Header with colored top bar */}
                <div className={cn("h-1.5 w-full", palette.progressFill)} />
                
                <div className="p-5 flex-1 space-y-4">
                  {/* Top row: Icon + Code + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-xl", palette.iconBg)}>
                        {emoji}
                      </div>
                      <div>
                        <code className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                          {preset.key}
                        </code>
                        <h2 className="font-display text-lg font-extrabold leading-tight">{preset.name}</h2>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider border",
                        row 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                          : "bg-amber-50 text-amber-600 border-amber-200",
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", row ? "bg-emerald-500" : "bg-amber-500")} />
                      {row ? "Active" : "Draft"}
                    </span>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-muted-foreground">
                    {(row as any)?.tagline || (preset as any).tagline || `${preset.key.toUpperCase()} Program`}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {row?.description || preset.description}
                  </p>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                    <div className="text-center">
                      <p className="font-display text-lg font-bold">{mockCourses}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Courses</p>
                    </div>
                    <div className="text-center border-l">
                      <p className="font-display text-lg font-bold">{mockClasses}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Classes</p>
                    </div>
                    <div className="text-center border-l">
                      <p className="font-display text-lg font-bold">{mockStudents}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Học viên</p>
                    </div>
                    <div className="text-center border-l">
                      <p className="font-display text-lg font-bold">{mockWeeks}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tuần</p>
                    </div>
                  </div>

                  {/* Revenue Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground uppercase tracking-wider">Doanh thu QTD</span>
                      <span className="font-medium">
                        {Math.round(mockRevenue / 1000000)}M / {Math.round(mockTarget / 1000000)}M
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", palette.progressFill)} 
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{completionPct}% target</p>
                  </div>
                </div>

                {/* Footer: Teachers + Actions */}
                <div className="border-t p-3 flex items-center justify-between gap-2 bg-muted/20">
                  {/* Mock teacher avatars */}
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white", palette.progressFill)}>
                        T
                      </div>
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-medium text-white">
                        L
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1">2 teachers</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5 rounded-full px-3">
                      <Link to={`/programs/${preset.key}`}>
                        <EyeIcon className="h-3 w-3" /> Detail
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
      </section>

      <section className="rounded-lg border bg-muted/20 p-4">
        <h2 className="font-display font-bold text-sm">Nguyên tắc dữ liệu mới</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
          <p>Không tạo chương trình tuỳ ý trong UI.</p>
          <p>Mỗi cấp độ chỉ thuộc đúng 1 chương trình.</p>
          <p>Thứ tự cấp độ lưu tại <code className="font-mono">program_levels.sort_order</code>.</p>
        </div>
      </section>
    </div>
  );
}

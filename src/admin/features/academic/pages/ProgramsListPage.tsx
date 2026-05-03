import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, DatabaseZap, Layers, Loader2, GraduationCap,
  AlertTriangle, ArrowRight,
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

      <section className="grid gap-4 md:grid-cols-3">
        {loading
          ? CANONICAL_PROGRAMS.map((preset) => (
              <article key={preset.key} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                <div className="h-1 w-full bg-muted" />
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-10" />
                  </div>
                </div>
                <div className="border-t p-3 flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </article>
            ))
          : CANONICAL_PROGRAMS.map((preset) => {
            const row = programs.find((p) => p.key === preset.key);
            const Icon = getProgramIcon(preset.key);
            const palette = getProgramPalette(preset.key);
            const stats = programStats.get(preset.key);
            return (
              <article key={preset.key} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                <div className={cn("h-1 w-full", palette.progressFill)} />
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", palette.iconBg)}>
                      <Icon className={cn("h-6 w-6", palette.iconText)} />
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                        row ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {row ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {row ? "Sẵn sàng" : "Thiếu"}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-lg font-extrabold">{preset.name}</h2>
                    <code className="text-[11px] text-muted-foreground font-mono">{preset.key}</code>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2 min-h-[2.75rem]">
                      {row?.description || preset.description}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cấp độ đang gắn</p>
                    <p className="font-display text-2xl font-extrabold leading-tight">{stats?.levelCount ?? 0}</p>
                  </div>
                </div>

                <div className="border-t p-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Sort #{preset.sort_order}</span>
                  <Button asChild size="sm" variant="ghost" className="h-8 text-xs gap-1.5">
                    <Link to={`/programs/${preset.key}`}>
                      Chi tiết <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
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

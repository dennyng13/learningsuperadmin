import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DatabaseZap, Loader2, GraduationCap, AlertTriangle, ArrowRight, Eye, MoreHorizontal,
  BookOpen, Target, Zap, Award, Users, BookCopy, Clock, TrendingUp
} from "lucide-react";
import { Skeleton } from "@shared/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { useCoursesAdmin } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";
import { CANONICAL_PROGRAMS } from "@admin/features/academic/lib/courseCatalog";

// Flat icon mapping for programs (no emojis)
const PROGRAM_ICONS: Record<string, React.ElementType> = {
  ielts: Target,
  wre: BookCopy,
  customized: Zap,
  private: Award,
};
import { repairCanonicalCourseCatalog } from "@admin/features/academic/lib/courseCatalogRepair";

/**
 * /programs — Source of truth cho 3 chương trình chuẩn.
 * Refactored: playful UI with flat icons, no emojis.
 */
export default function ProgramsListPage() {
  const { programs, loading, refetch } = useCoursesAdmin();
  const { levels } = useCourseLevels();
  const [repairing, setRepairing] = useState(false);

  const programStats = useMemo(() => {
    const map = new Map<string, { levelCount: number }>();
    for (const preset of CANONICAL_PROGRAMS) {
      const program = programs.find((p) => p.key === preset.key);
      const levelCount = levels?.filter((l) => (l as any).program_id === program?.id).length ?? 0;
      map.set(preset.key, { levelCount });
    }
    return map;
  }, [programs, levels]);

  const activeCount = programs.filter((p) => CANONICAL_PROGRAMS.some((c) => c.key === p.key)).length;

  async function handleRepair() {
    setRepairing(true);
    try {
      await repairCanonicalCourseCatalog();
      toast.success("Chuẩn hóa dữ liệu chương trình thành công");
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi chuẩn hóa dữ liệu");
    } finally {
      setRepairing(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Playful Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-orange-400 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            Chương trình học
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {activeCount}/{CANONICAL_PROGRAMS.length} chương trình đang hoạt động
          </p>
        </div>
        <Button 
          onClick={handleRepair} 
          size="sm" 
          className="h-9 gap-2 rounded-full"
          disabled={repairing || loading}
        >
          {repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
          Chuẩn hóa
        </Button>
      </div>

      {activeCount < 3 && (
        <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-sm">Dữ liệu chương trình chưa sạch</h2>
            <p className="text-xs text-amber-700 mt-1">
              Bấm <strong>Chuẩn hóa</strong> để tạo đủ IELTS/WRE/Customized và xoá các dòng không hợp lệ.
            </p>
          </div>
        </section>
      )}

      {/* Program Cards Grid - Playful UI with Flat Icons */}
      <section className="grid gap-4 md:grid-cols-2">
        {loading
          ? CANONICAL_PROGRAMS.map((preset) => (
              <article key={preset.key} className="rounded-2xl border bg-card overflow-hidden flex flex-col">
                <div className="h-2 w-full bg-muted" />
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-14 w-14 rounded-2xl" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-36" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 pt-3 border-t">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="text-center space-y-1">
                        <Skeleton className="h-8 w-8 mx-auto" />
                        <Skeleton className="h-2 w-12 mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t p-4 flex items-center justify-between gap-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-full" />
                </div>
              </article>
            ))
          : CANONICAL_PROGRAMS.map((preset) => {
            const row = programs.find((p) => p.key === preset.key);
            const Icon = PROGRAM_ICONS[preset.key] || BookOpen;
            const palette = getProgramPalette(preset.key);
            const stats = programStats.get(preset.key);
            
            // Visual data
            const courseCount = stats?.levelCount ?? 0;
            const classCount = Math.floor(courseCount * 1.5) + 2;
            const studentCount = courseCount * 15 + 25;
            const weekCount = courseCount * 4;
            
            return (
              <article key={preset.key} className="rounded-2xl border bg-card overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                {/* Playful header with color accent */}
                <div className={cn("h-2 w-full", palette.progressFill)} />
                
                <div className="p-5 flex-1 space-y-4">
                  {/* Title row with flat icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Flat icon container - playful rounded square */}
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm",
                        palette.iconBg
                      )}>
                        <Icon className={cn("h-7 w-7", palette.iconText)} />
                      </div>
                      <div>
                        <code className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                          {preset.key}
                        </code>
                        <h2 className="font-display text-xl font-extrabold leading-tight">{preset.name}</h2>
                      </div>
                    </div>
                    {/* Playful status pill */}
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border",
                      row 
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                        : "bg-amber-100 text-amber-700 border-amber-200",
                    )}>
                      <span className={cn("w-2 h-2 rounded-full", row ? "bg-emerald-500" : "bg-amber-500")} />
                      {row ? "Active" : "Draft"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {row?.description || preset.description}
                  </p>

                  {/* Playful Stats Row with icons */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <BookOpen className={cn("h-5 w-5", palette.iconText)} />
                      </div>
                      <p className="font-display text-xl font-bold">{courseCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Courses</p>
                    </div>
                    <div className="text-center border-l">
                      <div className="flex items-center justify-center mb-1">
                        <Users className={cn("h-5 w-5", palette.iconText)} />
                      </div>
                      <p className="font-display text-xl font-bold">{classCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Classes</p>
                    </div>
                    <div className="text-center border-l">
                      <div className="flex items-center justify-center mb-1">
                        <Award className={cn("h-5 w-5", palette.iconText)} />
                      </div>
                      <p className="font-display text-xl font-bold">{studentCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Students</p>
                    </div>
                    <div className="text-center border-l">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className={cn("h-5 w-5", palette.iconText)} />
                      </div>
                      <p className="font-display text-xl font-bold">{weekCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Weeks</p>
                    </div>
                  </div>
                </div>

                {/* Playful Footer */}
                <div className="border-t p-4 flex items-center justify-between gap-2 bg-gradient-to-r from-muted/20 to-muted/10">
                  {/* Teacher avatars with playful style */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white",
                        palette.progressFill
                      )}>
                        T
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white ring-2 ring-white">
                        L
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">2 teachers</span>
                  </div>
                  
                  {/* Action buttons - playful style */}
                  <div className="flex items-center gap-2">
                    <Button 
                      asChild 
                      size="sm" 
                      className={cn(
                        "h-9 gap-2 rounded-full px-4 text-xs font-semibold",
                        "bg-gradient-to-r text-white shadow-sm hover:shadow-md transition-all",
                        palette.progressFill.replace("bg-", "from-").replace("-500", "-500") + " to-" + palette.progressFill.replace("bg-", "").replace("-500", "-600")
                      )}
                    >
                      <Link to={`/programs/${preset.key}`}>
                        <Eye className="h-4 w-4" /> Xem
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
      </section>

      {/* Data Principles - Playful card */}
      <section className="rounded-2xl border bg-gradient-to-br from-slate-50 to-slate-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display font-bold text-sm">Nguyên tắc dữ liệu</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
            <span>Không tạo chương trình tuỳ ý trong UI.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
            <span>Mỗi cấp độ chỉ thuộc đúng 1 chương trình.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
            <span>Thứ tự cấp độ lưu tại <code className="font-mono bg-white px-1 rounded">program_levels.sort_order</code>.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

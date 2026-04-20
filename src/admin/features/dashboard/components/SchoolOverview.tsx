/**
 * SchoolOverview — admin/super_admin widget cho toàn trường.
 * Gọi RPC get_school_overview: số HV active, số lớp active, điểm lifetime TB.
 */
import { useSchoolOverview } from "@shared/hooks/usePerformance";
import { Card, CardContent } from "@shared/components/ui/card";
import { Users, School, TrendingUp, Loader2 } from "lucide-react";
import { getPerformanceLabel } from "@shared/utils/performance";
import { cn } from "@shared/lib/utils";

export default function SchoolOverview({ className }: { className?: string }) {
  const { data, isLoading } = useSchoolOverview();

  if (isLoading) {
    return (
      <Card className={cn("rounded-2xl", className)}>
        <CardContent className="p-5 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Đang tổng hợp toàn trường...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const perf = getPerformanceLabel(data.avg_lifetime_score || null);

  return (
    <Card className={cn("rounded-2xl overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="px-4 pt-4 pb-2">
          <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Tổng quan toàn trường
          </h2>
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <Stat icon={Users} label="HV đang học" value={data.active_students} accent="text-primary" />
          <Stat icon={School} label="Lớp đang chạy" value={data.active_classes} accent="text-blue-600" />
          <div className="p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className={cn("h-3.5 w-3.5", perf.color)} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Lifetime TB</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className={cn("text-2xl font-extrabold", perf.color)}>
                {data.avg_lifetime_score || "—"}
              </p>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
            <p className={cn("text-[10px] font-medium", perf.color)}>{perf.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", accent)} />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("text-2xl font-extrabold", accent)}>{value}</p>
    </div>
  );
}

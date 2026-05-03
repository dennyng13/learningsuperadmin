/**
 * RisksPanel — Panel "Cần chú ý" cho các học viên có vấn đề
 * Match mockup pages-class-detail.jsx "Risks"
 *
 * Features:
 * - Count badge
 * - Risk items với icon
 * - Student name + issue description
 * - Color-coded by severity
 */
import { AlertTriangle, Clock, X, AlertCircle, type LucideIcon } from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";

interface RiskItem {
  id: string;
  studentName: string;
  issue: string;
  severity: "high" | "medium" | "low";
  icon: LucideIcon;
  metric?: string;
}

interface RisksPanelProps {
  risks?: RiskItem[];
  loading?: boolean;
}

const DEFAULT_RISKS: RiskItem[] = [
  {
    id: "1",
    studentName: "Bùi Quốc Bảo",
    issue: "vắng 3 buổi",
    severity: "high",
    icon: AlertTriangle,
    metric: "Liên hệ phụ huynh · attendance 75%",
  },
  {
    id: "2",
    studentName: "Phương Thảo",
    issue: "chậm tiến độ",
    severity: "medium",
    icon: Clock,
    metric: "Progress 45% / target 60% · cần 1:1",
  },
  {
    id: "3",
    studentName: "Tuấn Anh",
    issue: "chưa nộp Speaking P2",
    severity: "medium",
    icon: X,
    metric: "Hạn 02 May · còn 4 ngày",
  },
];

const SEVERITY_STYLES = {
  high: {
    bg: "bg-rose-100",
    iconBg: "bg-rose-500",
    text: "text-rose-700",
    badge: "bg-rose-500 text-white",
  },
  medium: {
    bg: "bg-amber-100",
    iconBg: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-500 text-white",
  },
  low: {
    bg: "bg-violet-100",
    iconBg: "bg-violet-500",
    text: "text-violet-700",
    badge: "bg-violet-500 text-white",
  },
};

export function RisksPanel({ risks = DEFAULT_RISKS, loading = false }: RisksPanelProps) {
  if (loading) {
    return (
      <Card className="p-4 h-48 animate-pulse bg-muted border-[2px] border-lp-ink/10">
        <div className="h-4 w-20 bg-muted-foreground/20 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted-foreground/10 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[2px] border-lp-ink shadow-pop bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-lp-ink/10">
        <h4 className="font-display text-sm font-bold text-lp-ink">Cần chú ý</h4>
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
          risks.length > 0 ? "bg-rose-500 text-white" : "bg-emerald-100 text-emerald-700"
        )}>
          {risks.length}
        </span>
      </div>

      {/* Risk items */}
      <div className="p-3 space-y-2">
        {risks.map((risk) => {
          const styles = SEVERITY_STYLES[risk.severity];
          const Icon = risk.icon;

          return (
            <div
              key={risk.id}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {/* Icon */}
              <div
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                  styles.bg
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", styles.text)} strokeWidth={2.5} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-lp-ink">
                  {risk.studentName} · {risk.issue}
                </p>
                {risk.metric && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {risk.metric}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {risks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
              <AlertCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-lp-ink">Không có vấn đề cần chú ý</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tất cả học viên đang tiến triển tốt</p>
          </div>
        )}
      </div>
    </Card>
  );
}

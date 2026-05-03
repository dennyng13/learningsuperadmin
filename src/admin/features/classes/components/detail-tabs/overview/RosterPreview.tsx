/**
 * RosterPreview — Sidebar preview 6 học viên hàng đầu
 * Match mockup pages-class-detail.jsx "Roster preview"
 *
 * Features:
 * - Avatar with color
 * - Name
 * - Progress bar
 * - Current band → target band
 * - Mood/trend icon
 */
import { ArrowUp, ArrowDown, Minus, ChevronRight } from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";

interface RosterStudent {
  id: string;
  name: string;
  color: string;
  progress: number;
  band: string;
  target: string;
  mood: "up" | "down" | "flat";
}

interface RosterPreviewProps {
  students?: RosterStudent[];
  totalCount?: number;
  loading?: boolean;
  onViewAll?: () => void;
  onSelectStudent?: (student: RosterStudent) => void;
}

const DEFAULT_STUDENTS: RosterStudent[] = [
  { id: "1", name: "Nguyễn Linh Anh", color: "#FFB5C5", progress: 78, band: "6.5", target: "7.0", mood: "up" },
  { id: "2", name: "Trần Bảo Trân", color: "#BDE8F5", progress: 92, band: "7.0", target: "7.5", mood: "up" },
  { id: "3", name: "Lê Phương Thảo", color: "#FFC940", progress: 45, band: "5.5", target: "6.5", mood: "down" },
  { id: "4", name: "Phạm Tuấn Anh", color: "#FA7D64", progress: 38, band: "5.0", target: "6.0", mood: "flat" },
  { id: "5", name: "Hoàng Minh Phúc", color: "#8B5CF6", progress: 64, band: "6.0", target: "6.5", mood: "up" },
  { id: "6", name: "Vũ Hà Anh", color: "#5BB5A2", progress: 56, band: "5.5", target: "6.5", mood: "flat" },
];

const MOOD_CONFIG = {
  up: { Icon: ArrowUp, bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  down: { Icon: ArrowDown, bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
  flat: { Icon: Minus, bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
};

function getProgressColor(progress: number): string {
  if (progress >= 80) return "bg-emerald-500";
  if (progress >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function RosterPreview({
  students = DEFAULT_STUDENTS,
  totalCount = 18,
  loading = false,
  onViewAll,
  onSelectStudent,
}: RosterPreviewProps) {
  if (loading) {
    return (
      <Card className="p-4 h-64 animate-pulse bg-muted border-[2px] border-lp-ink/10">
        <div className="h-4 w-24 bg-muted-foreground/20 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted-foreground/10 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[2px] border-lp-ink shadow-pop bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-lp-ink/10">
        <h4 className="font-display text-sm font-bold text-lp-ink">
          Roster · {totalCount} học viên
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-xs font-semibold text-primary hover:text-primary/80 h-auto p-0"
        >
          Xem tất cả <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>

      {/* List */}
      <div className="p-3 space-y-2">
        {students.map((s) => {
          const mood = MOOD_CONFIG[s.mood];
          const progressColor = getProgressColor(s.progress);
          const textColor = ["#FFC940", "#BDE8F5"].includes(s.color) ? "text-lp-ink" : "text-white";

          return (
            <button
              key={s.id}
              onClick={() => onSelectStudent?.(s)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
            >
              {/* Avatar */}
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-lp-ink/10"
                style={{ background: s.color, color: textColor }}
              >
                {s.name.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-lp-ink truncate">
                  {s.name}
                </p>
                {/* Progress bar */}
                <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor)}
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
              </div>

              {/* Band display */}
              <div className="text-right min-w-[40px]">
                <p className="font-display text-sm font-extrabold text-lp-ink leading-none">
                  {s.band}
                </p>
                <p className="text-[9px] text-muted-foreground font-bold mt-0.5">
                  → {s.target}
                </p>
              </div>

              {/* Mood icon */}
              <div
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 border",
                  mood.bg,
                  mood.text,
                  mood.border
                )}
              >
                <mood.Icon className="h-3 w-3" strokeWidth={2.5} />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * PerformanceChart — Biểu đồ Band tiến triển
 * Match mockup pages-class-detail.jsx "Band tiến triển"
 *
 * Features:
 * - Y-axis: band levels (4.5 - 7.5)
 * - Bars showing: đầu khoá → hiện tại → target
 * - Legend: start band, current band, target band
 * - Student codes on X-axis
 */
import { Card } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";

interface StudentProgress {
  id: string;
  name: string;
  code: string;
  color: string;
  startBand: number;
  currentBand: number;
  targetBand: number;
}

interface PerformanceChartProps {
  students?: StudentProgress[];
  loading?: boolean;
}

const DEFAULT_STUDENTS: StudentProgress[] = [
  { id: "1", name: "Nguyễn Linh Anh", code: "LA", color: "#FFB5C5", startBand: 5.5, currentBand: 6.5, targetBand: 7.0 },
  { id: "2", name: "Trần Bảo Trân", code: "BT", color: "#BDE8F5", startBand: 6.3, currentBand: 7.0, targetBand: 7.5 },
  { id: "3", name: "Lê Phương Thảo", code: "PT", color: "#FFC940", startBand: 5.0, currentBand: 5.5, targetBand: 6.5 },
  { id: "4", name: "Phạm Tuấn Anh", code: "TA", color: "#FA7D64", startBand: 4.3, currentBand: 5.0, targetBand: 6.0 },
  { id: "5", name: "Hoàng Minh Phúc", code: "MP", color: "#8B5CF6", startBand: 5.4, currentBand: 6.0, targetBand: 6.5 },
  { id: "6", name: "Vũ Hà Anh", code: "HA", color: "#5BB5A2", startBand: 5.0, currentBand: 5.5, targetBand: 6.5 },
  { id: "7", name: "Đỗ Mai Linh", code: "ML", color: "#FFB5C5", startBand: 4.8, currentBand: 5.5, targetBand: 6.5 },
  { id: "8", name: "Lê Quang Huy", code: "QH", color: "#FFC940", startBand: 5.5, currentBand: 6.0, targetBand: 7.0 },
  { id: "9", name: "Bùi Quốc Bảo", code: "QB", color: "#FA7D64", startBand: 3.8, currentBand: 4.5, targetBand: 5.5 },
  { id: "10", name: "Nguyễn Mai Hương", code: "MH", color: "#5BB5A2", startBand: 5.8, currentBand: 6.5, targetBand: 7.0 },
];

const Y_AXIS_LABELS = [7.5, 7.0, 6.5, 6.0, 5.5, 5.0, 4.5];
const CHART_HEIGHT = 200;

function yScale(band: number): number {
  // Map band to percentage from top (7.5 = 0%, 4.5 = 100%)
  return ((7.5 - band) / 3) * 100;
}

export function PerformanceChart({ students = DEFAULT_STUDENTS, loading = false }: PerformanceChartProps) {
  if (loading) {
    return (
      <Card className="p-6 h-80 animate-pulse bg-muted border-[2.5px] border-lp-ink/10">
        <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-4" />
        <div className="h-48 bg-muted-foreground/10 rounded" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[2.5px] border-lp-ink shadow-pop bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-lp-ink/10">
        <div>
          <h3 className="font-display text-sm font-bold text-lp-ink">Band tiến triển</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Trung bình lớp tăng <strong className="text-emerald-600">+0.5 band</strong> sau 5 tuần · Top 3 đã chạm target
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Đầu khoá
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Hiện tại
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Mục tiêu
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="p-5">
        <div className="relative" style={{ height: CHART_HEIGHT }}>
          {/* Y-axis grid lines */}
          <div className="absolute inset-0">
            {Y_AXIS_LABELS.map((band) => (
              <div
                key={band}
                className="absolute left-0 right-0 flex items-center gap-2"
                style={{ top: `${yScale(band)}%`, transform: "translateY(-50%)" }}
              >
                <span className="text-[10px] font-bold text-muted-foreground w-6 text-right tabular-nums">
                  {band.toFixed(1)}
                </span>
                <div className="flex-1 h-px bg-lp-ink/10" />
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="absolute inset-0 ml-8 flex items-end justify-around">
            {students.map((s) => {
              const startY = yScale(s.startBand);
              const currentY = yScale(s.currentBand);
              const targetY = yScale(s.targetBand);
              const barHeight = Math.max(4, startY - currentY);

              return (
                <div
                  key={s.id}
                  className="relative flex flex-col items-center group"
                  style={{ width: `${100 / students.length}%`, maxWidth: 48 }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-lp-ink text-white text-[10px] font-bold px-2 py-1 rounded shadow-pop whitespace-nowrap">
                      {s.name}
                      <br />
                      {s.startBand.toFixed(1)} → {s.currentBand.toFixed(1)} / {s.targetBand.toFixed(1)}
                    </div>
                  </div>

                  {/* Target line */}
                  <div
                    className="absolute w-full h-0.5 bg-rose-500 rounded-full"
                    style={{ top: `${targetY}%` }}
                  />

                  {/* Stem (start to current) */}
                  <div
                    className="absolute w-1 bg-slate-300 rounded-full"
                    style={{
                      top: `${currentY}%`,
                      height: `${barHeight}%`,
                    }}
                  />

                  {/* Start point */}
                  <div
                    className="absolute h-2 w-2 rounded-full bg-slate-400 border border-white"
                    style={{ top: `${startY}%`, transform: "translateY(-50%)" }}
                    title={`Đầu khoá: ${s.startBand.toFixed(1)}`}
                  />

                  {/* Current point */}
                  <div
                    className="absolute h-3 w-3 rounded-full border-2 border-white shadow-sm z-10"
                    style={{
                      top: `${currentY}%`,
                      transform: "translateY(-50%)",
                      background: s.color,
                    }}
                    title={`Hiện tại: ${s.currentBand.toFixed(1)}`}
                  />

                  {/* Student code */}
                  <div className="absolute top-full mt-1 text-[9px] font-bold text-muted-foreground">
                    {s.code}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis padding */}
        <div className="h-6" />
      </div>
    </Card>
  );
}

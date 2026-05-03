/**
 * ClassesTable — Table các lớp đang vận hành
 * Match mockup pages-program-detail.jsx "Classes tab"
 *
 * Features:
 * - Header với count và fill summary
 * - Table columns: Mã lớp, Khóa, GV, Lịch, Sĩ số, Fill %, Trạng thái
 * - Fill progress bar với color coding
 * - Status badges
 */
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface ProgramClass {
  code: string;
  students: number;
  cap: number;
  teacher: string;
  course: string;
  day: string;
  time: string;
  status: "running" | "starting" | "closed";
  color: string;
}

interface ClassesTableProps {
  classes: ProgramClass[];
  onOpenClass?: () => void;
  onViewClass?: (cls: ProgramClass) => void;
}

const STATUS_CONFIG = {
  running: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "đang chạy" },
  starting: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "sắp mở" },
  closed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", label: "đã đóng" },
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  coral: { bg: "bg-rose-500", text: "text-white" },
  violet: { bg: "bg-violet-500", text: "text-white" },
  sky: { bg: "bg-sky-500", text: "text-white" },
  teal: { bg: "bg-teal-500", text: "text-white" },
  yellow: { bg: "bg-amber-300", text: "text-lp-ink" },
};

export function ClassesTable({ classes, onOpenClass, onViewClass }: ClassesTableProps) {
  const totalCap = classes.reduce((a, c) => a + c.cap, 0);
  const totalStudents = classes.reduce((a, c) => a + c.students, 0);
  const fillRate = totalCap > 0 ? Math.round((totalStudents / totalCap) * 100) : 0;

  return (
    <Card className="overflow-hidden border-[2.5px] border-lp-ink shadow-pop bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-dashed border-lp-ink/30">
        <h3 className="font-display text-base font-bold">
          {classes.length} lớp đang vận hành
        </h3>
        <span className="text-xs text-lp-body font-semibold">
          · cap: {totalCap} ghế · fill: {totalStudents}/{totalCap}
        </span>
        <Button
          size="sm"
          onClick={onOpenClass}
          className="ml-auto bg-rose-500 hover:bg-rose-600 text-white border-[2px] border-lp-ink shadow-pop-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Mở lớp mới
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-lp-ink/10 bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-lp-body">Mã lớp</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-lp-body">Khóa</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-lp-body">Giáo viên</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-lp-body">Lịch</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-lp-body">Sĩ số</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-lp-body">Fill</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-lp-body">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => {
              const fill = Math.round((c.students / c.cap) * 100);
              const status = STATUS_CONFIG[c.status];
              const color = COLOR_MAP[c.color] || COLOR_MAP.coral;
              const codeParts = c.code.split("-");
              const shortCode = codeParts[1] || c.code.slice(0, 3);

              return (
                <tr
                  key={c.code}
                  className="border-b border-lp-ink/5 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => onViewClass?.(c)}
                >
                  {/* Mã lớp */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg border-[1.5px] border-lp-ink flex items-center justify-center font-display text-xs font-bold",
                          color.bg,
                          color.text
                        )}
                      >
                        {shortCode}
                      </div>
                      <span className="font-mono text-xs font-bold">{c.code}</span>
                    </div>
                  </td>

                  {/* Khóa */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 border border-lp-ink/20">
                      {c.course}
                    </span>
                  </td>

                  {/* GV */}
                  <td className="px-4 py-3 font-semibold text-lp-ink">{c.teacher}</td>

                  {/* Lịch */}
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {c.day} · {c.time}
                  </td>

                  {/* Sĩ số */}
                  <td className="px-4 py-3 text-center font-mono text-sm font-bold">
                    {c.students}/{c.cap}
                  </td>

                  {/* Fill % */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden border border-lp-ink/20">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            fill === 100 ? "bg-rose-500" : fill >= 90 ? "bg-amber-500" : "bg-teal-500"
                          )}
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold w-8">{fill}%</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                        status.bg,
                        status.text,
                        status.border
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {status.label}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs border-[2px] border-lp-ink shadow-pop-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewClass?.(c);
                      }}
                    >
                      Mở <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

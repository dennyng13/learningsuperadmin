/**
 * AttendanceHeatmap — Bản đồ điểm danh tuần dạng grid
 * Match mockup pages-class-detail.jsx "Weekly attendance heatmap"
 *
 * Features:
 * - 8x15 grid showing attendance status
 * - Row headers: student names
 * - Column headers: dates
 * - Legend: present, late, absent
 * - Clickable student names to navigate
 */
import { useQuery } from "@tanstack/react-query";
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Loader2, ChevronRight } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  name: string;
  code: string;
  color: string;
  attendanceRate: number;
}

interface AttendanceCell {
  status: "present" | "late" | "absent" | null;
  sessionId?: string;
}

interface AttendanceRow {
  student: Student;
  cells: AttendanceCell[];
}

interface AttendanceHeatmapProps {
  classId: string;
  students?: Student[];
  onSelectStudent?: (student: Student) => void;
}

const MOCK_STUDENTS: Student[] = [
  { id: "1", name: "Nguyễn Linh Anh", code: "LA01", color: "#FFB5C5", attendanceRate: 92 },
  { id: "2", name: "Trần Bảo Trân", code: "BT02", color: "#BDE8F5", attendanceRate: 100 },
  { id: "3", name: "Lê Phương Thảo", code: "PT03", color: "#FFC940", attendanceRate: 75 },
  { id: "4", name: "Phạm Tuấn Anh", code: "TA04", color: "#FA7D64", attendanceRate: 83 },
  { id: "5", name: "Hoàng Minh Phúc", code: "MP05", color: "#8B5CF6", attendanceRate: 92 },
  { id: "6", name: "Vũ Hà Anh", code: "HA06", color: "#5BB5A2", attendanceRate: 92 },
  { id: "7", name: "Đỗ Mai Linh", code: "ML07", color: "#FFB5C5", attendanceRate: 88 },
  { id: "8", name: "Lê Quang Huy", code: "QH08", color: "#FFC940", attendanceRate: 95 },
];

const MOCK_DATES = ["T2 21", "T4 23", "T6 25", "T2 28", "T4 30", "T6 02", "T2 05", "T4 07", "T6 09", "T2 12", "T4 14", "T6 16", "T2 19", "T4 21", "T6 23"];

function generateMockAttendance(students: Student[], dates: string[]): AttendanceRow[] {
  return students.map((s, i) => ({
    student: s,
    cells: dates.map((_, j) => {
      const v = (s.attendanceRate + j * 7 + i * 11 + 5) % 100;
      if (s.attendanceRate === 100) return { status: "present" };
      if (v < s.attendanceRate - 10) return { status: "present" };
      if (v < s.attendanceRate) return { status: "late" };
      return { status: "absent" };
    }),
  }));
}

export function AttendanceHeatmap({ classId, onSelectStudent }: AttendanceHeatmapProps) {
  // Query real data when backend is ready
  const sessionsQ = useQuery({
    queryKey: ["attendance-heatmap", classId],
    enabled: !!classId,
    queryFn: async () => {
      // TODO: Replace with real query when backend is ready
      // const { data, error } = await supabase
      //   .from("class_session_attendances")
      //   .select("*, class_sessions!inner(session_date), class_students!inner(student_id, synced_students(full_name))")
      //   .eq("class_id", classId)
      //   .order("session_date", { ascending: false })
      //   .limit(15);
      // if (error) throw error;
      // return data;
      return null; // Using mock data for now
    },
    staleTime: 60_000,
  });

  const data = generateMockAttendance(MOCK_STUDENTS, MOCK_DATES);
  const weekRate = 92; // Mock aggregate

  return (
    <Card className="overflow-hidden border-[2.5px] border-lp-ink shadow-pop bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-lp-ink/10">
        <div>
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5 text-lp-ink">
            Bản đồ điểm danh tuần
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            5 tuần gần nhất · {MOCK_STUDENTS.length} học viên · ô đậm = có mặt đúng giờ
          </p>
        </div>
        <Button variant="outline" size="sm" className="border-[2px] border-lp-ink/30 font-display font-bold text-xs h-8">
          Chi tiết <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Heatmap */}
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row with dates */}
          <div className="grid grid-cols-[140px_repeat(15,1fr)] gap-1 mb-1">
            <div className="text-xs font-bold text-muted-foreground" /> {/* Empty corner */}
            {MOCK_DATES.map((d) => (
              <div
                key={d}
                className="text-[9px] font-bold text-center text-lp-body py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Data rows */}
          <div className="space-y-1">
            {data.map((row) => (
              <div key={row.student.id} className="grid grid-cols-[140px_repeat(15,1fr)] gap-1">
                {/* Student name cell */}
                <button
                  onClick={() => onSelectStudent?.(row.student)}
                  className="flex items-center gap-2 text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                >
                  <div
                    className="h-5.5 w-5.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: row.student.color,
                      color: ["#FFC940", "#BDE8F5"].includes(row.student.color) ? "var(--lp-ink)" : "#fff",
                    }}
                  >
                    {row.student.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium truncate">
                    {row.student.name.split(" ").pop()}
                  </span>
                </button>

                {/* Attendance cells */}
                {row.cells.map((cell, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-6 w-full rounded flex items-center justify-center text-[10px] font-bold border transition-colors",
                      cell.status === "present" && "bg-emerald-100 text-emerald-700 border-emerald-300",
                      cell.status === "late" && "bg-amber-100 text-amber-700 border-amber-300",
                      cell.status === "absent" && "bg-rose-100 text-rose-700 border-rose-300"
                    )}
                  >
                    {cell.status === "present" ? "✓" : cell.status === "late" ? "L" : "✗"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-dashed border-lp-ink/15 text-[11px] font-semibold text-lp-body">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center text-[9px]">
            ✓
          </span>
          Có mặt
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center text-[9px]">
            L
          </span>
          Trễ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center text-[9px]">
            ✗
          </span>
          Vắng
        </span>
        <span className="ml-auto font-display font-bold text-sm text-emerald-700">
          Tỉ lệ tuần này: {weekRate}%
        </span>
      </div>
    </Card>
  );
}

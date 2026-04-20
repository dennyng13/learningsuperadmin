import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { CheckCircle2, XCircle, Clock, AlertCircle, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";

interface AttendanceRow {
  id: string;
  lesson_date: string;
  attendance_status: string;
  course_name: string | null;
  notes: string | null;
}

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  present:  { label: "Có mặt",   icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  absent:   { label: "Vắng",     icon: XCircle,      color: "text-rose-600 bg-rose-50 border-rose-200" },
  late:     { label: "Đi trễ",   icon: Clock,        color: "text-amber-600 bg-amber-50 border-amber-200" },
  excused:  { label: "Có phép",  icon: AlertCircle,  color: "text-blue-600 bg-blue-50 border-blue-200" },
};

export default function ClassAttendancePanel({ courseName }: { courseName?: string | null }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: student } = await supabase
          .from("teachngo_students")
          .select("teachngo_id")
          .eq("linked_user_id", user.id)
          .maybeSingle();
        if (!student) { if (!cancelled) { setRows([]); setLoading(false); } return; }

        let query = supabase
          .from("teachngo_attendance" as any)
          .select("id, lesson_date, attendance_status, course_name, notes")
          .eq("teachngo_student_id", student.teachngo_id)
          .order("lesson_date", { ascending: false })
          .limit(50);
        if (courseName) query = query.eq("course_name", courseName);

        const { data } = await query;
        const list = (data as any[] || []) as AttendanceRow[];

        const s = { present: 0, absent: 0, late: 0, excused: 0, total: list.length };
        list.forEach(r => {
          const k = (r.attendance_status || "").toLowerCase();
          if (k in s) (s as any)[k]++;
        });

        if (!cancelled) {
          setRows(list);
          setStats(s);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, courseName]);

  if (loading) return <div className="text-xs text-muted-foreground">Đang tải điểm danh…</div>;
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Chưa có dữ liệu điểm danh.</p>;
  }

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-3">
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Có mặt" value={stats.present} color="text-emerald-600" />
        <StatCard label="Đi trễ" value={stats.late} color="text-amber-600" />
        <StatCard label="Vắng" value={stats.absent} color="text-rose-600" />
        <StatCard label="Tỷ lệ" value={`${attendanceRate}%`} color="text-primary" />
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {rows.map(r => {
          const meta = STATUS_META[(r.attendance_status || "").toLowerCase()] || STATUS_META.absent;
          const Icon = meta.icon;
          return (
            <div key={r.id} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs", meta.color)}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold flex-1 truncate">
                {format(new Date(r.lesson_date), "EEEE, dd/MM/yyyy", { locale: vi })}
              </span>
              <span className="font-bold shrink-0">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2 text-center">
      <p className={cn("text-lg font-extrabold leading-none", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide font-semibold">{label}</p>
    </div>
  );
}

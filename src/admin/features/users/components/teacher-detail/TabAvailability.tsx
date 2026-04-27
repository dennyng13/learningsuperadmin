// Stage P3 admin — TeacherDetailPage "Lịch rảnh" tab.
// Read-only view of teacher_availability_rules + exceptions.
// Full management still lives on /availability (deep link).

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";

interface Rule {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  mode: string;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
}

interface Exception {
  id: string;
  exception_date: string;
  action: "available" | "unavailable";
  start_time: string;
  end_time: string;
  mode: string;
  note: string | null;
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

interface Props { teacherId: string }

export default function TabAvailability({ teacherId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher-availability", teacherId],
    queryFn: async (): Promise<{ rules: Rule[]; exceptions: Exception[] }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fromAny = supabase.from as any;
      const [rulesRes, exRes] = await Promise.all([
        fromAny("teacher_availability_rules")
          .select("id, weekday, start_time, end_time, mode, effective_from, effective_to, note")
          .eq("teacher_id", teacherId)
          .order("weekday", { ascending: true })
          .order("start_time", { ascending: true }),
        fromAny("teacher_availability_exceptions")
          .select("id, exception_date, action, start_time, end_time, mode, note")
          .eq("teacher_id", teacherId)
          .gte("exception_date", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
          .order("exception_date", { ascending: true })
          .limit(60),
      ]);
      if (rulesRes.error) throw rulesRes.error;
      if (exRes.error) throw exRes.error;
      return { rules: (rulesRes.data as Rule[]) ?? [], exceptions: (exRes.data as Exception[]) ?? [] };
    },
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold inline-flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" /> Lịch rảnh
        </h3>
        <Link to="/availability">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Quản lý đầy đủ
          </Button>
        </Link>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      )}
      {error && <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>}

      {data && data.rules.length === 0 && data.exceptions.length === 0 && (
        <p className="text-sm text-muted-foreground p-4 rounded-xl border bg-card">
          Giáo viên chưa khai báo lịch rảnh nào.
        </p>
      )}

      {data && data.rules.length > 0 && (
        <section className="rounded-xl border bg-card overflow-hidden">
          <header className="px-4 py-2 border-b text-sm font-medium">Khung định kỳ ({data.rules.length})</header>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs">
              <tr>
                <th className="text-left p-2">Thứ</th>
                <th className="text-left p-2">Giờ</th>
                <th className="text-left p-2">Mode</th>
                <th className="text-left p-2">Hiệu lực</th>
                <th className="text-left p-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rules.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 font-medium">{WEEKDAYS[r.weekday] ?? r.weekday}</td>
                  <td className="p-2 tabular-nums">{r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}</td>
                  <td className="p-2">{r.mode}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {r.effective_from}{r.effective_to ? ` → ${r.effective_to}` : " → ∞"}
                  </td>
                  <td className="p-2 text-xs">{r.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data && data.exceptions.length > 0 && (
        <section className="rounded-xl border bg-card overflow-hidden">
          <header className="px-4 py-2 border-b text-sm font-medium inline-flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Ngoại lệ (14 ngày trước → tương lai, {data.exceptions.length})
          </header>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs">
              <tr>
                <th className="text-left p-2">Ngày</th>
                <th className="text-left p-2">Loại</th>
                <th className="text-left p-2">Giờ</th>
                <th className="text-left p-2">Mode</th>
                <th className="text-left p-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.exceptions.map((e) => (
                <tr key={e.id}>
                  <td className="p-2 tabular-nums">{e.exception_date}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] ${e.action === "available" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {e.action === "available" ? "Thêm rảnh" : "Bận"}
                    </span>
                  </td>
                  <td className="p-2 tabular-nums">{e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</td>
                  <td className="p-2">{e.mode}</td>
                  <td className="p-2 text-xs">{e.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, Search, CalendarDays, Clock, CheckCircle2, XCircle, MinusCircle, AlertCircle,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";

interface AttendanceRecord {
  id: string;
  teachngo_student_id: string;
  student_name: string;
  course_name: string | null;
  lesson_date: string | null;
  attendance_status: string | null;
  notes: string | null;
  synced_at: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  present: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50", label: "Có mặt" },
  absent: { icon: XCircle, className: "text-red-500 bg-red-50", label: "Vắng" },
  late: { icon: AlertCircle, className: "text-amber-500 bg-amber-50", label: "Trễ" },
  excused: { icon: MinusCircle, className: "text-blue-500 bg-blue-50", label: "Có phép" },
};

function getStatusDisplay(status: string | null) {
  if (!status) return { icon: MinusCircle, className: "text-muted-foreground bg-muted", label: "N/A" };
  const key = status.toLowerCase();
  return statusConfig[key] || { icon: MinusCircle, className: "text-muted-foreground bg-muted", label: status };
}

export default function TeachngoAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance" as any)
      .select("id, teachngo_student_id, student_name, course_name, lesson_date, attendance_status, notes, synced_at")
      .order("lesson_date", { ascending: false });

    if (!error && data) {
      const typed = data as unknown as AttendanceRecord[];
      setRecords(typed);
      if (typed.length > 0) {
        setLastSync(typed[0].synced_at);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const syncAttendance = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setSyncing(false); return; }

      const res = await supabase.functions.invoke("sync-teachngo-attendance", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) {
        toast.error(`Lỗi đồng bộ: ${res.error.message}`);
      } else {
        toast.success(`Đồng bộ thành công! ${res.data.total_fetched} bản ghi điểm danh`);
        await fetchRecords();
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
    setSyncing(false);
  };

  const filtered = records.filter(r => {
    const matchSearch =
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.course_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (r.attendance_status || "").toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalPresent = records.filter(r => (r.attendance_status || "").toLowerCase() === "present").length;
  const totalAbsent = records.filter(r => (r.attendance_status || "").toLowerCase() === "absent").length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Điểm danh Teach'n Go</h1>
          {lastSync && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5" />
              Đồng bộ lần cuối: {new Date(lastSync).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
        <Button onClick={syncAttendance} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {syncing ? "Đang đồng bộ..." : "Đồng bộ điểm danh"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Tổng bản ghi", value: records.length, icon: CalendarDays },
          { label: "Có mặt", value: totalPresent, icon: CheckCircle2 },
          { label: "Vắng", value: totalAbsent, icon: XCircle },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, khóa học..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="present">Có mặt</SelectItem>
            <SelectItem value="absent">Vắng</SelectItem>
            <SelectItem value="late">Trễ</SelectItem>
            <SelectItem value="excused">Có phép</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {records.length === 0
              ? 'Chưa có dữ liệu. Bấm "Đồng bộ điểm danh" để bắt đầu.'
              : "Không tìm thấy bản ghi phù hợp"}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark text-dark-foreground text-left">
                  <th className="px-4 py-3 font-medium">Học viên</th>
                  <th className="px-4 py-3 font-medium">Khóa học</th>
                  <th className="px-4 py-3 font-medium">Ngày</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const status = getStatusDisplay(r.attendance_status);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.student_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.course_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.lesson_date
                          ? new Date(r.lesson_date).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                          status.className
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                        {r.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

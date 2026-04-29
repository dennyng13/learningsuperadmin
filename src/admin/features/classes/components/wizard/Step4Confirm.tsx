// Stage P2 — Step 4 with expected-payroll preview.
// Adds a section showing per-teacher session-count + the teacher's most
// recent 6-month gross-payroll average so the admin can sanity-check
// workload + revenue impact before submitting.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet, AlertTriangle } from "lucide-react";
import { useRoom } from "@shared/hooks/useRooms";
import { AssignedTeacher, DraftSession, WizardClassInfo } from "./wizardTypes";

interface Props {
  classInfo: WizardClassInfo;
  teachers: AssignedTeacher[];
  sessions: DraftSession[];
}

const VND_FMT = new Intl.NumberFormat("vi-VN");

function fmtVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return `${VND_FMT.format(Math.round(n))} ₫`;
}

interface PayslipRow {
  teacher_id: string;
  gross_amount_vnd: number | string;
  month_start: string;
}

function useTeacherPayrollAvg(teacher_ids: string[]) {
  return useQuery({
    queryKey: ["wizard-step4-payroll-avg", teacher_ids.sort().join(",")],
    enabled: teacher_ids.length > 0,
    queryFn: async (): Promise<Map<string, { avg: number | null; count: number }>> => {
      const sixMoStart = new Date();
      sixMoStart.setDate(1);
      sixMoStart.setMonth(sixMoStart.getMonth() - 6);
      const sixMoStartIso = sixMoStart.toISOString().slice(0, 10);
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      const currentMonthStartIso = currentMonthStart.toISOString().slice(0, 10);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("payroll_payslips")
        .select("teacher_id, gross_amount_vnd, month_start, status")
        .in("teacher_id", teacher_ids)
        .in("status", ["confirmed", "teacher_acknowledged", "paid"])
        .gte("month_start", sixMoStartIso)
        .lt("month_start", currentMonthStartIso);
      if (error) throw error;

      const acc = new Map<string, { sum: number; n: number }>();
      for (const row of (data || []) as PayslipRow[]) {
        const v = typeof row.gross_amount_vnd === "string" ? Number(row.gross_amount_vnd) : row.gross_amount_vnd;
        if (!Number.isFinite(v)) continue;
        const cur = acc.get(row.teacher_id) ?? { sum: 0, n: 0 };
        cur.sum += v;
        cur.n += 1;
        acc.set(row.teacher_id, cur);
      }
      const out = new Map<string, { avg: number | null; count: number }>();
      for (const tid of teacher_ids) {
        const cur = acc.get(tid);
        out.set(tid, {
          avg: cur && cur.n > 0 ? cur.sum / cur.n : null,
          count: cur?.n ?? 0,
        });
      }
      return out;
    },
    staleTime: 60_000,
  });
}

function RoomConfirmDisplay({ roomId, forceConflict }: { roomId: string; forceConflict: boolean }) {
  const { data: room, isLoading } = useRoom(roomId);
  if (isLoading) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Đang tải phòng…
      </span>
    );
  }
  if (!room) {
    return <span className="text-muted-foreground italic">Phòng không tồn tại (id: {roomId.slice(0, 8)}…)</span>;
  }
  return (
    <span>
      <span className="text-muted-foreground">Phòng: </span>
      <strong>{room.code}</strong>
      <span className="text-muted-foreground"> · {room.name} · {room.mode} · cap {room.capacity}</span>
      {forceConflict && (
        <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
          <AlertTriangle className="h-3 w-3" /> Override conflict
        </span>
      )}
    </span>
  );
}

export default function Step4Confirm({ classInfo, teachers, sessions }: Props) {
  const active = sessions.filter((s) => !s.cancelled);
  const primaries = teachers.filter((t) => t.role === "primary");
  const tas = teachers.filter((t) => t.role === "ta");

  const teacherIds = teachers.map((t) => t.teacher_id);
  const { data: avgMap, isFetching: payrollLoading } = useTeacherPayrollAvg(teacherIds);

  const sessionCountByTeacher = new Map<string, number>();
  for (const s of active) {
    sessionCountByTeacher.set(s.teacher_id, (sessionCountByTeacher.get(s.teacher_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-5">
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Thông tin lớp</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><dt className="inline text-muted-foreground">Tên: </dt><dd className="inline font-medium">{classInfo.class_name}</dd></div>
          {classInfo.course_title && <div><dt className="inline text-muted-foreground">Khóa: </dt><dd className="inline">{classInfo.course_title}</dd></div>}
          <div><dt className="inline text-muted-foreground">Program: </dt><dd className="inline">{classInfo.program}</dd></div>
          {classInfo.level && <div><dt className="inline text-muted-foreground">Level: </dt><dd className="inline">{classInfo.level}</dd></div>}
          <div><dt className="inline text-muted-foreground">Type: </dt><dd className="inline">{classInfo.class_type}</dd></div>
          <div><dt className="inline text-muted-foreground">Thời gian: </dt><dd className="inline">{classInfo.start_date} → {classInfo.end_date}</dd></div>
          {classInfo.room_id ? (
            <div className="md:col-span-2"><RoomConfirmDisplay roomId={classInfo.room_id} forceConflict={classInfo.room_force_conflict} /></div>
          ) : (
            <div><dt className="inline text-muted-foreground">Phòng: </dt><dd className="inline text-muted-foreground italic">— Không gán —</dd></div>
          )}
          {classInfo.max_students != null && <div><dt className="inline text-muted-foreground">Max HV: </dt><dd className="inline">{classInfo.max_students}</dd></div>}
        </dl>
      </section>

      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Giáo viên ({teachers.length})</h3>
        {primaries.length > 0 && (
          <p className="text-sm"><span className="text-muted-foreground">Primary: </span>{primaries.map((t) => t.full_name).join(", ")}</p>
        )}
        {tas.length > 0 && (
          <p className="text-sm"><span className="text-muted-foreground">TA: </span>{tas.map((t) => t.full_name).join(", ")}</p>
        )}
      </section>

      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Buổi học</h3>
        <p className="text-sm">
          Tổng <span className="font-medium">{sessions.length}</span> buổi —
          <span className="text-primary font-medium ml-1">{active.length}</span> active,
          <span className="text-muted-foreground ml-1">{sessions.length - active.length}</span> cancelled
        </p>
      </section>

      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2 inline-flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          Phân bổ giáo viên & lương dự kiến
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Avg 6 tháng = trung bình lương gross 6 tháng gần nhất (không tính tháng hiện tại). Giáo viên mới chưa có bảng lương sẽ hiển thị "GV mới".
          Mức thù lao thực tế trên lớp này theo hợp đồng/phụ lục — thiết lập rate riêng (nếu có) ở trang chi tiết lời mời.
        </p>
        {payrollLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải doanh thu…
          </div>
        )}
        {!payrollLoading && (
          <div className="border rounded-md divide-y">
            {teachers.map((t) => {
              const cnt = sessionCountByTeacher.get(t.teacher_id) ?? 0;
              const stats = avgMap?.get(t.teacher_id);
              const isNew = !stats || stats.count === 0;
              return (
                <div key={t.teacher_id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{t.full_name}</span>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {t.role}
                      </span>
                      {isNew && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold border border-primary/20">
                          GV mới
                        </span>
                      )}
                    </div>
                    {!isNew && stats && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Avg 6 tháng: <strong className="text-foreground tabular-nums">{fmtVND(stats.avg)}</strong>
                        {" "}/ tháng <span className="text-[11px]">({stats.count} bảng lương đã chốt)</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Buổi được phân</div>
                    <div className="font-semibold tabular-nums">{cnt}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

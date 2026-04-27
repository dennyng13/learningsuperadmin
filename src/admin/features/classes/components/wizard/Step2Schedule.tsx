// Stage P2 — redesigned Step 2 of the create-class wizard.
//
// 3 pill tabs:
//   • "Theo khung thời gian" (by-slot)   — find_available_teachers_for_slot_v2
//                                           with capability/workload/revenue
//                                           scoring badges per row.
//   • "Theo doanh thu thấp"  (by-revenue) — NEW. Surfaces top-N teachers
//                                           with the lowest 6-mo avg gross
//                                           payroll (and new teachers first).
//                                           Admin picks one → switches to
//                                           by-teacher mode with that teacher
//                                           pre-selected.
//   • "Theo giáo viên"       (by-teacher) — manual pick + show common slots.

import { useState } from "react";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Button } from "@shared/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  AlertTriangle, Award, Loader2, Search, Sparkles, TrendingDown, Users, Wallet,
} from "lucide-react";
import { useAvailableTeachersV2, AvailableTeacherV2 } from "@shared/hooks/useAvailableTeachersV2";
import { useLowestRevenueTeachers } from "@shared/hooks/useLowestRevenueTeachers";
import { useTeacherSlots } from "@shared/hooks/useTeacherSlots";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AssignedTeacher, DeliveryMode, ScheduleMode, WizardClassInfo, WizardSlot, WEEKDAY_LABELS,
} from "./wizardTypes";

interface Props {
  classInfo: WizardClassInfo;
  scheduleMode: ScheduleMode;
  setScheduleMode: (m: ScheduleMode) => void;
  slot: WizardSlot;
  setSlot: (s: WizardSlot) => void;
  teachers: AssignedTeacher[];
  setTeachers: (t: AssignedTeacher[]) => void;
  selectedSlotKeys: string[];
  setSelectedSlotKeys: (k: string[]) => void;
}

const VND_FMT = new Intl.NumberFormat("vi-VN");

function fmtVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return `${VND_FMT.format(Math.round(n))} ₫`;
}

export default function Step2Schedule(props: Props) {
  const pill = (mode: ScheduleMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => props.setScheduleMode(mode)}
      className={`px-4 py-2 rounded-full border text-sm font-medium inline-flex items-center gap-2 transition ${
        props.scheduleMode === mode
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background hover:bg-accent/40 border-border"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {pill("by-slot",    "Theo khung thời gian", <Search className="h-3.5 w-3.5" />)}
        {pill("by-revenue", "Theo doanh thu thấp",  <TrendingDown className="h-3.5 w-3.5" />)}
        {pill("by-teacher", "Theo giáo viên",       <Users className="h-3.5 w-3.5" />)}
      </div>

      {props.scheduleMode === "by-slot"    && <ModeAByTimeSlotV2 {...props} />}
      {props.scheduleMode === "by-revenue" && <ModeRevenueBased  {...props} />}
      {props.scheduleMode === "by-teacher" && <ModeBByTeacher    {...props} />}
    </div>
  );
}

/* ───────────── Score badge helpers ───────────── */

function scoreToneClass(score: number | undefined): string {
  if (score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 3) return "bg-success/15 text-success border border-success/30";
  if (score >= 2) return "bg-primary/10 text-primary border border-primary/20";
  if (score >= 1) return "bg-warning/15 text-warning border border-warning/30";
  return "bg-muted text-muted-foreground border border-border";
}

function ScoreBadge({
  label, value, max, hint, icon,
}: {
  label: string; value?: number; max: number; hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreToneClass(value)}`}
    >
      {icon}
      {label} {value ?? "—"}/{max}
    </span>
  );
}

/* ───────────── MODE A — slot v2 ───────────── */

function ModeAByTimeSlotV2({ classInfo, slot, setSlot, teachers, setTeachers }: Props) {
  const [searchTriggered, setSearchTriggered] = useState(false);

  const params = searchTriggered && slot.weekdays.length > 0
    ? {
        weekdays: slot.weekdays,
        start_time: slot.start_time,
        end_time: slot.end_time,
        mode: slot.mode,
        program_key: classInfo.program || null,
        level_key: classInfo.level || null,
      }
    : null;

  const { data: matched, isFetching, error } = useAvailableTeachersV2(params);

  const toggleWeekday = (wd: number) => {
    const next = slot.weekdays.includes(wd) ? slot.weekdays.filter((x) => x !== wd) : [...slot.weekdays, wd].sort();
    setSlot({ ...slot, weekdays: next });
  };

  const toggleTeacher = (tid: string, full_name: string) => {
    const exists = teachers.find((t) => t.teacher_id === tid);
    if (exists) setTeachers(teachers.filter((t) => t.teacher_id !== tid));
    else setTeachers([...teachers, { teacher_id: tid, full_name, role: teachers.length === 0 ? "primary" : "ta" }]);
  };

  const setRole = (tid: string, role: "primary" | "ta") => {
    setTeachers(teachers.map((t) => (t.teacher_id === tid ? { ...t, role } : t)));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Các thứ trong tuần</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((d) => {
            const checked = slot.weekdays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleWeekday(d.value)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                  checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Giờ bắt đầu</Label>
          <Input type="time" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} />
        </div>
        <div>
          <Label>Giờ kết thúc</Label>
          <Input type="time" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} />
        </div>
        <div>
          <Label>Hình thức</Label>
          <Select value={slot.mode} onValueChange={(v) => setSlot({ ...slot, mode: v as DeliveryMode })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => setSearchTriggered(true)}
        disabled={slot.weekdays.length === 0 || !slot.start_time || !slot.end_time}
      >
        <Search className="h-4 w-4" /> Tìm giáo viên có lịch trùng
      </Button>

      {error && (
        <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>
      )}

      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm…
        </div>
      )}

      {searchTriggered && !isFetching && matched && matched.length === 0 && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          Không có giáo viên rảnh khung này. Thử khung khác hoặc dùng tab "Theo doanh thu".
        </div>
      )}

      {matched && matched.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Sắp xếp theo điểm tổng (capability ×3 + workload + revenue − 5 nếu trùng lịch). Càng cao càng phù hợp.
          </p>
          <div className="border rounded-lg divide-y">
            {matched.map((t: AvailableTeacherV2, idx) => {
              const assigned = teachers.find((x) => x.teacher_id === t.teacher_id);
              const ruleTime = t.rule_start && t.rule_end
                ? `${t.rule_start.slice(0, 5)}–${t.rule_end.slice(0, 5)}`
                : null;
              return (
                <div key={t.teacher_id} className="p-3 flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={!!assigned}
                    onCheckedChange={() => toggleTeacher(t.teacher_id, t.full_name)}
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {idx === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-[10px] font-semibold border border-success/30">
                          <Sparkles className="h-3 w-3" /> Top match
                        </span>
                      )}
                      <span className="font-medium text-sm">{t.full_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Điểm: <strong className="text-foreground tabular-nums">{t.total_score ?? "—"}</strong>
                      </span>
                      {t.has_conflict && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-semibold">
                          <AlertTriangle className="h-3 w-3" /> Trùng lịch
                        </span>
                      )}
                      {t.is_new_teacher && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold border border-primary/20">
                          GV mới
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ScoreBadge
                        label="Năng lực"
                        value={t.capability_match_score}
                        max={3}
                        icon={<Award className="h-3 w-3" />}
                        hint="3 = khớp program + level, 2 = chỉ program, 1 = fuzzy, 0 = chưa khai báo"
                      />
                      <ScoreBadge
                        label="Tải"
                        value={t.workload_score}
                        max={3}
                        hint={`Số buổi 28 ngày tới: ${t.sessions_next_28d ?? 0}. 3 = rất rảnh, 0 = quá tải`}
                      />
                      <ScoreBadge
                        label="Lương 6mo"
                        value={t.revenue_score}
                        max={3}
                        icon={<Wallet className="h-3 w-3" />}
                        hint={`Avg 6 tháng: ${fmtVND(t.avg_gross_vnd_6mo)}/tháng. Càng thấp càng cần thêm lớp.`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ruleTime && <span>Khung rảnh: {ruleTime}</span>}
                      {t.rule_mode && <span> · {t.rule_mode}</span>}
                      {t.email && <span> · {t.email}</span>}
                    </div>
                  </div>
                  {assigned && (
                    <Select value={assigned.role} onValueChange={(v) => setRole(t.teacher_id, v as "primary" | "ta")}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="ta">TA</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!searchTriggered && (
        <p className="text-xs text-muted-foreground">Chọn khung thời gian rồi bấm "Tìm giáo viên" để xem danh sách (có chấm điểm).</p>
      )}
    </div>
  );
}

/* ───────────── MODE Revenue (NEW) ───────────── */

function ModeRevenueBased({ classInfo, teachers, setTeachers, setScheduleMode }: Props) {
  const [filterByProgram, setFilterByProgram] = useState(true);
  const { data, isFetching, error } = useLowestRevenueTeachers({
    limit: 15,
    program_key: filterByProgram && classInfo.program ? classInfo.program : null,
  });

  const pickAndContinue = (teacher_id: string, full_name: string) => {
    if (!teachers.find((t) => t.teacher_id === teacher_id)) {
      setTeachers([
        ...teachers,
        { teacher_id, full_name, role: teachers.length === 0 ? "primary" : "ta" },
      ]);
    }
    setScheduleMode("by-teacher");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
        <p className="font-medium text-foreground inline-flex items-center gap-1">
          <TrendingDown className="h-3.5 w-3.5" /> Suggest theo doanh thu thấp nhất
        </p>
        <p className="text-muted-foreground">
          Danh sách giáo viên có lương trung bình 6 tháng gần nhất (không tính tháng hiện tại) thấp nhất —
          giáo viên mới chưa có bảng lương được ưu tiên đứng đầu. Chọn 1 giáo viên để chuyển sang tab "Theo giáo viên" và xem khung giờ rảnh của họ.
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <Checkbox
          checked={filterByProgram}
          onCheckedChange={(v) => setFilterByProgram(v === true)}
          disabled={!classInfo.program}
        />
        Chỉ hiển thị GV dạy được program <strong className="text-foreground">{classInfo.program || "(chưa chọn)"}</strong>
      </label>

      {error && <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>}

      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      )}

      {!isFetching && data && data.length === 0 && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          Không có giáo viên phù hợp. Bỏ filter program hoặc chọn tab khác.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="border rounded-lg divide-y">
          {data.map((t, idx) => {
            const assigned = teachers.find((x) => x.teacher_id === t.teacher_id);
            return (
              <div key={t.teacher_id} className="p-3 flex items-center gap-3">
                <span className="w-6 text-center text-xs text-muted-foreground tabular-nums font-medium">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{t.full_name}</span>
                    {t.is_new_teacher ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold border border-primary/20">
                        GV mới — chưa có bảng lương
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                        Avg 6mo: {fmtVND(t.avg_gross_vnd_6mo)}
                      </span>
                    )}
                  </div>
                  {t.email && <div className="text-xs text-muted-foreground">{t.email}</div>}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={assigned ? "outline" : "default"}
                  onClick={() => pickAndContinue(t.teacher_id, t.full_name)}
                >
                  {assigned ? "Đã chọn → tiếp tục" : "Chọn"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────── MODE B (unchanged from v1) ───────────── */

function ModeBByTeacher({ classInfo, slot, setSlot, teachers, setTeachers, selectedSlotKeys, setSelectedSlotKeys }: Props) {
  const teachersListQ = useQuery({
    queryKey: ["all-teachers-for-wizard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, status")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const slotsParams = teachers.length > 0 && classInfo.start_date && classInfo.end_date
    ? { teacher_ids: teachers.map((t) => t.teacher_id), from_date: classInfo.start_date, to_date: classInfo.end_date, program_key: classInfo.program || null }
    : null;

  const { data: slots, isFetching } = useTeacherSlots(slotsParams);

  const addTeacher = (tid: string) => {
    if (teachers.find((t) => t.teacher_id === tid)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = (teachersListQ.data || []).find((x: any) => x.id === tid);
    if (!found) return;
    setTeachers([...teachers, { teacher_id: tid, full_name: found.full_name, role: teachers.length === 0 ? "primary" : "ta" }]);
  };

  const removeTeacher = (tid: string) => setTeachers(teachers.filter((t) => t.teacher_id !== tid));

  const setRole = (tid: string, role: "primary" | "ta") => {
    setTeachers(teachers.map((t) => (t.teacher_id === tid ? { ...t, role } : t)));
  };

  const slotKey = (s: { weekday: number; start_time: string; end_time: string; mode?: string | null }) =>
    `${s.weekday}|${s.start_time}|${s.end_time}|${s.mode ?? ""}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleSlot = (s: any) => {
    const k = slotKey(s);
    if (selectedSlotKeys.includes(k)) setSelectedSlotKeys(selectedSlotKeys.filter((x) => x !== k));
    else {
      setSelectedSlotKeys([...selectedSlotKeys, k]);
      setSlot({
        weekdays: Array.from(new Set([...slot.weekdays, s.weekday])).sort(),
        start_time: slot.start_time || s.start_time,
        end_time: slot.end_time || s.end_time,
        mode: (s.mode as DeliveryMode) || slot.mode,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Chọn giáo viên</Label>
        <Select onValueChange={addTeacher} value="">
          <SelectTrigger><SelectValue placeholder="Thêm giáo viên…" /></SelectTrigger>
          <SelectContent>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(teachersListQ.data || []).map((t: any) => (
              <SelectItem key={t.id} value={t.id} disabled={!!teachers.find((x) => x.teacher_id === t.id)}>
                {t.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {teachers.length > 0 && (
        <div className="border rounded-lg divide-y">
          {teachers.map((t) => (
            <div key={t.teacher_id} className="p-3 flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{t.full_name}</span>
              <Select value={t.role} onValueChange={(v) => setRole(t.teacher_id, v as "primary" | "ta")}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="ta">TA</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeTeacher(t.teacher_id)}>Xoá</Button>
            </div>
          ))}
        </div>
      )}

      {teachers.length > 0 && (
        <div>
          <Label className="mb-2 block">
            Khung giờ rảnh {teachers.length > 1 ? `(intersection — ${teachers.length} giáo viên đều rảnh)` : ""}
          </Label>
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải khung giờ…
            </div>
          )}
          {!isFetching && slots && slots.length === 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">Không có khung giờ chung.</div>
          )}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {slots.map((s) => {
                const k = slotKey(s);
                const checked = selectedSlotKeys.includes(k);
                const wdLabel = WEEKDAY_LABELS.find((x) => x.value === s.weekday)?.label ?? `Wd${s.weekday}`;
                return (
                  <label key={k} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${checked ? "border-primary bg-primary/5" : ""}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleSlot(s)} />
                    <span className="text-sm">
                      <span className="font-medium">{wdLabel}</span> {s.start_time}–{s.end_time}
                      {s.mode && <span className="text-muted-foreground ml-2">({s.mode})</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

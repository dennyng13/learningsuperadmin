import { useState } from "react";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Button } from "@shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Loader2, Search, Users } from "lucide-react";
import { useAvailableTeachers } from "@shared/hooks/useAvailableTeachers";
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

export default function Step2Schedule(props: Props) {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={props.scheduleMode === "by-slot" ? "default" : "outline"}
          onClick={() => props.setScheduleMode("by-slot")}
        >
          Theo khung thời gian
        </Button>
        <Button
          type="button"
          variant={props.scheduleMode === "by-teacher" ? "default" : "outline"}
          onClick={() => props.setScheduleMode("by-teacher")}
        >
          Theo giáo viên
        </Button>
      </div>

      {props.scheduleMode === "by-slot"
        ? <ModeAByTimeSlot {...props} />
        : <ModeBByTeacher {...props} />}
    </div>
  );
}

/* ───────────── MODE A ───────────── */
function ModeAByTimeSlot({ classInfo, slot, setSlot, teachers, setTeachers }: Props) {
  const [searchTriggered, setSearchTriggered] = useState(false);

  const params = searchTriggered && slot.weekdays.length > 0
    ? {
        weekdays: slot.weekdays,
        start_time: slot.start_time,
        end_time: slot.end_time,
        mode: slot.mode,
        program_key: classInfo.program || null,
      }
    : null;

  const { data: matched, isFetching, error } = useAvailableTeachers(params);

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
          Không có giáo viên rảnh khung này. Thử khung khác.
        </div>
      )}

      {matched && matched.length > 0 && (
        <div className="border rounded-lg divide-y">
          {matched.map((t) => {
            const assigned = teachers.find((x) => x.teacher_id === t.teacher_id);
            return (
              <div key={t.teacher_id} className="p-3 flex items-center gap-3">
                <Checkbox checked={!!assigned} onCheckedChange={() => toggleTeacher(t.teacher_id, t.full_name)} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{t.full_name}</div>
                  {t.matching_reasons && t.matching_reasons.length > 0 && (
                    <div className="text-xs text-muted-foreground">{t.matching_reasons.join(" · ")}</div>
                  )}
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
      )}

      {!searchTriggered && (
        <p className="text-xs text-muted-foreground">Chọn khung thời gian rồi bấm "Tìm giáo viên" để xem danh sách.</p>
      )}
    </div>
  );
}

/* ───────────── MODE B ───────────── */
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

  const toggleSlot = (s: any) => {
    const k = slotKey(s);
    if (selectedSlotKeys.includes(k)) setSelectedSlotKeys(selectedSlotKeys.filter((x) => x !== k));
    else {
      setSelectedSlotKeys([...selectedSlotKeys, k]);
      // Sync into wizard slot (use first selected to drive sessions)
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
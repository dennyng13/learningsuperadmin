import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { useAuth } from "@shared/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { Badge } from "@shared/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Users, UserCheck, Loader2, Search, X, Check, Calendar,
} from "lucide-react";

const PROGRAMS = [
  { value: "IELTS", label: "IELTS" },
  { value: "WRE", label: "WRE" },
  { value: "Customized", label: "Customized" },
];

const WEEKDAYS = [
  { key: "mon", label: "T2" },
  { key: "tue", label: "T3" },
  { key: "wed", label: "T4" },
  { key: "thu", label: "T5" },
  { key: "fri", label: "T6" },
  { key: "sat", label: "T7" },
  { key: "sun", label: "CN" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

interface TeacherOpt { id: string; full_name: string }
interface StudentOpt { id: string; teachngo_id: string; full_name: string }

function countSessionsBetween(start: string, end: string, days: string[]): number {
  if (!start || !end || days.length === 0) return 0;
  const targetDays = new Set(days.map(d => DAY_MAP[d]).filter(d => d !== undefined));
  let count = 0;
  const cur = new Date(start + "T00:00:00");
  const endD = new Date(end + "T00:00:00");
  while (cur <= endD) {
    if (targetDays.has(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const DAY_MAP: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
const DAY_LABELS: Record<string, string> = { mon: "T2", tue: "T3", wed: "T4", thu: "T5", fri: "T6", sat: "T7", sun: "CN" };

function generateScheduledDates(totalSessions: number, days: string[], start: string): string[] {
  const targetDays = days.map(d => DAY_MAP[d]).filter(d => d !== undefined);
  if (targetDays.length === 0 || !start) return [];
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const maxIterations = totalSessions * 10;
  let iterations = 0;
  while (dates.length < totalSessions && iterations < maxIterations) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    if (targetDays.includes(current.getDay())) {
      dates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
    iterations++;
  }
  return dates;
}

function dayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
}

export default function CreateClassDialog({ open, onOpenChange, onCreated }: Props) {
  const { levels } = useCourseLevels();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Form state
  const [classType, setClassType] = useState<"group" | "private">("group");
  const [className, setClassName] = useState("");
  const [level, setLevel] = useState("");
  const [program, setProgram] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [room, setRoom] = useState("");
  const [manualSessions, setManualSessions] = useState<string>("");

  // Data
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOpt[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]); // teachngo_ids
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [tRes, sRes] = await Promise.all([
        supabase.from("teachers").select("id, full_name").order("full_name"),
        (supabase as any).from("synced_students" as any).select("id, teachngo_id, full_name").eq("is_active", true).order("full_name"),
      ]);
      if (tRes.data) setTeachers((tRes.data as any[]).filter(t => t.full_name && !t.full_name.startsWith("Teacher #")));
      if (sRes.data) setAllStudents(sRes.data as StudentOpt[]);
    })();
  }, [open]);

  const resetForm = () => {
    setClassType("group");
    setClassName("");
    setLevel("");
    setProgram("");
    setTeacherId("");
    setScheduleDays([]);
    setScheduleTime("");
    setStartDate("");
    setEndDate("");
    setRoom("");
    setManualSessions("");
    setSelectedStudents([]);
    setStudentSearch("");
  };

  const autoSessions = useMemo(() =>
    countSessionsBetween(startDate, endDate, scheduleDays),
    [startDate, endDate, scheduleDays]
  );

  const totalSessions = manualSessions ? parseInt(manualSessions) || 0 : autoSessions;

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return allStudents.slice(0, 50);
    return allStudents.filter(s => s.full_name.toLowerCase().includes(q)).slice(0, 50);
  }, [allStudents, studentSearch]);

  const toggleDay = (key: string) => {
    setScheduleDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };

  const toggleStudent = (teachngoId: string) => {
    if (classType === "private") {
      const newSelection = selectedStudents.includes(teachngoId) ? [] : [teachngoId];
      setSelectedStudents(newSelection);
      // Auto-fill class name for private
      if (newSelection.length === 1) {
        const student = allStudents.find(s => s.teachngo_id === newSelection[0]);
        if (student) setClassName(`Private — ${student.full_name}`);
      } else {
        setClassName("");
      }
    } else {
      setSelectedStudents(prev =>
        prev.includes(teachngoId) ? prev.filter(id => id !== teachngoId) : [...prev, teachngoId]
      );
    }
  };

  const handleSave = async () => {
    if (!className.trim()) { toast.error("Vui lòng nhập tên lớp"); return; }
    if (!teacherId) { toast.error("Vui lòng chọn giáo viên"); return; }

    setSaving(true);
    try {
      const scheduleStr = scheduleDays.length > 0
        ? WEEKDAYS.filter(w => scheduleDays.includes(w.key)).map(w => w.label).join(", ") + (scheduleTime ? ` (${scheduleTime})` : "")
        : null;

      const selectedTeacher = teachers.find(t => t.id === teacherId);
      const effectiveLevel = level && level !== "__none__" ? level : null;
      const effectiveProgram = program && program !== "__none__" ? program : null;

      // 1. Create class
      const { data: newClass, error } = await (supabase as any)
        .from("classes")
        .insert({
          teachngo_class_id: `LP-${Date.now()}`,
          class_name: className.trim(),
          course_title: effectiveProgram,
          teacher_name: selectedTeacher?.full_name || null,
          teacher_id: teacherId,
          class_type: classType,
          data_source: "manual",
          level: effectiveLevel,
          program: effectiveProgram,
          schedule: scheduleStr,
          start_date: startDate || null,
          end_date: endDate || null,
          room: room.trim() || null,
          max_students: classType === "private" ? 1 : null,
          status: "active",
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // 2. Enroll students
      if (selectedStudents.length > 0 && newClass) {
        const rows = selectedStudents.map(sid => ({
          class_id: newClass.id,
          teachngo_student_id: sid,
          status: "enrolled",
          enrollment_date: startDate || new Date().toISOString().slice(0, 10),
        }));
        await (supabase as any).from("class_students" as any).insert(rows);
      }

      // 3. Auto-create study plan
      if (newClass && scheduleDays.length > 0 && startDate && totalSessions > 0) {
        const scheduleDates = generateScheduledDates(totalSessions, scheduleDays, startDate);

        const { data: plan, error: planError } = await supabase
          .from("study_plans")
          .insert({
            plan_name: `Kế hoạch — ${className.trim()}`,
            program: effectiveProgram,
            plan_type: "structured",
            class_ids: [newClass.id],
            total_sessions: totalSessions,
            session_duration: 90,
            assigned_level: effectiveLevel,
            student_ids: selectedStudents,
            schedule_pattern: { type: "weekly", days: scheduleDays },
            start_date: startDate,
            end_date: endDate || (scheduleDates.length > 0 ? scheduleDates[scheduleDates.length - 1] : null),
            created_by: user?.id || null,
          } as any)
          .select("id")
          .single();

        if (!planError && plan) {
          // 4. Create session entries
          const entries = scheduleDates.map((date, idx) => ({
            plan_id: plan.id,
            entry_date: date,
            day_of_week: dayOfWeek(date),
            session_number: idx + 1,
            session_title: `Buổi ${idx + 1}`,
            skills: [] as string[],
            homework: "",
            session_type: "Study",
          }));

          if (entries.length > 0) {
            await supabase.from("study_plan_entries").insert(entries as any);
          }

          // 5. Link class → plan
          await (supabase as any)
            .from("classes")
            .update({ study_plan_id: plan.id } as any)
            .eq("id", newClass.id);
        }
      }

      toast.success(`Đã tạo lớp "${className.trim()}"${scheduleDays.length > 0 && startDate && totalSessions > 0 ? " + kế hoạch học tập" : ""}`);
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(`Lỗi tạo lớp: ${err.message}`);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Tạo lớp mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Class Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Loại lớp</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "group" as const, label: "Lớp nhóm", icon: Users, desc: "Nhiều học viên" },
                { value: "private" as const, label: "1-1 (Private)", icon: UserCheck, desc: "1 học viên" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setClassType(opt.value);
                    if (opt.value === "private" && selectedStudents.length > 1) {
                      setSelectedStudents(selectedStudents.slice(0, 1));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    classType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    classType === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}>
                    <opt.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Class Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tên lớp <span className="text-destructive">*</span></Label>
            <Input
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder={classType === "private" ? "VD: Private - Nguyễn Văn A" : "VD: IELTS Intermediate A"}
            />
          </div>

          {/* Level + Program */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="Chọn level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Không --</SelectItem>
                  {levels.map(l => (
                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Chương trình</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger><SelectValue placeholder="Chọn CT" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Không --</SelectItem>
                  {PROGRAMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Teacher */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Giáo viên <span className="text-destructive">*</span></Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Chọn giáo viên" /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Lịch học</Label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WEEKDAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  className={cn(
                    "w-9 h-9 rounded-full text-xs font-semibold border-2 transition-all",
                    scheduleDays.includes(d.key)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <Input
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
              placeholder="Giờ học (VD: 18:00-19:30)"
              className="mt-1"
            />
          </div>

          {/* Dates + Room */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ngày bắt đầu</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ngày kết thúc</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Phòng</Label>
              <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="VD: Room 3A" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Số buổi</Label>
              <Input
                type="number"
                value={manualSessions}
                onChange={e => setManualSessions(e.target.value)}
                placeholder={autoSessions > 0 ? `Tự động: ${autoSessions}` : "Nhập số buổi"}
              />
              {autoSessions > 0 && !manualSessions && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Tự tính: {autoSessions} buổi
                </p>
              )}
            </div>
          </div>

          {/* Student picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Chọn học viên
              {classType === "private" && <span className="text-muted-foreground font-normal ml-1">(tối đa 1)</span>}
            </Label>

            {/* Selected badges */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedStudents.map(sid => {
                  const s = allStudents.find(st => st.teachngo_id === sid);
                  return (
                    <Badge key={sid} variant="secondary" className="text-xs gap-1 pr-1">
                      {s?.full_name || sid}
                      <button onClick={() => toggleStudent(sid)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Tìm học viên..."
                className="pl-9"
              />
            </div>

            {/* List */}
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Không tìm thấy học viên</p>
              ) : (
                filteredStudents.map(s => {
                  const selected = selectedStudents.includes(s.teachngo_id);
                  const disabled = classType === "private" && selectedStudents.length >= 1 && !selected;
                  return (
                    <button
                      key={s.teachngo_id}
                      onClick={() => !disabled && toggleStudent(s.teachngo_id)}
                      disabled={disabled}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                        selected ? "bg-primary/5" : "hover:bg-muted",
                        disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        selected ? "bg-primary border-primary" : "border-border"
                      )}>
                        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="truncate">{s.full_name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Summary */}
          {(className.trim() || selectedStudents.length > 0) && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Tóm tắt</p>
              <p>{classType === "private" ? "Lớp 1-1" : "Lớp nhóm"} • {selectedStudents.length} học viên{totalSessions > 0 ? ` • ${totalSessions} buổi` : ""}</p>
              {level && level !== "__none__" && <p>Level: {level}</p>}
              {program && program !== "__none__" && <p>Chương trình: {program}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving || !className.trim() || !teacherId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Tạo lớp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

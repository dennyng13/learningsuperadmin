import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Step1ClassInfo from "../components/wizard/Step1ClassInfo";
import Step2Schedule from "../components/wizard/Step2Schedule";
import Step3RoomPicker from "../components/wizard/Step3RoomPicker";
import Step3Sessions from "../components/wizard/Step3Sessions";
import Step4Confirm from "../components/wizard/Step4Confirm";
import {
  AssignedTeacher, DraftSession, EMPTY_CLASS_INFO, generateSessions,
  ScheduleMode, WEEKDAY_KEY_MAP, WizardClassInfo, WizardSlot,
} from "../components/wizard/wizardTypes";
import { useCreateClass } from "@shared/hooks/useCreateClass";
import { useCreateClassWithTemplate } from "@shared/hooks/useCreateClassWithTemplate";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  { id: 1, title: "Thông tin lớp" },
  { id: 2, title: "Lịch & Giáo viên" },
  { id: 3, title: "Phòng học" },
  { id: 4, title: "Preview buổi học" },
  { id: 5, title: "Xác nhận" },
];

export default function CreateClassWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [classInfo, setClassInfo] = useState<WizardClassInfo>(EMPTY_CLASS_INFO);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("by-slot");
  const [slot, setSlot] = useState<WizardSlot>({ weekdays: [], start_time: "19:00", end_time: "20:30", mode: "hybrid" });
  const [teachers, setTeachers] = useState<AssignedTeacher[]>([]);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [sessions, setSessions] = useState<DraftSession[]>([]);

  const createMutation = useCreateClass();
  const createWithTemplateMutation = useCreateClassWithTemplate();

  const isDirty = useMemo(() => {
    return (
      classInfo.class_name !== "" || classInfo.program !== "" || teachers.length > 0 || sessions.length > 0
    );
  }, [classInfo, teachers, sessions]);

  /* Auto-generate sessions when entering Step 3 (Room Picker). Step 3 needs
     sessions to run batch conflict check against rooms. Step 4 (Sessions
     Preview) reuses already-generated array. */
  useEffect(() => {
    if (step !== 3) return;
    if (teachers.length === 0) return;
    const primary = teachers.find((t) => t.role === "primary") ?? teachers[0];
    const generated = generateSessions(
      classInfo.start_date, classInfo.end_date, slot.weekdays,
      slot.start_time, slot.end_time, slot.mode, classInfo.room,
      primary.teacher_id,
    );
    setSessions(generated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ──────────── Step validators ──────────── */
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!classInfo.class_name.trim()) e.class_name = "Bắt buộc";
    if (!classInfo.program) e.program = "Bắt buộc";
    if (!classInfo.start_date) e.start_date = "Bắt buộc";
    if (!classInfo.end_date) e.end_date = "Bắt buộc";
    if (classInfo.start_date && classInfo.end_date && new Date(classInfo.end_date) <= new Date(classInfo.start_date)) {
      e.end_date = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (classInfo.start_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(classInfo.start_date) < today) e.start_date = "Ngày bắt đầu phải >= hôm nay";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    if (teachers.length === 0) {
      toast.error("Cần chọn ít nhất 1 giáo viên");
      return false;
    }
    if (!teachers.some((t) => t.role === "primary")) {
      toast.error("Cần ít nhất 1 giáo viên Primary");
      return false;
    }
    if (slot.weekdays.length === 0) {
      toast.error("Cần chọn ít nhất 1 thứ trong tuần");
      return false;
    }
    return true;
  };

  // Step 3 (room picker) — room is optional, skipping is allowed.
  const validateStep3 = () => true;

  const validateStep4 = () => {
    const active = sessions.filter((s) => !s.cancelled);
    if (active.length === 0) {
      toast.error("Cần ít nhất 1 buổi học");
      return false;
    }
    if (active.some((s) => !s.teacher_id)) {
      toast.error("Có buổi chưa gán giáo viên");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;
    setStep((s) => (Math.min(5, s + 1) as 1 | 2 | 3 | 4 | 5));
  };

  const goBack = () => setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5));

  const handleCancel = () => {
    if (isDirty && !confirm("Bạn có dữ liệu chưa lưu. Hủy?")) return;
    navigate("/classes");
  };

  /* Build p_class_data common to both submission paths. study_plan_id is
     intentionally excluded — with-template path leaves the wrapper RPC to set
     it; without-template path adds it back as null below. */
  const buildClassData = () => ({
    class_name: classInfo.class_name,
    course_title: classInfo.course_title || null,
    program: classInfo.program,
    level: classInfo.level || null,
    class_type: classInfo.class_type,
    start_date: classInfo.start_date,
    end_date: classInfo.end_date,
    default_start_time: slot.start_time,
    default_end_time: slot.end_time,
    room: classInfo.room || null,
    max_students: classInfo.max_students,
    description: classInfo.description || null,
    leaderboard_enabled: classInfo.leaderboard_enabled,
  });

  const handleSubmit = async () => {
    const active = sessions.filter((s) => !s.cancelled);
    const primaryIds = teachers.filter((t) => t.role === "primary").map((t) => t.teacher_id);
    const taIds      = teachers.filter((t) => t.role === "ta").map((t) => t.teacher_id);
    const sessionsPayload = active.map((s) => ({
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      mode: s.mode,
      room: s.room || null,
      teacher_id: s.teacher_id,
    }));

    try {
      let newClassId: string | null = null;

      if (classInfo.study_plan_id) {
        // WITH TEMPLATE — atomic wrapper (creates class + clones template + links).
        const days = slot.weekdays.map((n) => WEEKDAY_KEY_MAP[n]).filter(Boolean);
        if (days.length === 0) {
          toast.error("Vui lòng chọn ít nhất 1 ngày trong tuần");
          return;
        }
        newClassId = await createWithTemplateMutation.mutateAsync({
          p_class_data: buildClassData(),
          p_template_id: classInfo.study_plan_id,
          p_start_date: classInfo.start_date,
          p_end_date: classInfo.end_date,
          p_schedule_pattern: { type: "weekly", days },
          p_primary_teacher_ids: primaryIds,
          p_ta_teacher_ids: taIds,
          p_sessions: sessionsPayload,
        });
      } else {
        // WITHOUT TEMPLATE — Customized fallback to original RPC.
        const result = await createMutation.mutateAsync({
          p_class_data: { ...buildClassData(), study_plan_id: null },
          p_primary_teacher_ids: primaryIds,
          p_ta_teacher_ids: taIds,
          p_sessions: sessionsPayload,
        });
        newClassId = result?.class_id ?? null;
      }

      toast.success(`Đã tạo lớp "${classInfo.class_name}" với ${teachers.length} giáo viên + ${active.length} buổi`);

      // Stage P1 — set a sensible default respond_deadline for every newly-created
      // pending invitation: 7 days before class start, but at least 24h from now.
      // Failures here are non-fatal (admin can still set deadline manually in
      // ClassInvitationsDialog).
      if (newClassId && classInfo.start_date) {
        try {
          const startMs = new Date(classInfo.start_date + "T00:00:00").getTime();
          if (!Number.isNaN(startMs)) {
            const minDeadlineMs = Date.now() + 24 * 60 * 60 * 1000;
            const desiredDeadlineMs = startMs - 7 * 24 * 60 * 60 * 1000;
            const deadlineMs = Math.max(minDeadlineMs, desiredDeadlineMs);
            const deadlineIso = new Date(deadlineMs).toISOString();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: invs } = await (supabase.from as any)("class_invitations")
              .select("id")
              .eq("class_id", newClassId)
              .eq("status", "pending");
            await Promise.all(
              (invs ?? []).map((row: { id: string }) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase.rpc as any)("set_invitation_deadline", {
                  p_invitation_id: row.id,
                  p_deadline: deadlineIso,
                }),
              ),
            );
          }
        } catch {
          // best-effort; ignore
        }
      }

      // Stage P2 — best-effort link class to course via dedicated RPC.
      // set_class_course_id only writes course_id (no side effects on
      // study_plan_id or price_vnd_override). Admin can override via
      // SettingsTab > Cấu hình. Currently only IELTS classes have course_id
      // (verified Lovable Q5: WRE + Customized have 0 courses).
      if (newClassId && classInfo.course_id) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.rpc as any)("set_class_course_id", {
            p_class_id: newClassId,
            p_course_id: classInfo.course_id,
          });
        } catch {
          // best-effort; admin có thể set qua SettingsTab
        }
      }

      // Stage P1 — best-effort auto-send invitation emails. Cron at 07:05 ICT
      // serves as safety net for any failures here. Admin can also manually
      // resend via LifecycleTab > "Quản lý lời mời".
      if (newClassId) {
        try {
          await supabase.functions.invoke("send-class-invitations", {
            body: { class_id: newClassId },
          });
        } catch {
          // best-effort; ignore
        }
      }

      navigate("/classes");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tạo lớp", { duration: 6000 });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold">Tạo lớp mới</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Bước {step}/4 — {STEPS[step - 1].title}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCancel}>Hủy</Button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex-1 flex items-center gap-2">
              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                done ? "bg-primary text-primary-foreground" : active ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span className={`text-xs ${active ? "font-semibold" : "text-muted-foreground"} hidden sm:inline`}>{s.title}</span>
              {idx < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${done ? "bg-primary" : "bg-muted"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="border rounded-xl bg-card p-4 md:p-6 min-h-[300px]">
        {step === 1 && <Step1ClassInfo value={classInfo} onChange={setClassInfo} errors={errors} />}
        {step === 2 && (
          <Step2Schedule
            classInfo={classInfo}
            scheduleMode={scheduleMode}
            setScheduleMode={setScheduleMode}
            slot={slot}
            setSlot={setSlot}
            teachers={teachers}
            setTeachers={setTeachers}
            selectedSlotKeys={selectedSlotKeys}
            setSelectedSlotKeys={setSelectedSlotKeys}
          />
        )}
        {step === 3 && (
          <Step3RoomPicker
            value={classInfo}
            onChange={setClassInfo}
            slot={slot}
            sessions={sessions}
            errors={errors}
          />
        )}
        {step === 4 && <Step3Sessions sessions={sessions} setSessions={setSessions} teachers={teachers} />}
        {step === 5 && <Step4Confirm classInfo={classInfo} teachers={teachers} sessions={sessions} />}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || createMutation.isPending || createWithTemplateMutation.isPending}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>
        {step < 5 ? (
          <Button type="button" onClick={goNext}>
            Tiếp tục <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending || createWithTemplateMutation.isPending}>
            {(createMutation.isPending || createWithTemplateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Tạo lớp
          </Button>
        )}
      </div>
    </div>
  );
}
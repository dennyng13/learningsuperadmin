import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Step1ClassInfo from "../components/wizard/Step1ClassInfo";
import Step2Schedule from "../components/wizard/Step2Schedule";
import Step3RoomPicker from "../components/wizard/Step3RoomPicker";
import Step3Sessions from "../components/wizard/Step3Sessions";
import Step4Confirm from "../components/wizard/Step4Confirm";
import {
  AssignedTeacher, computeEndDateForSessions, computeStartDateForSessions,
  DraftSession, EMPTY_CLASS_INFO, generateSessions,
  ScheduleMode, WEEKDAY_KEY_MAP, WizardClassInfo, WizardSlot,
} from "../components/wizard/wizardTypes";
import { useCreateClass } from "@shared/hooks/useCreateClass";
import { useCreateClassWithTemplate } from "@shared/hooks/useCreateClassWithTemplate";
import { useStudyPlanTemplates } from "@shared/hooks/useStudyPlanTemplates";
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
  const [slot, setSlot] = useState<WizardSlot>({ weekdays: [], start_time: "19:00", end_time: "21:00", mode: "hybrid" });
  const [teachers, setTeachers] = useState<AssignedTeacher[]>([]);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [sessions, setSessions] = useState<DraftSession[]>([]);

  // Confirm gate state khi số buổi generated ≠ study_plan.total_sessions.
  // Reset confirmedMismatch khi user goBack để force re-confirm sau khi sửa.
  const [showMismatchConfirm, setShowMismatchConfirm] = useState(false);
  const [confirmedMismatch, setConfirmedMismatch] = useState(false);

  // Auto-calc end_date từ template.total_sessions + start_date + slot.weekdays.
  // Reset khi user đổi template. Set TRUE khi user manual edit end_date Input.
  const [endDateManuallyOverridden, setEndDateManuallyOverridden] = useState(false);

  // Confirm dialog state khi user manual edit end_date sau auto-calc.
  // pendingEndDate = giá trị user vừa nhập, chờ user quyết "đổi start" hay "giữ start".
  // previousEndDate = giá trị end_date trước khi user edit, dùng để revert nếu user Cancel.
  const [showEndDateChangeConfirm, setShowEndDateChangeConfirm] = useState(false);
  const [pendingEndDate, setPendingEndDate] = useState<string | null>(null);
  const [previousEndDate, setPreviousEndDate] = useState<string | null>(null);

  const createMutation = useCreateClass();
  const createWithTemplateMutation = useCreateClassWithTemplate();
  const { data: allTemplates } = useStudyPlanTemplates();

  // Issue #C1+#C4 architectural redesign: template = total HOURS (not session count).
  // Wizard adapts session count to slot duration via:
  //   totalMinutes = total_sessions × session_duration
  //   requiredSessions = ceil(totalMinutes / slotDurationMinutes)
  // Slot duration changes (start/end_time) → expectedSessions recomputes → auto-calc
  // useEffect re-fires with new expectedSessions → end_date updates accordingly.
  const slotDurationMinutes = useMemo(() => {
    if (!slot.start_time || !slot.end_time) return 0;
    const [sh, sm] = slot.start_time.split(":").map(Number);
    const [eh, em] = slot.end_time.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
    return (eh * 60 + em) - (sh * 60 + sm);
  }, [slot.start_time, slot.end_time]);

  // planTotalHours — exposed for Step2 display transparency (breakdown text).
  const planTotalHours = useMemo(() => {
    if (!classInfo.study_plan_id || !allTemplates) return null;
    const tpl = allTemplates.find((t) => t.id === classInfo.study_plan_id);
    if (!tpl) return null;
    return (tpl.total_sessions * tpl.session_duration) / 60;
  }, [classInfo.study_plan_id, allTemplates]);

  // expectedSessions = REQUIRED số buổi wizard cần generate (hours-adjusted).
  // null khi không có study_plan_id (Customized class) — skip mismatch check.
  // Fallback to raw total_sessions khi slotDurationMinutes chưa available.
  const expectedSessions = useMemo(() => {
    if (!classInfo.study_plan_id || !allTemplates) return null;
    const tpl = allTemplates.find((t) => t.id === classInfo.study_plan_id);
    if (!tpl) return null;
    const totalMinutes = tpl.total_sessions * tpl.session_duration;
    if (slotDurationMinutes <= 0) return tpl.total_sessions;
    return Math.ceil(totalMinutes / slotDurationMinutes);
  }, [classInfo.study_plan_id, allTemplates, slotDurationMinutes]);

  // Auto-calc end_date khi inputs thay đổi (skip nếu user đã override).
  // Deps loại classInfo.end_date để tránh loop (effect tự set field này).
  useEffect(() => {
    if (endDateManuallyOverridden) return;
    if (!expectedSessions || !classInfo.start_date || slot.weekdays.length === 0) return;
    const calc = computeEndDateForSessions(classInfo.start_date, slot.weekdays, expectedSessions);
    if (calc !== classInfo.end_date) {
      setClassInfo((prev) => ({ ...prev, end_date: calc }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedSessions, classInfo.start_date, slot.weekdays, endDateManuallyOverridden]);

  // Reset override flag khi user đổi template (expect re-calc theo plan mới).
  useEffect(() => {
    setEndDateManuallyOverridden(false);
  }, [classInfo.study_plan_id]);

  /* End-date change handler — gọi từ Step1ClassInfo qua callback. Nếu auto-calc
     đang active (chưa override + có template + có weekdays) → capture previous
     end_date + mở confirm dialog. Else → update direct + mark override. */
  const handleEndDateChange = (newDate: string) => {
    if (!endDateManuallyOverridden && expectedSessions != null && slot.weekdays.length > 0) {
      setPendingEndDate(newDate);
      setPreviousEndDate(classInfo.end_date);
      setShowEndDateChangeConfirm(true);
      return;
    }
    setClassInfo((prev) => ({ ...prev, end_date: newDate }));
    setEndDateManuallyOverridden(true);
  };

  const closeConfirmDialog = () => {
    setShowEndDateChangeConfirm(false);
    setPendingEndDate(null);
    setPreviousEndDate(null);
  };

  const confirmChangeStartDate = () => {
    if (!pendingEndDate || expectedSessions == null) return;
    const newStart = computeStartDateForSessions(pendingEndDate, slot.weekdays, expectedSessions);
    setClassInfo((prev) => ({ ...prev, start_date: newStart, end_date: pendingEndDate }));
    // KHÔNG mark override — auto-calc invariant valid (start + N sessions = end)
    closeConfirmDialog();
  };

  const confirmKeepStartDate = () => {
    if (!pendingEndDate) return;
    setClassInfo((prev) => ({ ...prev, end_date: pendingEndDate }));
    setEndDateManuallyOverridden(true);
    closeConfirmDialog();
  };

  const cancelEndDateChange = () => {
    // Explicit revert end_date về giá trị auto-calc trước khi user edit (D4).
    if (previousEndDate !== null) {
      setClassInfo((prev) => ({ ...prev, end_date: previousEndDate }));
    }
    closeConfirmDialog();
  };

  const resetEndDateAuto = () => setEndDateManuallyOverridden(false);

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
      slot.start_time, slot.end_time, slot.mode,
      primary.teacher_id,
      expectedSessions ?? undefined,
    );
    setSessions(generated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ──────────── Step validators ──────────── */
  const validateStep1 = () => {
    // Issue #1 fix Day 6: end_date không còn bắt buộc ở Step 1.
    // Sau Phase F2.1 move (study_plan dropdown sang Step 2), việc force end_date
    // ở Step 1 KHÔNG có template context → user buộc phải đoán → set override flag.
    // Move end_date check sang validateStep2 — khi đó user đã có template +
    // weekdays để auto-calc có thể fire.
    const e: Record<string, string> = {};
    if (!classInfo.class_name.trim()) e.class_name = "Bắt buộc";
    if (!classInfo.program) e.program = "Bắt buộc";
    if (!classInfo.start_date) e.start_date = "Bắt buộc";
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
    // Issue #1 fix Day 6: end_date checks moved here from validateStep1.
    // By Step 2, user has template+weekdays → auto-calc populates end_date.
    // If template skipped (customized), user enters manually.
    if (!classInfo.end_date) {
      toast.error("Cần thiết lập ngày kết thúc (chọn Study Plan template hoặc nhập thủ công)");
      return false;
    }
    if (classInfo.start_date && new Date(classInfo.end_date) <= new Date(classInfo.start_date)) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
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

  const goBack = () => {
    // Reset confirm flag — user có thể sửa lịch/sessions thay đổi count buổi.
    setConfirmedMismatch(false);
    setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5));
  };

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
    // Issue #2 fix Day 6: persist course_id qua RPC payload thay vì best-effort
    // post-create set_class_course_id (đã silent-fail → tất cả app_classes.course_id
    // NULL → derive_course_abbr fallback 'CLS'). Backend RPC cần honor field này.
    course_id: classInfo.course_id || null,
    program: classInfo.program,
    level: classInfo.level || null,
    class_type: classInfo.class_type,
    start_date: classInfo.start_date,
    end_date: classInfo.end_date,
    default_start_time: slot.start_time,
    default_end_time: slot.end_time,
    max_students: classInfo.max_students,
    description: classInfo.description || null,
    leaderboard_enabled: classInfo.leaderboard_enabled,
  });

  const handleSubmit = async () => {
    const active = sessions.filter((s) => !s.cancelled);
    // Mismatch gate: chỉ check khi có study plan + expected count + chưa confirm.
    // Customized class (no study plan) bypass — không có baseline để so sánh.
    if (
      expectedSessions != null &&
      active.length !== expectedSessions &&
      !confirmedMismatch
    ) {
      setShowMismatchConfirm(true);
      return;
    }
    await executeSubmit();
  };

  const executeSubmit = async () => {
    const active = sessions.filter((s) => !s.cancelled);
    const primaryIds = teachers.filter((t) => t.role === "primary").map((t) => t.teacher_id);
    const taIds      = teachers.filter((t) => t.role === "ta").map((t) => t.teacher_id);
    const sessionsPayload = active.map((s) => ({
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      mode: s.mode,
      room: s.room || null,
      room_id: classInfo.room_id,
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
      // Issue #A5.1 fix: format teacher conflict RPC error với gợi ý.
      // Raw RPC error: "Teacher [UUID] has conflicting session on YYYY-MM-DD (HH:MM:SS - HH:MM:SS)"
      // → User-friendly: "Giáo viên [Tên] bị trùng lịch ngày DD/MM (HH:MM-HH:MM). Gợi ý: ..."
      const rawMsg = err?.message || "";
      const conflictMatch = rawMsg.match(
        /Teacher ([\w-]+) has conflicting session on (\d{4}-\d{2}-\d{2}) \((\d{2}:\d{2}):\d{2} - (\d{2}:\d{2}):\d{2}\)/,
      );
      if (conflictMatch) {
        const [, teacherUuid, dateIso, startHm, endHm] = conflictMatch;
        const teacherName = teachers.find((t) => t.teacher_id === teacherUuid)?.full_name || "Không rõ";
        const dateVN = new Date(dateIso + "T00:00:00").toLocaleDateString("vi-VN");
        toast.error(
          `Giáo viên ${teacherName} bị trùng lịch ngày ${dateVN} (${startHm}–${endHm}).\n\nGợi ý:\n• Quay lại Step 2 chọn giáo viên khác\n• Đổi giờ học\n• Đổi ngày bắt đầu`,
          { duration: 10000 },
        );
        return;
      }
      toast.error(rawMsg || "Lỗi tạo lớp", { duration: 6000 });
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
        {step === 1 && (
          <Step1ClassInfo
            value={classInfo}
            onChange={setClassInfo}
            errors={errors}
          />
        )}
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
            setStudyPlanId={(id) => setClassInfo((prev) => ({ ...prev, study_plan_id: id }))}
            expectedSessions={expectedSessions}
            planTotalHours={planTotalHours}
            slotDurationMinutes={slotDurationMinutes}
            endDateManuallyOverridden={endDateManuallyOverridden}
            onEndDateChange={handleEndDateChange}
            onEndDateAutoReset={resetEndDateAuto}
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

      {/* Confirm gate khi số buổi generated ≠ study_plan.total_sessions. */}
      <AlertDialog open={showMismatchConfirm} onOpenChange={setShowMismatchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Số buổi không khớp với Study Plan</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {(() => {
                  const generated = sessions.filter((s) => !s.cancelled).length;
                  const expected = expectedSessions ?? 0;
                  const diff = generated - expected;
                  return (
                    <>
                      <p>
                        Study plan đã chọn có <strong>{expected} buổi expected</strong>,
                        nhưng lớp được generate <strong>{generated} buổi</strong>.
                      </p>
                      <div className="text-sm space-y-1 mt-2">
                        <div>
                          Khác biệt:{" "}
                          <strong className={diff > 0 ? "text-blue-600" : "text-amber-600"}>
                            {diff > 0 ? "+" : ""}{diff} buổi
                          </strong>
                        </div>
                        <div>
                          Thời gian: <strong>{classInfo.start_date}</strong> → <strong>{classInfo.end_date}</strong>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        💡 Bạn có thể quay lại Step 2 để sửa start/end_date hoặc weekdays để khớp số buổi expected.
                      </p>
                    </>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowMismatchConfirm(false);
                setStep(2);
              }}
            >
              Quay lại Step 2 sửa lịch
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmedMismatch(true);
                setShowMismatchConfirm(false);
                await executeSubmit();
              }}
            >
              Tạo lớp anyway ({sessions.filter((s) => !s.cancelled).length} buổi)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm dialog khi user manual edit end_date sau auto-calc.
          3 lựa chọn: đổi start_date (giữ N buổi) | giữ start_date (chấp nhận
          khác số buổi → mark override) | hủy (revert end_date về previous). */}
      <AlertDialog
        open={showEndDateChangeConfirm}
        onOpenChange={(open) => { if (!open) cancelEndDateChange(); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn vừa đổi ngày kết thúc</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Lớp đang auto-tính theo Study Plan ({expectedSessions ?? 0} buổi).
                  Bạn vừa đổi ngày kết thúc sang{" "}
                  <strong>
                    {pendingEndDate
                      ? new Date(pendingEndDate + "T00:00:00").toLocaleDateString("vi-VN")
                      : "—"}
                  </strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bạn muốn xử lý thế nào?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction onClick={confirmChangeStartDate} className="w-full">
              Tự động đổi ngày khai giảng (giữ {expectedSessions ?? 0} buổi)
            </AlertDialogAction>
            <Button variant="outline" onClick={confirmKeepStartDate} className="w-full">
              Giữ ngày khai giảng (chấp nhận khác số buổi)
            </Button>
            <AlertDialogCancel onClick={cancelEndDateChange} className="w-full mt-0">
              Hủy
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
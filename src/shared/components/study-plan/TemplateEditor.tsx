import { useState, useEffect, useMemo } from "react";
import { useTemplateMutations, useStudyPlanTemplate, type StudyPlanTemplate } from "@shared/hooks/useStudyPlanTemplates";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { PopButton } from "@shared/components/ui/pop-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, FileStack } from "lucide-react";
import { SessionCard } from "./SessionCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { useLevelCefrMap } from "@shared/hooks/useLevelCefrMap";
import { usePrograms } from "@shared/hooks/usePrograms";
import { getProgramIcon, getProgramLabel } from "@shared/utils/programColors";
import { useAssignmentMapForResources } from "@shared/hooks/useResourceCourses";

interface Props {
  template: Partial<StudyPlanTemplate> | {};
  onClose: () => void;
}

export function TemplateEditor({ template, onClose }: Props) {
  const tplId = (template as any)?.id as string | undefined;
  const isNew = !tplId;
  const { upsertTemplate, bulkUpsertEntries } = useTemplateMutations();
  const { data: loaded } = useStudyPlanTemplate(tplId || null);
  const { programs } = usePrograms();
  const { formatCefr } = useLevelCefrMap();

  const [form, setForm] = useState({
    template_name: (template as any)?.template_name || "",
    description: (template as any)?.description || "",
    program: ((template as any)?.program || "").toLowerCase(),
    assigned_level: (template as any)?.assigned_level || "",
    plan_type: (template as any)?.plan_type || "structured",
    total_sessions: (template as any)?.total_sessions || 10,
    session_duration: (template as any)?.session_duration || 60,
    teacher_notes: (template as any)?.teacher_notes || "",
    skills: (template as any)?.skills || [],
    schedule_pattern: (template as any)?.schedule_pattern || { type: "weekly", days: ["mon", "wed", "fri"] },
  });
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Load entries from server when editing existing template
  useEffect(() => {
    if (loaded?.entries && !entriesLoaded) {
      setEntries(loaded.entries.map(e => ({
        session_order: e.session_order,
        day_offset: e.day_offset,
        session_type: e.session_type,
        skills: e.skills || [],
        homework: e.homework || "",
        class_note: e.class_note || "",
        class_note_files: e.class_note_files || [],
        class_note_visible: e.class_note_visible ?? true,
        links: e.links || [],
        exercise_ids: e.exercise_ids || [],
        flashcard_set_ids: e.flashcard_set_ids || [],
        assessment_ids: e.assessment_ids || [],
      })));
      setForm(f => ({
        ...f,
        template_name: loaded.template_name,
        description: loaded.description || "",
        program: (loaded.program || "ielts").toLowerCase(),
        assigned_level: loaded.assigned_level || "",
        plan_type: loaded.plan_type,
        total_sessions: loaded.total_sessions,
        session_duration: loaded.session_duration,
        teacher_notes: loaded.teacher_notes || "",
        skills: loaded.skills || [],
        schedule_pattern: loaded.schedule_pattern || { type: "weekly", days: ["mon", "wed", "fri"] },
      }));
      setEntriesLoaded(true);
    }
  }, [loaded, entriesLoaded]);

  // Chỉ lấy levels thuộc program đang ACTIVE — tránh lộ level của program đã ẩn.
  const { levels: courseLevels = [] } = useCourseLevels();

  /**
   * Default program selection.
   * - Khi đang tạo mới và chưa có `program` từ caller, ưu tiên program đầu tiên
   *   trong danh sách động (`programs`) để dropdown không hiển thị "—".
   * - Tránh ghi đè khi user đã chủ động chọn / hoặc khi đang edit (loaded sẽ
   *   set lại ở effect bên dưới).
   */
  useEffect(() => {
    if (isNew && !form.program && programs.length > 0) {
      setForm((f) => ({ ...f, program: programs[0].key.toLowerCase() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, isNew]);

  /**
   * Levels filtered theo program đang chọn — qua bảng `program_levels`.
   * Ngăn admin gán nhầm level của program khác (vd. chọn IELTS nhưng pick
   * "WRE Beginner"). Trả về tên level (vì `assigned_level` lưu dạng text).
   */
  const selectedProgram = useMemo(
    () => programs.find((p) => p.key.toLowerCase() === form.program),
    [programs, form.program],
  );

  const { data: programLevelLinks = [] } = useQuery({
    queryKey: ["program-levels-for-template", selectedProgram?.id],
    enabled: !!selectedProgram?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("program_levels")
        .select("level_id, sort_order")
        .eq("program_id", selectedProgram!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{ level_id: string; sort_order: number }>;
    },
  });

  const programLevels = useMemo(() => {
    if (!form.program) return courseLevels;
    // "Khác" (other) không nằm trong bảng `programs` / `program_levels` →
    // không có pivot để filter. Cho phép admin chọn TOÀN BỘ levels để tránh
    // dropdown rỗng khi gán template ngoài 3 chương trình chính.
    if (form.program === "other") return courseLevels;
    const order = new Map(programLevelLinks.map((l, i) => [l.level_id, l.sort_order ?? i]));
    return courseLevels
      .filter((l: any) => order.has(l.id))
      .sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [courseLevels, programLevelLinks, form.program]);

  /**
   * Khi đổi program, nếu `assigned_level` hiện tại không nằm trong danh sách
   * level của program mới → reset để tránh dữ liệu mồ côi.
   */
  useEffect(() => {
    if (!form.assigned_level || !form.program) return;
    if (programLevels.length === 0) return;
    const has = programLevels.some((l: any) => l.name === form.assigned_level);
    if (!has) {
      setForm((f) => ({ ...f, assigned_level: "" }));
    }
  }, [form.program, programLevels, form.assigned_level]);

  // Resources by program
  const { data: exercises } = useQuery({
    queryKey: ["exercises-tpl", form.program],
    queryFn: async () => {
      let q = supabase.from("practice_exercises").select("id, title, skill, course_level, program").eq("status", "published").order("title");
      if (form.program && form.program !== "customized") q = q.eq("program", form.program);
      const { data } = await q;
      return data || [];
    },
  });
  const { data: flashcardSets } = useQuery({
    queryKey: ["flashcards-tpl", form.program],
    queryFn: async () => {
      let q = supabase.from("flashcard_sets").select("id, title, course_level, program, description").eq("status", "published").order("title");
      if (form.program && form.program !== "customized") q = q.eq("program", form.program);
      const { data } = await q;
      return data || [];
    },
  });
  const { data: assessments } = useQuery({
    queryKey: ["assessments-tpl", form.program],
    queryFn: async () => {
      let q = supabase.from("assessments").select("id, name, section_type, course_level, program").eq("status", "published").order("name");
      if (form.program && form.program !== "customized") q = q.eq("program", form.program);
      const { data } = await q;
      return data || [];
    },
  });

  // ------------------------------------------------------------------
  // Mismatch detection: when admin changes Program / Course, surface any
  // resources already pinned in `entries` that no longer fit the new scope.
  // ------------------------------------------------------------------
  const allExerciseIds = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.exercise_ids || []))),
    [entries],
  );
  const allFlashcardIds = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.flashcard_set_ids || []))),
    [entries],
  );
  const allAssessmentIds = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.assessment_ids || []))),
    [entries],
  );

  const { data: exMap = {} } = useAssignmentMapForResources("exercise", allExerciseIds);
  const { data: fcMap = {} } = useAssignmentMapForResources("flashcard_set", allFlashcardIds);
  const { data: asMap = {} } = useAssignmentMapForResources("assessment", allAssessmentIds);

  const mismatch = useMemo(() => {
    const exIds = new Set((exercises || []).map((r: any) => r.id));
    const fcIds = new Set((flashcardSets || []).map((r: any) => r.id));
    const asIds = new Set((assessments || []).map((r: any) => r.id));
    const programOff = {
      exercise: allExerciseIds.filter((id) => exercises && !exIds.has(id)),
      flashcard_set: allFlashcardIds.filter((id) => flashcardSets && !fcIds.has(id)),
      assessment: allAssessmentIds.filter((id) => assessments && !asIds.has(id)),
    };
    // Course-level mismatch detection deferred to Phase F3 (course_study_plans
    // junction). study_plan_templates currently has no course_id column.
    const courseOff: { exercise: string[]; flashcard_set: string[]; assessment: string[] } = {
      exercise: [],
      flashcard_set: [],
      assessment: [],
    };
    const totalProgram =
      programOff.exercise.length + programOff.flashcard_set.length + programOff.assessment.length;
    const totalCourse =
      courseOff.exercise.length + courseOff.flashcard_set.length + courseOff.assessment.length;
    return { programOff, courseOff, totalProgram, totalCourse };
  }, [
    exercises,
    flashcardSets,
    assessments,
    allExerciseIds,
    allFlashcardIds,
    allAssessmentIds,
    exMap,
    fcMap,
    asMap,
  ]);

  const removeMismatched = (scope: "program" | "course") => {
    const target = scope === "program" ? mismatch.programOff : mismatch.courseOff;
    const exSet = new Set(target.exercise);
    const fcSet = new Set(target.flashcard_set);
    const asSet = new Set(target.assessment);
    setEntries((es) =>
      es.map((e) => ({
        ...e,
        exercise_ids: (e.exercise_ids || []).filter((id: string) => !exSet.has(id)),
        flashcard_set_ids: (e.flashcard_set_ids || []).filter((id: string) => !fcSet.has(id)),
        assessment_ids: (e.assessment_ids || []).filter((id: string) => !asSet.has(id)),
      })),
    );
    toast.success(
      `Đã gỡ ${
        target.exercise.length + target.flashcard_set.length + target.assessment.length
      } resource lệch ${scope === "program" ? "chương trình" : "khoá học"}`,
    );
  };

  const addEntry = () => {
    setEntries(e => [...e, {
      session_order: e.length + 1,
      day_offset: null,
      session_type: "Study",
      skills: [],
      homework: "",
      class_note: "",
      class_note_files: [],
      class_note_visible: true,
      links: [],
      exercise_ids: [],
      flashcard_set_ids: [],
      assessment_ids: [],
    }]);
    setExpanded(entries.length);
  };

  const removeEntry = (idx: number) => {
    setEntries(es => es.filter((_, i) => i !== idx).map((e, i) => ({ ...e, session_order: i + 1 })));
  };

  const updateEntry = (idx: number, field: string, value: any) => {
    setEntries(es => es.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const WIZARD_STEPS = ["Chương trình", "Thông tin", "Buổi học", "Xem lại"];
  const [wizardStep, setWizardStep] = useState(0);

  const canNextStep = () => {
    if (wizardStep === 0) return !!form.program;
    if (wizardStep === 1) return !!form.template_name.trim();
    return true;
  };

  const handleSave = async () => {
    if (!form.template_name.trim()) { toast.error("Vui lòng nhập tên mẫu"); return; }
    if (!form.program) { toast.error("Vui lòng chọn Chương trình"); return; }
    setSaving(true);
    try {
      const id = await upsertTemplate.mutateAsync({
        ...(tplId ? { id: tplId } : {}),
        ...form,
        total_sessions: Math.max(entries.length, form.total_sessions),
      } as any);
      await bulkUpsertEntries.mutateAsync({
        templateId: id,
        entries: entries.map((e, i) => ({ ...e, session_order: i + 1 })),
      });
      toast.success(isNew ? "Đã tạo mẫu mới" : "Đã lưu mẫu");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalHours = +((form.total_sessions * form.session_duration) / 60).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,12,14,0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: 900, maxHeight: "92vh",
          background: "#fff", border: "2.5px solid var(--lp-ink, #0B0C0E)",
          borderRadius: 18, boxShadow: "8px 8px 0 0 var(--lp-ink, #0B0C0E)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1.5px solid var(--lp-line, #E5E7EB)",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--lp-coral, #FA7D64)", marginBottom: 4 }}>
              ✦ {isNew ? "Tạo mẫu kế hoạch" : "Chỉnh sửa mẫu"} · Bước {wizardStep + 1}/{WIZARD_STEPS.length}
            </div>
            <h2 style={{ margin: 0, fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 22, lineHeight: 1.15 }}>
              {wizardStep === 0 && <><span style={{ color: "var(--lp-teal, #38B6AB)" }}>Chương trình</span> & Level</>}
              {wizardStep === 1 && <>Tên & thông tin <span style={{ color: "var(--lp-coral, #FA7D64)" }}>chi tiết</span></>}
              {wizardStep === 2 && <>Thiết kế <span style={{ color: "var(--lp-teal, #38B6AB)" }}>buổi học</span></>}
              {wizardStep === 3 && <>Xem lại & lưu</>}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "var(--lp-body, #6B7280)", lineHeight: 1, padding: "0 4px" }}
          >×</button>
        </div>

        {/* Step indicator */}
        <div style={{
          display: "flex", gap: 0,
          padding: "0 24px", borderBottom: "1.5px solid var(--lp-line, #E5E7EB)",
          flexShrink: 0,
        }}>
          {WIZARD_STEPS.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 16px 10px 0",
              opacity: i > wizardStep ? 0.4 : 1,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: "50%",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                background: i < wizardStep ? "var(--lp-teal, #38B6AB)" : i === wizardStep ? "var(--lp-yellow, #FFC940)" : "transparent",
                color: i < wizardStep ? "#fff" : "var(--lp-ink, #0B0C0E)",
                fontSize: 11, fontWeight: 900,
              }}>
                {i < wizardStep ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: i === wizardStep ? 800 : 600, color: "var(--lp-ink, #0B0C0E)" }}>{s}</span>
              {i < WIZARD_STEPS.length - 1 && <span style={{ marginLeft: 8, color: "var(--lp-line, #E5E7EB)", fontWeight: 900 }}>·</span>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* ── STEP 0: Program & Level ── */}
          {wizardStep === 0 && (
            <div className="space-y-5">
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--lp-body, #6B7280)", marginBottom: 8 }}>
                  Chương trình <span style={{ color: "var(--lp-coral, #FA7D64)" }}>*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {programs.map((p) => {
                    const Icon = getProgramIcon(p.key);
                    const active = form.program === p.key.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        onClick={() => setForm(f => ({ ...f, program: p.key.toLowerCase() }))}
                        style={{
                          display: "flex", flexDirection: "column", gap: 6,
                          padding: "14px 16px", borderRadius: 12, textAlign: "left",
                          border: `2px solid ${active ? "var(--lp-ink, #0B0C0E)" : "var(--lp-line, #E5E7EB)"}`,
                          background: active ? "var(--lp-yellow-soft, #FFF9E6)" : "#fff",
                          boxShadow: active ? "3px 3px 0 0 var(--lp-ink, #0B0C0E)" : "none",
                          cursor: "pointer", transition: "all .12s", position: "relative",
                        }}
                      >
                        {active && (
                          <span style={{
                            position: "absolute", top: 8, right: 10,
                            background: "var(--lp-teal, #38B6AB)", color: "#fff",
                            borderRadius: "50%", width: 18, height: 18, display: "inline-flex",
                            alignItems: "center", justifyContent: "center", fontSize: 10,
                          }}>✓</span>
                        )}
                        <Icon className="h-5 w-5" style={{ color: active ? "var(--lp-ink)" : "var(--lp-body)" }} />
                        <span style={{ fontWeight: 800, fontSize: 14, color: "var(--lp-ink, #0B0C0E)" }}>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
                {!form.program && (
                  <p style={{ fontSize: 11, color: "var(--lp-coral, #FA7D64)", marginTop: 6 }}>Bắt buộc chọn chương trình trước.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Level
                    {form.program && form.program !== "other" && (
                      <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                        (theo {getProgramLabel(form.program)})
                      </span>
                    )}
                  </Label>
                  <Select
                    value={form.assigned_level || "__none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, assigned_level: v === "__none" ? "" : v }))}
                    disabled={!form.program}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.program ? "Chưa gán (tuỳ chọn)" : "Chọn chương trình trước"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Chưa gán</SelectItem>
                      {programLevels.map((l: any) => (
                        <SelectItem key={l.id} value={l.name}>
                          {l.name}{(() => { const c = formatCefr(l.id); return c ? ` · ${c}` : ""; })()}
                        </SelectItem>
                      ))}
                      {form.program && programLevels.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Chưa có level cho chương trình này.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Loại kế hoạch</Label>
                  <Select value={form.plan_type} onValueChange={(v) => setForm(f => ({ ...f, plan_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structured">Structured (có lộ trình)</SelectItem>
                      <SelectItem value="flexible">Flexible (linh hoạt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Info ── */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Tên mẫu <span className="text-destructive">*</span></Label>
                <Input
                  value={form.template_name}
                  onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))}
                  placeholder="VD: IELTS Foundation 30 buổi"
                  style={{ fontWeight: 700, fontSize: 15 }}
                  autoFocus
                />
              </div>
              <div>
                <Label>Mô tả</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả ngắn về mẫu — học viên & giáo viên sẽ thấy khi chọn mẫu..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Số buổi học (tổng)</Label>
                  <Input
                    type="number" min={1}
                    value={form.total_sessions}
                    onChange={e => setForm(f => ({ ...f, total_sessions: parseInt(e.target.value) || 1 }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">≈ {totalHours} giờ tổng</p>
                </div>
                <div>
                  <Label>Thời lượng (phút/buổi)</Label>
                  <Input
                    type="number" min={15} step={15}
                    value={form.session_duration}
                    onChange={e => setForm(f => ({ ...f, session_duration: parseInt(e.target.value) || 60 }))}
                  />
                </div>
              </div>

              <div>
                <Label>Ghi chú dành cho giáo viên</Label>
                <Textarea
                  value={form.teacher_notes}
                  onChange={e => setForm(f => ({ ...f, teacher_notes: e.target.value }))}
                  placeholder="Lưu ý khi dạy theo mẫu này..."
                  rows={2}
                />
              </div>

              {/* Live summary strip */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
                border: "2px solid var(--lp-ink, #0B0C0E)", borderRadius: 12,
                overflow: "hidden",
              }}>
                {[
                  { label: "Buổi học", value: form.total_sessions, sub: "buổi" },
                  { label: "Tổng giờ", value: totalHours, sub: "giờ" },
                  { label: "Mỗi buổi", value: form.session_duration + "′", sub: "phút" },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: "12px 8px", textAlign: "center",
                    borderRight: i < 2 ? "1.5px solid var(--lp-line, #E5E7EB)" : "none",
                    background: i === 0 ? "var(--lp-teal-soft, #E6F7F6)" : i === 1 ? "var(--lp-yellow-soft, #FFF9E6)" : "var(--lp-cream, #F9F8F4)",
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--lp-body, #6B7280)", marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontFamily: "var(--ff-display, inherit)", fontSize: 22, fontWeight: 900, lineHeight: 1, color: "var(--lp-ink, #0B0C0E)" }}>{item.value}</p>
                    <p style={{ fontSize: 10, color: "var(--lp-body, #6B7280)", marginTop: 2 }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Sessions ── */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontWeight: 800, fontSize: 14, color: "var(--lp-ink)" }}>Các buổi học ({entries.length} / {form.total_sessions} dự kiến)</p>
                  <p style={{ fontSize: 12, color: "var(--lp-body)", marginTop: 2 }}>Thêm nội dung cho từng buổi — có thể bỏ trống, GV sẽ tự điền sau.</p>
                </div>
                <PopButton tone="teal" size="sm" onClick={addEntry}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Thêm buổi
                </PopButton>
              </div>

              {(mismatch.totalProgram > 0) && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, border: "1.5px solid #FCD34D",
                  background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span style={{ fontSize: 12, color: "#92400E" }}>
                      <strong>{mismatch.totalProgram}</strong> resource không thuộc chương trình <strong>{getProgramLabel(form.program)}</strong>
                    </span>
                  </div>
                  <PopButton tone="white" size="sm" onClick={() => removeMismatched("program")}
                    style={{ borderColor: "#FCD34D", color: "#92400E", fontSize: 11 }}>
                    Gỡ {mismatch.totalProgram} lệch
                  </PopButton>
                </div>
              )}

              <div className="space-y-2">
                {entries.map((entry, idx) => (
                  <div key={idx} className="relative group">
                    <SessionCard
                      entry={entry}
                      idx={idx}
                      isExpanded={expanded === idx}
                      onToggle={() => setExpanded(expanded === idx ? null : idx)}
                      onUpdate={(f, v) => updateEntry(idx, f, v)}
                      exercises={exercises}
                      flashcardSets={flashcardSets}
                      assessments={assessments}
                      selectedLevel={form.assigned_level}
                      courseId={null}
                    />
                    <button
                      onClick={() => removeEntry(idx)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xoá buổi"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {entries.length === 0 && (
                  <div style={{
                    textAlign: "center", padding: "40px 20px",
                    border: "2px dashed var(--lp-line, #E5E7EB)", borderRadius: 14,
                    color: "var(--lp-body, #6B7280)",
                  }}>
                    <FileStack className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p style={{ fontWeight: 700, fontSize: 14 }}>Chưa có buổi nào</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>Nhấn "Thêm buổi" để bắt đầu — hoặc bỏ qua, GV sẽ tự điền.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {wizardStep === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>
              <div style={{
                border: "2px solid var(--lp-ink, #0B0C0E)", borderRadius: 14,
                boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)", overflow: "hidden",
              }}>
                {[
                  { k: "Chương trình", v: selectedProgram?.name || form.program || "—" },
                  { k: "Level", v: form.assigned_level || "— Chưa gán —" },
                  { k: "Tên mẫu", v: <strong>{form.template_name || "—"}</strong> },
                  { k: "Mô tả", v: form.description || <em className="text-muted-foreground">Chưa có</em> },
                  { k: "Số buổi", v: `${form.total_sessions} buổi × ${form.session_duration}′ = ${totalHours}h` },
                  { k: "Loại", v: form.plan_type === "structured" ? "Structured" : "Flexible" },
                  { k: "Buổi đã thiết kế", v: `${entries.length} / ${form.total_sessions}` },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 16px", gap: 12,
                    borderBottom: i < 6 ? "1px solid var(--lp-line, #E5E7EB)" : "none",
                    background: i % 2 === 0 ? "#fff" : "var(--lp-cream, #F9F8F4)",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lp-body, #6B7280)", minWidth: 120 }}>{row.k}</span>
                    <span style={{ fontSize: 13, color: "var(--lp-ink, #0B0C0E)", textAlign: "right" }}>{row.v}</span>
                  </div>
                ))}
              </div>
              <div style={{
                background: "var(--lp-teal-soft, #E6F7F6)", border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 14, boxShadow: "3px 3px 0 0 var(--lp-ink)", padding: "16px",
              }}>
                <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>⚡ Sau khi tạo</p>
                <ul style={{ paddingLeft: 16, fontSize: 12, lineHeight: 1.7, color: "var(--lp-ink)", margin: 0 }}>
                  <li>Mẫu xuất hiện trong danh sách Templates</li>
                  <li>Khi gán cho lớp → hệ thống tự sao chép</li>
                  <li>Kế hoạch đã gán không bị ảnh hưởng khi sửa mẫu</li>
                  {form.teacher_notes && <li>Ghi chú GV đã được lưu</li>}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 24px", borderTop: "1.5px solid var(--lp-line, #E5E7EB)",
          flexShrink: 0, background: "var(--lp-cream, #F9F8F4)",
        }}>
          <PopButton tone="white" size="sm" onClick={() => wizardStep === 0 ? onClose() : setWizardStep(s => s - 1)}>
            {wizardStep === 0 ? "Huỷ" : <><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Quay lại</>}
          </PopButton>
          <div style={{ flex: 1 }} />
          {wizardStep < WIZARD_STEPS.length - 1 ? (
            <PopButton
              tone={canNextStep() ? "teal" : "white"}
              size="sm"
              disabled={!canNextStep()}
              onClick={() => canNextStep() && setWizardStep(s => s + 1)}
            >
              Tiếp tục <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </PopButton>
          ) : (
            <>
              <PopButton tone="white" size="sm" onClick={onClose}>Huỷ</PopButton>
              <PopButton tone="coral" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                {isNew ? "Tạo mẫu" : "Lưu mẫu"}
              </PopButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, Plus, Trash2, Info, ExternalLink, ClipboardList, Star, AlertCircle,
  Search, X, Check, ChevronLeft, ChevronRight, BookOpen, Layers, Sparkles,
  CircleCheck, Users, Clock, Calendar, Wallet, Target, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@shared/components/ui/dialog";
import { Checkbox } from "@shared/components/ui/checkbox";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { cn } from "@shared/lib/utils";
import { getProgramPalette, getProgramIcon } from "@shared/utils/programColors";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import { useStudyPlanTemplates } from "@shared/hooks/useStudyPlanTemplates";
import type { Course, CourseInput } from "@admin/features/academic/hooks/useCourses";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  programId: string;
  programKey: string;
  programName: string;
  /** Toàn bộ level thuộc program này (để chọn) */
  levels: CourseLevel[];
  course: Course | null; // null = create
  onSubmit: (input: CourseInput) => Promise<void>;
}

type Step = 0 | 1 | 2;
const STEPS: Array<{ key: Step; label: string; sub: string; icon: typeof BookOpen }> = [
  { key: 0, label: "Cấp độ",    sub: "Gán level vào khoá",    icon: Layers   },
  { key: 1, label: "Thông tin", sub: "Tên · Mô tả · Đầu ra", icon: Sparkles },
  { key: 2, label: "Study plan",sub: "Mẫu kế hoạch áp dụng",  icon: ClipboardList },
];

export default function CourseEditorDialog({
  open, onOpenChange, programId, programKey, programName, levels, course, onSubmit,
}: Props) {
  const isEdit = !!course;
  const palette = getProgramPalette(programKey);
  const ProgramIcon = getProgramIcon(programKey);

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [levelIds, setLevelIds] = useState<string[]>([]);
  const [studyPlanIds, setStudyPlanIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Rich descriptive fields
  const [targetAudience, setTargetAudience] = useState("");
  const [problemSolving, setProblemSolving] = useState("");
  const [priceVnd, setPriceVnd] = useState<string>("");
  const [durationLabel, setDurationLabel] = useState("");
  const [totalSessions, setTotalSessions] = useState<string>("");
  const [hoursPerSession, setHoursPerSession] = useState<string>("");
  const [maxStudents, setMaxStudents] = useState<string>("");
  const [cefrRange, setCefrRange] = useState("");

  // Search state
  const [levelQuery, setLevelQuery] = useState("");
  const [planQuery, setPlanQuery] = useState("");
  const [planScope, setPlanScope] = useState<"all" | "program" | "selected">("program");

  const { data: allTemplates, isLoading: templatesLoading } = useStudyPlanTemplates();
  /**
   * Lọc study plan templates theo program. Template KHÔNG có `program` cũng được
   * coi là dùng được (generic) — admin có thể chọn cho bất cứ chương trình nào.
   */
  const eligibleTemplates = useMemo(
    () =>
      (allTemplates ?? []).filter((t: any) => {
        if (!t.program) return true;
        return t.program.toLowerCase() === programKey.toLowerCase();
      }),
    [allTemplates, programKey],
  );

  /**
   * Đồng bộ phòng vệ: khi danh sách `levels` của program thay đổi (vd. admin xoá
   * level trong khi dialog đang mở), bỏ những id không còn hợp lệ khỏi state.
   * Tương tự với study plan templates đã chọn — bỏ id không còn trong eligible.
   */
  useEffect(() => {
    if (!open) return;
    const validLevelIds = new Set(levels.map((l) => l.id));
    setLevelIds((arr) => arr.filter((id) => validLevelIds.has(id)));
  }, [open, levels]);
  useEffect(() => {
    if (!open || templatesLoading) return;
    const validIds = new Set(eligibleTemplates.map((t: any) => t.id));
    setStudyPlanIds((arr) => arr.filter((id) => validIds.has(id)));
  }, [open, templatesLoading, eligibleTemplates]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setLevelQuery("");
    setPlanQuery("");
    setPlanScope("program");
    if (course) {
      setName(course.name);
      setDescription(course.description ?? "");
      setLongDescription(course.long_description ?? "");
      setOutcomes(course.outcomes.length ? course.outcomes : [""]);
      setLevelIds(course.level_ids);
      setStudyPlanIds(course.study_plan_ids);
      setTargetAudience(course.target_audience ?? "");
      setProblemSolving(course.problem_solving ?? "");
      setPriceVnd(course.price_vnd != null ? String(course.price_vnd) : "");
      setDurationLabel(course.duration_label ?? "");
      setTotalSessions(course.total_sessions != null ? String(course.total_sessions) : "");
      setHoursPerSession(course.hours_per_session != null ? String(course.hours_per_session) : "");
      setMaxStudents(course.max_students != null ? String(course.max_students) : "");
      setCefrRange(course.cefr_range ?? "");
    } else {
      setName("");
      setDescription("");
      setLongDescription("");
      setOutcomes([""]);
      setLevelIds([]);
      setStudyPlanIds([]);
      setTargetAudience("");
      setProblemSolving("");
      setPriceVnd("");
      setDurationLabel("");
      setTotalSessions("");
      setHoursPerSession("");
      setMaxStudents("");
      setCefrRange("");
    }
  }, [open, course]);

  const updateOutcome = (i: number, v: string) =>
    setOutcomes((arr) => arr.map((o, idx) => (idx === i ? v : o)));
  const removeOutcome = (i: number) =>
    setOutcomes((arr) => arr.filter((_, idx) => idx !== i));
  const addOutcome = () => setOutcomes((arr) => [...arr, ""]);

  const toggleLevel = (id: string) =>
    setLevelIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  const togglePlan = (id: string) =>
    setStudyPlanIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  /** Kéo plan lên đầu — vị trí 0 = default theo logic của useCourses.syncStudyPlans. */
  const makePlanDefault = (id: string) =>
    setStudyPlanIds((arr) => [id, ...arr.filter((x) => x !== id)]);

  // Level helpers
  const filteredLevels = useMemo(() => {
    const q = levelQuery.trim().toLowerCase();
    if (!q) return levels;
    return levels.filter((l) => l.name.toLowerCase().includes(q));
  }, [levels, levelQuery]);
  const allFilteredSelected =
    filteredLevels.length > 0 && filteredLevels.every((l) => levelIds.includes(l.id));
  const toggleAllFiltered = () => {
    const ids = filteredLevels.map((l) => l.id);
    if (allFilteredSelected) {
      setLevelIds((arr) => arr.filter((id) => !ids.includes(id)));
    } else {
      setLevelIds((arr) => Array.from(new Set([...arr, ...ids])));
    }
  };

  // Validation
  // Step 1 (Thông tin) chứa field bắt buộc duy nhất là `name`.
  const nameValid = name.trim().length > 0;
  const canNext =
    step === 0 ? true /* chọn cấp độ là tuỳ chọn — có thể bỏ qua */
    : step === 1 ? nameValid
    : true;
  const goNext = () => {
    if (step === 1 && !nameValid) {
      toast.error("Tên khoá học không được trống.");
      return;
    }
    setStep((s) => Math.min(2, s + 1) as Step);
  };
  const goPrev = () => setStep((s) => Math.max(0, s - 1) as Step);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Tên khoá học không được trống."); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        program_id: programId,
        name: name.trim(),
        description: description.trim() || null,
        long_description: longDescription.trim() || null,
        outcomes: outcomes.map((o) => o.trim()).filter(Boolean),
        level_ids: levelIds,
        study_plan_ids: studyPlanIds,
        status: "active",
        target_audience: targetAudience.trim() || null,
        problem_solving: problemSolving.trim() || null,
        price_vnd: priceVnd.trim() ? Math.max(0, parseInt(priceVnd.replace(/\D/g, ""), 10) || 0) : null,
        duration_label: durationLabel.trim() || null,
        total_sessions: totalSessions.trim() ? Math.max(0, parseInt(totalSessions, 10) || 0) : null,
        hours_per_session: hoursPerSession.trim() ? Math.max(0, parseFloat(hoursPerSession) || 0) : null,
        max_students: maxStudents.trim() ? Math.max(0, parseInt(maxStudents, 10) || 0) : null,
        cefr_range: cefrRange.trim() || null,
      });
      toast.success(isEdit ? "Đã cập nhật khoá học." : "Đã tạo khoá học.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Lỗi: ${e?.message ?? "không rõ"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ─── Header với program preview ─── */}
        <div className={cn("relative px-6 pt-5 pb-4 border-b", palette.accentSoftBg)}>
          <div className="flex items-start gap-3">
            <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", palette.iconBg)}>
              <ProgramIcon className={cn("h-5 w-5", palette.iconText)} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="space-y-0.5 text-left">
                <DialogTitle className="text-lg font-display font-extrabold leading-tight">
                  {isEdit ? "Sửa khoá học" : "Tạo khoá học mới"}
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed">
                  Thuộc chương trình{" "}
                  <strong className="text-foreground">{programName}</strong>
                  {name.trim() && (
                    <>
                      {" — "}
                      <span className={cn("font-semibold", palette.accentText)}>
                        {name.trim()}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.key;
              const isDone = step > s.key;
              // Step 0 (Cấp độ) & Step 1 (Thông tin) luôn vào được.
              // Step 2 (Study plan) chỉ vào khi đã có tên khoá.
              const reachable = idx <= 1 || nameValid;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => reachable && setStep(s.key)}
                  disabled={!reachable}
                  className={cn(
                    "flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all",
                    isActive && "bg-background border shadow-sm",
                    !isActive && isDone && "bg-background/60 hover:bg-background border border-transparent",
                    !isActive && !isDone && "opacity-60 hover:opacity-100",
                    !reachable && "cursor-not-allowed",
                  )}
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
                      isActive ? cn(palette.iconBg, palette.iconText)
                        : isDone ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-[11px] font-bold uppercase tracking-wider truncate">
                      {s.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Body ───
            Single scroll container cho toàn dialog. KHÔNG nested overflow ở
            các step để wheel/trackpad/Page Up-Down hoạt động mượt, không bị
            "kẹt" khi cuộn hết list con. */}
        <div
          tabIndex={0}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth focus:outline-none"
        >
          <div className="px-6 py-5 space-y-5">
            {step === 0 && (
              <StepLevels
                levels={levels}
                filtered={filteredLevels}
                query={levelQuery}
                setQuery={setLevelQuery}
                selectedIds={levelIds}
                onToggle={toggleLevel}
                onToggleAll={toggleAllFiltered}
                allSelected={allFilteredSelected}
                palette={palette}
              />
            )}

            {step === 1 && (
              <StepInfo
                name={name} setName={setName}
                description={description} setDescription={setDescription}
                longDescription={longDescription} setLongDescription={setLongDescription}
                outcomes={outcomes}
                updateOutcome={updateOutcome}
                removeOutcome={removeOutcome}
                addOutcome={addOutcome}
                targetAudience={targetAudience} setTargetAudience={setTargetAudience}
                problemSolving={problemSolving} setProblemSolving={setProblemSolving}
                priceVnd={priceVnd} setPriceVnd={setPriceVnd}
                durationLabel={durationLabel} setDurationLabel={setDurationLabel}
                totalSessions={totalSessions} setTotalSessions={setTotalSessions}
                hoursPerSession={hoursPerSession} setHoursPerSession={setHoursPerSession}
                maxStudents={maxStudents} setMaxStudents={setMaxStudents}
                cefrRange={cefrRange} setCefrRange={setCefrRange}
              />
            )}

            {step === 2 && (
              <StudyPlanSection
                programName={programName}
                programKey={programKey}
                templates={eligibleTemplates}
                loading={templatesLoading}
                selectedIds={studyPlanIds}
                onToggle={togglePlan}
                onMakeDefault={makePlanDefault}
                query={planQuery}
                setQuery={setPlanQuery}
                scope={planScope}
                setScope={setPlanScope}
              />
            )}
          </div>
        </div>

        {/* ─── Footer với step nav ─── */}
        <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between gap-3">
          {/* Summary chips */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <SummaryChip icon={<Layers className="h-3 w-3" />} value={levelIds.length} label="cấp độ" />
            <SummaryChip icon={<ClipboardList className="h-3 w-3" />} value={studyPlanIds.length} label="plan" />
            <SummaryChip icon={<CircleCheck className="h-3 w-3" />} value={outcomes.filter((o) => o.trim()).length} label="đầu ra" />
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={goPrev} disabled={submitting} className="h-8 gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Quay lại
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={submitting} className="h-8">
              Huỷ
            </Button>
            {step < 2 ? (
              <Button size="sm" onClick={goNext} disabled={!canNext || submitting} className="h-8 gap-1">
                Tiếp tục <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave} disabled={submitting || !nameValid} className="h-8 gap-1.5">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Cập nhật" : "Tạo khoá học"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────── Step 0: Info ─────────────────────────── */

function StepInfo({
  name, setName, description, setDescription,
  longDescription, setLongDescription, outcomes,
  updateOutcome, removeOutcome, addOutcome,
  targetAudience, setTargetAudience,
  problemSolving, setProblemSolving,
  priceVnd, setPriceVnd,
  durationLabel, setDurationLabel,
  totalSessions, setTotalSessions,
  hoursPerSession, setHoursPerSession,
  maxStudents, setMaxStudents,
  cefrRange, setCefrRange,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  longDescription: string; setLongDescription: (v: string) => void;
  outcomes: string[];
  updateOutcome: (i: number, v: string) => void;
  removeOutcome: (i: number) => void;
  addOutcome: () => void;
  targetAudience: string; setTargetAudience: (v: string) => void;
  problemSolving: string; setProblemSolving: (v: string) => void;
  priceVnd: string; setPriceVnd: (v: string) => void;
  durationLabel: string; setDurationLabel: (v: string) => void;
  totalSessions: string; setTotalSessions: (v: string) => void;
  hoursPerSession: string; setHoursPerSession: (v: string) => void;
  maxStudents: string; setMaxStudents: (v: string) => void;
  cefrRange: string; setCefrRange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tên */}
      <div className="space-y-1.5">
        <Label htmlFor="course-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tên khoá học <span className="text-destructive">*</span>
        </Label>
        <Input
          id="course-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='vd. "IELTS 6.5 Foundation", "WRE Advanced Track"'
          autoFocus
          className="h-10 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Tên hiển thị ở thẻ khoá học và khi tạo lớp.
        </p>
      </div>

      {/* Mô tả ngắn */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="course-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Mô tả ngắn
          </Label>
          <Textarea
            id="course-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="1-2 câu xuất hiện trên thẻ khoá học."
            rows={3}
            className="resize-none"
          />
          <p className="text-[10px] text-muted-foreground">{description.length}/200 ký tự</p>
        </div>

        {/* Mô tả chi tiết */}
        <div className="space-y-1.5">
          <Label htmlFor="course-long" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Mô tả chi tiết
          </Label>
          <Textarea
            id="course-long"
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            placeholder="Nội dung chi tiết hiển thị trong trang chi tiết khoá."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Outcomes */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CircleCheck className="h-3.5 w-3.5" />
            Đầu ra khoá học ({outcomes.filter((o) => o.trim()).length})
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addOutcome} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Thêm đầu ra
          </Button>
        </div>
        <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2">
          {outcomes.map((o, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">
                {i + 1}
              </span>
              <Input
                value={o}
                onChange={(e) => updateOutcome(i, e.target.value)}
                placeholder={`vd. "Đạt band 6.5 Reading sau 12 tuần"`}
                className="h-8 text-sm"
              />
              {outcomes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeOutcome(i)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Đối tượng phù hợp ── */}
      <div className="space-y-1.5">
        <Label htmlFor="course-audience" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Đối tượng phù hợp
        </Label>
        <Textarea
          id="course-audience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="vd. - Có vốn từ A2&#10;- Mong muốn thi IELTS trong 1 năm tới"
          rows={4}
          className="resize-none text-sm"
        />
        <p className="text-[10px] text-muted-foreground">Mỗi dòng là một tiêu chí. Hỗ trợ markdown đơn giản (xuống dòng).</p>
      </div>

      {/* ── Khoá học giải quyết vấn đề gì ── */}
      <div className="space-y-1.5">
        <Label htmlFor="course-problem" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" /> Khoá học giải quyết vấn đề gì
        </Label>
        <Textarea
          id="course-problem"
          value={problemSolving}
          onChange={(e) => setProblemSolving(e.target.value)}
          placeholder="Giải pháp / phương pháp khoá học giúp học viên vượt qua rào cản gì."
          rows={4}
          className="resize-none text-sm"
        />
      </div>

      {/* ── Thông số khoá học (giá, thời lượng, sĩ số, CEFR) ── */}
      <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Thông số khoá học
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="course-price" className="text-[11px] flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Giá (VND)
            </Label>
            <Input
              id="course-price"
              inputMode="numeric"
              value={priceVnd}
              onChange={(e) => setPriceVnd(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="3490000"
              className="h-8 text-sm"
            />
            {priceVnd && (
              <p className="text-[10px] text-muted-foreground">
                {Number(priceVnd).toLocaleString("vi-VN")} ₫
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="course-duration" className="text-[11px] flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Thời gian
            </Label>
            <Input
              id="course-duration"
              value={durationLabel}
              onChange={(e) => setDurationLabel(e.target.value)}
              placeholder="vd. 1.5 tháng"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="course-sessions" className="text-[11px] flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> Số buổi
            </Label>
            <Input
              id="course-sessions"
              inputMode="numeric"
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="12"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="course-hours" className="text-[11px] flex items-center gap-1">
              <Clock className="h-3 w-3" /> Giờ / buổi
            </Label>
            <Input
              id="course-hours"
              inputMode="decimal"
              value={hoursPerSession}
              onChange={(e) => setHoursPerSession(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="2"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="course-max" className="text-[11px] flex items-center gap-1">
              <Users className="h-3 w-3" /> Sĩ số tối đa
            </Label>
            <Input
              id="course-max"
              inputMode="numeric"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="12"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1 col-span-2 md:col-span-3">
            <Label htmlFor="course-cefr" className="text-[11px] flex items-center gap-1">
              <Layers className="h-3 w-3" /> CEFR khoá học
            </Label>
            <Input
              id="course-cefr"
              value={cefrRange}
              onChange={(e) => setCefrRange(e.target.value)}
              placeholder="vd. A2 - B1"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Step 1: Levels ────────────────────────── */

function StepLevels({
  levels, filtered, query, setQuery, selectedIds,
  onToggle, onToggleAll, allSelected, palette,
}: {
  levels: CourseLevel[];
  filtered: CourseLevel[];
  query: string; setQuery: (v: string) => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  palette: ReturnType<typeof getProgramPalette>;
}) {
  if (levels.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed bg-muted/10 p-6 text-center">
        <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Chương trình này chưa có cấp độ nào.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Thêm cấp độ ở mục <strong>Khoá học / Cấp độ</strong> rồi quay lại.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm cấp độ…"
            className="h-8 pl-8 pr-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleAll}
          disabled={filtered.length === 0}
          className="h-8 text-xs whitespace-nowrap"
        >
          {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
        </Button>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Đã chọn <strong className="text-foreground">{selectedIds.length}</strong> / {levels.length} cấp độ
        {query && ` (lọc: ${filtered.length})`}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-6">
          Không có cấp độ khớp "{query}".
        </p>
      ) : (
        <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 rounded-lg border bg-muted/10 p-2 max-h-72 overflow-y-auto">
          {filtered.map((l) => {
            const checked = selectedIds.includes(l.id);
            return (
              <label
                key={l.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors border",
                  checked
                    ? cn(palette.accentSoftBg, "border-current/20")
                    : "border-transparent hover:bg-background",
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => onToggle(l.id)} />
                <span className={cn("text-sm truncate flex-1", checked && palette.accentText)}>
                  {l.name}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Study Plan section (rich) ────────────────────── */

function StudyPlanSection({
  programName, programKey, templates, loading, selectedIds, onToggle, onMakeDefault,
  query, setQuery, scope, setScope,
}: {
  programName: string;
  programKey: string;
  templates: any[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onMakeDefault: (id: string) => void;
  query: string;
  setQuery: (v: string) => void;
  scope: "all" | "program" | "selected";
  setScope: (v: "all" | "program" | "selected") => void;
}) {
  const defaultId = selectedIds[0] ?? null;

  // Apply scope filter
  const scoped = useMemo(() => {
    if (scope === "selected") return templates.filter((t: any) => selectedIds.includes(t.id));
    if (scope === "program") {
      return templates.filter(
        (t: any) => !t.program || t.program.toLowerCase() === programKey.toLowerCase(),
      );
    }
    return templates;
  }, [templates, scope, selectedIds, programKey]);

  // Apply text search across name / level / program
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((t: any) => {
      const blob = [
        t.template_name, t.assigned_level, t.program, t.description,
        ...(Array.isArray(t.skills) ? t.skills : []),
      ].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [scoped, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Study plan đã chọn ({selectedIds.length})
        </Label>
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
        >
          <Link to="/study-plans/templates" target="_blank" rel="noopener noreferrer">
            <Plus className="h-3 w-3" /> Tạo study plan mới
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        </Button>
      </div>

      {/* Note: phải tạo trước Study Plan ở phần Mẫu kế hoạch */}
      <div className="rounded-lg border bg-muted/30 p-2.5 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          Bạn cần <strong>tạo Study Plan</strong> ở mục{" "}
          <Link
            to="/study-plans/templates"
            target="_blank"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Mẫu kế hoạch
          </Link>{" "}
          trước khi gán vào khoá học. Plan đầu tiên trong danh sách dưới đây sẽ
          được dùng làm <strong>mặc định</strong> khi tạo lớp.
        </div>
      </div>

      {/* Search + scope */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên · level · skills…"
            className="h-8 pl-8 pr-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="inline-flex rounded-md border bg-background p-0.5 text-[11px]">
          {([
            ["program", `${programName}`],
            ["all",      "Tất cả"],
            ["selected", `Đã chọn (${selectedIds.length})`],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setScope(v)}
              className={cn(
                "px-2 py-1 rounded transition-colors font-semibold",
                scope === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải study plans…
        </div>
      ) : templates.length === 0 ? (
        <EmptyPlansState programName={programName} programKey={programKey} />
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-6 rounded-lg border bg-muted/10">
          {query
            ? `Không có study plan khớp "${query}".`
            : scope === "selected"
              ? "Chưa có plan nào được chọn."
              : "Không có plan trong phạm vi này."}
        </p>
      ) : (
        <div className="rounded-lg border bg-muted/10 max-h-72 overflow-y-auto divide-y">
          {filtered.map((t: any) => {
            const checked = selectedIds.includes(t.id);
            const isDefault = checked && defaultId === t.id;
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 transition-colors",
                  checked ? "bg-primary/5" : "hover:bg-background",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(t.id)}
                  id={`plan-${t.id}`}
                />
                <label
                  htmlFor={`plan-${t.id}`}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm truncate">{t.template_name}</p>
                    {isDefault && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-primary/10 text-primary">
                        <Star className="h-2.5 w-2.5 fill-current" /> Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {[t.assigned_level, t.program, `${t.total_sessions ?? 0} buổi`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </label>
                {checked && !isDefault && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-1.5 shrink-0"
                    onClick={() => onMakeDefault(t.id)}
                  >
                    <Star className="h-3 w-3 mr-0.5" />
                    Đặt mặc định
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyPlansState({ programName, programKey }: { programName: string; programKey: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed bg-muted/10 p-4 text-center">
      <AlertCircle className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-xs text-muted-foreground mb-3">
        Chưa có study plan template nào phù hợp với chương trình{" "}
        <strong className="text-foreground">{programName}</strong>.
      </p>
      <Button asChild size="sm" className="h-8 gap-1.5">
        <Link
          to={`/study-plans/templates?program=${encodeURIComponent(programKey)}&new=1`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Plus className="h-3.5 w-3.5" /> Tạo study plan đầu tiên
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Link>
      </Button>
    </div>
  );
}

/* ─────────────────────────── Summary chip ────────────────────────── */

function SummaryChip({
  icon, value, label,
}: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px]",
        value > 0 ? "border-primary/30 bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground",
      )}
    >
      {icon}
      <strong className="font-bold">{value}</strong>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
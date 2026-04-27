import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, Plus, Trash2, Info, ExternalLink, ClipboardList, Star, AlertCircle,
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

export default function CourseEditorDialog({
  open, onOpenChange, programId, programKey, programName, levels, course, onSubmit,
}: Props) {
  const isEdit = !!course;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [levelIds, setLevelIds] = useState<string[]>([]);
  const [studyPlanIds, setStudyPlanIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    if (course) {
      setName(course.name);
      setDescription(course.description ?? "");
      setLongDescription(course.long_description ?? "");
      setOutcomes(course.outcomes.length ? course.outcomes : [""]);
      setLevelIds(course.level_ids);
      setStudyPlanIds(course.study_plan_ids);
    } else {
      setName("");
      setDescription("");
      setLongDescription("");
      setOutcomes([""]);
      setLevelIds([]);
      setStudyPlanIds([]);
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa khoá học" : "Tạo khoá học mới"}
          </DialogTitle>
          <DialogDescription>
            Thuộc chương trình <strong>{programName}</strong>. Khoá học là gói nội dung độc
            lập với cấp độ — có thể gắn nhiều cấp độ và nhiều study plan.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Tên */}
            <div className="space-y-1.5">
              <Label htmlFor="course-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tên khoá học *
              </Label>
              <Input
                id="course-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='vd. "IELTS 6.5 Foundation", "WRE Advanced Track"'
              />
            </div>

            {/* Mô tả ngắn */}
            <div className="space-y-1.5">
              <Label htmlFor="course-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mô tả ngắn
              </Label>
              <Textarea
                id="course-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="1-2 câu xuất hiện trên thẻ khoá học."
                rows={2}
              />
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
                rows={4}
              />
            </div>

            {/* Outcomes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Đầu ra ({outcomes.filter((o) => o.trim()).length})
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={addOutcome} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Thêm
                </Button>
              </div>
              <div className="space-y-1.5">
                {outcomes.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={o}
                      onChange={(e) => updateOutcome(i, e.target.value)}
                      placeholder={`Đầu ra ${i + 1}`}
                    />
                    {outcomes.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOutcome(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Levels */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cấp độ thuộc khoá ({levelIds.length})
              </Label>
              {levels.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Chương trình này chưa có cấp độ nào. Thêm cấp độ ở phần "Khoá học/ Cấp độ".
                </p>
              ) : (
                <div className="grid gap-1.5 grid-cols-2 rounded-lg border p-2 bg-muted/20">
                  {levels.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-background cursor-pointer">
                      <Checkbox
                        checked={levelIds.includes(l.id)}
                        onCheckedChange={() => toggleLevel(l.id)}
                      />
                      <span className="text-sm truncate">{l.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Study plans */}
            <StudyPlanSection
              programName={programName}
              programKey={programKey}
              templates={eligibleTemplates}
              loading={templatesLoading}
              selectedIds={studyPlanIds}
              onToggle={togglePlan}
              onMakeDefault={makePlanDefault}
            />
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "Cập nhật" : "Tạo khoá học"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────── Study Plan section (rich) ────────────────────── */

function StudyPlanSection({
  programName, programKey, templates, loading, selectedIds, onToggle, onMakeDefault,
}: {
  programName: string;
  programKey: string;
  templates: any[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onMakeDefault: (id: string) => void;
}) {
  const defaultId = selectedIds[0] ?? null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Study plan ({selectedIds.length})
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

      {loading ? (
        <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải study plans…
        </div>
      ) : templates.length === 0 ? (
        <EmptyPlansState programName={programName} programKey={programKey} />
      ) : (
        <div className="rounded-lg border bg-muted/20 max-h-48 overflow-y-auto divide-y">
          {templates.map((t: any) => {
            const checked = selectedIds.includes(t.id);
            const isDefault = checked && defaultId === t.id;
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-background"
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
          to={`/study-plans/templates?program=${encodeURIComponent(programKey)}`}
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
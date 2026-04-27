import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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

  const { data: allTemplates } = useStudyPlanTemplates();
  // Lọc study plan templates theo program (nếu template có program field)
  const eligibleTemplates = (allTemplates ?? []).filter((t: any) => {
    if (!t.program) return true;
    return t.program.toLowerCase() === programKey.toLowerCase();
  });

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
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Study plan templates ({studyPlanIds.length})
              </Label>
              {eligibleTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Chưa có study plan template phù hợp với chương trình này.
                </p>
              ) : (
                <div className="grid gap-1.5 rounded-lg border p-2 bg-muted/20 max-h-40 overflow-y-auto">
                  {eligibleTemplates.map((t: any) => (
                    <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-background cursor-pointer">
                      <Checkbox
                        checked={studyPlanIds.includes(t.id)}
                        onCheckedChange={() => togglePlan(t.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{t.template_name}</p>
                        {t.assigned_level && (
                          <p className="text-[10px] text-muted-foreground truncate">{t.assigned_level}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
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
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { COLOR_PRESETS } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";
import { useStudyPlanTemplates } from "@shared/hooks/useStudyPlanTemplates";
import { useCourseLevels, type CourseLevel } from "@shared/hooks/useCourseLevels";
import type { CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";

/**
 * LevelEditorDialog — form đầy đủ tạo/sửa 1 cấp độ (course_level).
 *
 * Trường:
 *   • Tên (bắt buộc), Màu, Chương trình (BẮT BUỘC chọn 1 — single)
 *   • Target score (free text), CEFR (enum A1..C2)
 *   • Mô tả dài, Outcomes (chip list)
 *   • Study Plan Template mặc định
 *
 * Schema vẫn many-to-many (`program_levels`) nhưng UI ép single → khi save
 * sẽ xoá các link cũ và insert đúng 1 row. DB cũng có UNIQUE(level_id) sau
 * migration `20260427052737_course_levels_extend.sql` để chặn từ phía DB.
 */

const COLOR_KEYS = Object.keys(COLOR_PRESETS);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = create; else = edit */
  level: CourseLevel | null;
  /** Tất cả programs active để hiện trong select */
  programs: CourseProgram[];
  /** Program đang gắn (nếu edit). Khi create từ trong tab program, truyền vào để pre-select. */
  initialProgramId?: string | null;
  /** Callback gọi sau khi save thành công */
  onSaved: () => void | Promise<void>;
}

export default function LevelEditorDialog({
  open, onOpenChange, level, programs, initialProgramId, onSaved,
}: Props) {
  const isEdit = !!level;
  const { levels: allLevels } = useCourseLevels({ includeOrphans: true });
  const { data: templates = [] } = useStudyPlanTemplates();

  // Issue #11 fix: filter templates theo program của level được edit (lookup
  // program.key từ programs prop + programId state). Templates không có program
  // (generic) cũng pass — admin có thể dùng cho bất cứ chương trình nào.
  // Match pattern với CourseEditorDialog + CourseStudyPlansDialog.
  const filteredTemplates = useMemo(() => {
    const programKey = programs.find((p) => p.id === programId)?.key;
    if (!programKey) return [];
    return templates.filter(
      (t) => !t.program || t.program.toLowerCase() === programKey.toLowerCase(),
    );
  }, [templates, programs, programId]);

  // Form state
  const [name, setName] = useState("");
  const [colorKey, setColorKey] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string>("");
  const [targetScore, setTargetScore] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [outcomeInput, setOutcomeInput] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Reset/preload khi mở
  useEffect(() => {
    if (!open) return;
    if (level) {
      setName(level.name ?? "");
      setColorKey(level.color_key ?? null);
      setTargetScore(level.target_score ?? "");
      setLongDescription(level.long_description ?? "");
      setOutcomes(Array.isArray(level.outcomes) ? level.outcomes : []);
      setTemplateId(level.study_plan_template_id ?? "");
      // resolve program đang gắn
      const owning = programs.find((p) => p.level_ids.includes(level.id));
      setProgramId(owning?.id ?? initialProgramId ?? "");
    } else {
      setName("");
      setColorKey(null);
      setTargetScore("");
      setLongDescription("");
      setOutcomes([]);
      setTemplateId("");
      setProgramId(initialProgramId ?? "");
    }
    setOutcomeInput("");
  }, [open, level, programs, initialProgramId]);

  const addOutcome = () => {
    const v = outcomeInput.trim();
    if (!v) return;
    if (outcomes.includes(v)) { toast.error("Đầu ra này đã có"); return; }
    setOutcomes((prev) => [...prev, v]);
    setOutcomeInput("");
  };
  const removeOutcome = (idx: number) =>
    setOutcomes((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Tên cấp độ không được để trống"); return; }
    if (!programId) { toast.error("Phải chọn 1 chương trình cho cấp độ"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        color_key: colorKey,
        target_score: targetScore.trim() || null,
        long_description: longDescription.trim() || null,
        outcomes,
        study_plan_template_id: templateId || null,
      };

      let levelId = level?.id ?? null;
      if (isEdit && level) {
        const { error } = await (supabase as any)
          .from("course_levels")
          .update(payload)
          .eq("id", level.id);
        if (error) throw error;
      } else {
        const maxOrder = allLevels.length > 0
          ? Math.max(...allLevels.map((l) => l.sort_order ?? 0))
          : 0;
        const { data, error } = await (supabase as any)
          .from("course_levels")
          .insert({ ...payload, sort_order: maxOrder + 1 })
          .select("id")
          .single();
        if (error) {
          if (error.code === "23505") toast.error("Tên cấp độ đã tồn tại");
          else toast.error(`Lỗi: ${error.message}`);
          return;
        }
        levelId = data!.id;
      }

      // Sync program_levels: 1 level chỉ thuộc 1 program (DB cũng có UNIQUE).
      if (levelId) {
        await (supabase as any).from("program_levels").delete().eq("level_id", levelId);
        const { error: linkErr } = await (supabase as any)
          .from("program_levels")
          .insert({ program_id: programId, level_id: levelId, sort_order: 0 });
        if (linkErr) {
          toast.error(`Lỗi gán chương trình: ${linkErr.message}`);
          return;
        }
      }

      toast.success(isEdit ? "Đã cập nhật cấp độ" : "Đã tạo cấp độ");
      await onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa cấp độ "${level?.name}"` : "Tạo cấp độ mới"}</DialogTitle>
          <DialogDescription>
            Mỗi cấp độ thuộc <strong>đúng 1</strong> chương trình. Lớp tạo từ cấp độ
            này sẽ kế thừa Study Plan Template (nếu có).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Row 1: Tên + Màu */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label className="text-xs">Tên cấp độ *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vd. Beginner, Ra khơi 1, Intermediate…"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Màu</Label>
              <ColorPickerInline value={colorKey} onChange={setColorKey} />
            </div>
          </div>

          {/* Row 2: Chương trình (single) */}
          <div>
            <Label className="text-xs">Chương trình *</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Chọn chương trình…" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => {
                  const Icon = getProgramIcon(p.key);
                  const pal = getProgramPalette(p.key);
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("h-4 w-4 rounded flex items-center justify-center", pal.iconBg)}>
                          <Icon className={cn("h-2.5 w-2.5", pal.iconText)} />
                        </span>
                        {p.name}
                        <code className="text-[10px] text-muted-foreground">{p.key}</code>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Đổi chương trình sẽ chuyển cấp độ này sang chương trình mới.
            </p>
          </div>

          {/* Row 3: Target score (CEFR quản lý ở dialog "Map CEFR") */}
          <div>
            <Label className="text-xs">Điểm mục tiêu</Label>
            <Input
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              placeholder="vd. IELTS 6.5, WRE 80/100…"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              CEFR (A1–C2) được quản lý tập trung ở nút <strong>"Map CEFR"</strong> trên trang Cấp độ —
              1 cấp có thể map nhiều CEFR.
            </p>
          </div>

          {/* Mô tả dài */}
          <div>
            <Label className="text-xs">Mô tả chi tiết</Label>
            <Textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder="Mô tả mục tiêu cấp độ, đối tượng phù hợp, nội dung chính…"
              className="min-h-[80px] text-sm"
            />
          </div>

          {/* Outcomes (chip list) */}
          <div>
            <Label className="text-xs">Đầu ra cụ thể</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={outcomeInput}
                onChange={(e) => setOutcomeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOutcome(); } }}
                placeholder="vd. Đọc hiểu bài 700 từ, viết essay 250 từ…"
                className="h-9 text-sm flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addOutcome} disabled={!outcomeInput.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Thêm
              </Button>
            </div>
            {outcomes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {outcomes.map((o, i) => (
                  <span
                    key={`${o}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                  >
                    <span>{o}</span>
                    <button
                      type="button"
                      onClick={() => removeOutcome(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Xoá ${o}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Study Plan Template */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              Study Plan Template mặc định
            </Label>
            <Select
              value={templateId || "__none"}
              onValueChange={(v) => setTemplateId(v === "__none" ? "" : v)}
              disabled={!programId}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={!programId ? "Chọn chương trình trước" : "—"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Không gắn template</SelectItem>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.template_name}
                    {t.assigned_level && (
                      <span className="text-muted-foreground text-[10px] ml-1">({t.assigned_level})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Lớp tạo ra từ cấp độ này sẽ tự động dùng template làm khung buổi học.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !programId}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Tạo cấp độ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Inline color picker (mini) ───────── */
function ColorPickerInline({
  value, onChange,
}: { value: string | null; onChange: (key: string | null) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 w-9 rounded-md border-2 transition-all hover:scale-105",
            value ? "border-foreground/30" : "border-dashed border-muted-foreground/40",
          )}
          style={{ backgroundColor: value ? COLOR_PRESETS[value]?.swatch : "transparent" }}
          title="Chọn màu"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">Chọn màu</p>
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
              "h-7 w-7 rounded-full border-2 border-dashed transition-all hover:scale-110",
              value === null ? "border-foreground ring-2 ring-primary/30" : "border-muted-foreground/40",
            )}
            title="Không màu"
          />
          {COLOR_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
                value === k ? "border-foreground ring-2 ring-primary/30 scale-110" : "border-transparent",
              )}
              style={{ backgroundColor: COLOR_PRESETS[k].swatch }}
              title={COLOR_PRESETS[k].label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { toast } from "sonner";
import { Plus, X, Loader2, GripVertical } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { CourseProgram, CourseProgramInput } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { COLOR_PRESETS } from "@shared/utils/levelColors";

const COLOR_OPTIONS = [
  "emerald", "blue", "violet", "orange", "rose", "cyan", "amber", "pink",
  "teal", "indigo", "purple", "red", "yellow", "green", "sky", "fuchsia",
] as const;

const ICON_OPTIONS = [
  "graduation-cap", "book-open", "sparkles", "calendar-days", "briefcase",
  "user", "users", "award", "globe", "languages", "trophy", "target",
  "rocket", "star", "heart",
] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CourseProgram | null;
  onSubmit: (input: CourseProgramInput) => Promise<void>;
}

export default function ProgramEditorDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  // Editor program — cần thấy mọi level để gán cho program này.
  const { levels } = useCourseLevels({ includeOrphans: true });
  const [saving, setSaving] = useState(false);

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [colorKey, setColorKey] = useState<string | null>("teal");
  const [iconKey, setIconKey] = useState<string | null>("graduation-cap");
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [levelIds, setLevelIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setKey(initial.key);
      setName(initial.name);
      setDescription(initial.description ?? "");
      setLongDescription(initial.long_description ?? "");
      setOutcomes(initial.outcomes ?? []);
      setColorKey(initial.color_key ?? "teal");
      setIconKey(initial.icon_key ?? "graduation-cap");
      setSortOrder(initial.sort_order ?? 0);
      setActive(initial.status === "active");
      setLevelIds(initial.level_ids ?? []);
    } else {
      setKey(""); setName(""); setDescription(""); setLongDescription("");
      setOutcomes([]); setOutcomeDraft("");
      setColorKey("teal"); setIconKey("graduation-cap");
      setSortOrder(0); setActive(true); setLevelIds([]);
    }
    setOutcomeDraft("");
  }, [open, initial]);

  const addOutcome = () => {
    const v = outcomeDraft.trim();
    if (!v) return;
    setOutcomes((prev) => [...prev, v]);
    setOutcomeDraft("");
  };

  const removeOutcome = (idx: number) =>
    setOutcomes((prev) => prev.filter((_, i) => i !== idx));

  const toggleLevel = (id: string) =>
    setLevelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const moveLevel = (from: number, to: number) => {
    if (to < 0 || to >= levelIds.length) return;
    const next = [...levelIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLevelIds(next);
  };

  const handleSubmit = async () => {
    if (!key.trim() || !name.trim()) {
      toast.error("Vui lòng nhập key và tên khóa học");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        key: key.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || null,
        long_description: longDescription.trim() || null,
        outcomes,
        color_key: colorKey,
        icon_key: iconKey,
        sort_order: sortOrder,
        status: active ? "active" : "inactive",
        level_ids: levelIds,
      });
      toast.success(initial ? "Đã cập nhật khóa học" : "Đã tạo khóa học");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không xác định"}`);
    } finally {
      setSaving(false);
    }
  };

  // Sắp xếp danh sách level: đã chọn (theo thứ tự levelIds) lên đầu
  const selectedLevels = levelIds
    .map((id) => levels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => !!l);
  const unselectedLevels = levels.filter((l) => !levelIds.includes(l.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}</DialogTitle>
          <DialogDescription>
            Khóa học (program) sẽ hiển thị trong toàn bộ hệ thống — đặt key bằng tiếng Anh viết liền (vd. <code>ielts</code>, <code>wre</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Key + Name */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label className="text-xs">Key (slug)</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="ielts"
                className="h-9 text-sm font-mono"
                disabled={!!initial}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Tên hiển thị</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="IELTS Academic"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs">Mô tả ngắn</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lộ trình luyện thi IELTS toàn diện 4 kỹ năng"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Mô tả chi tiết (tùy chọn)</Label>
            <Textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder="Mô tả đầy đủ về chương trình, đối tượng, phương pháp..."
              className="text-sm min-h-[80px]"
            />
          </div>

          {/* Color + Icon + Sort */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Màu sắc</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorKey(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
                      colorKey === c ? "border-foreground ring-2 ring-primary/30 scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: COLOR_PRESETS[c]?.swatch ?? `var(--${c}, #94a3b8)` }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Sort order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className="h-9 text-sm w-24"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Icon</Label>
            <div className="flex flex-wrap gap-1">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIconKey(ic)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono border transition-colors",
                    iconKey === ic
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border hover:bg-muted",
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Levels */}
          <div>
            <Label className="text-xs mb-1.5 block">
              Cấp độ ({levelIds.length} đã chọn)
            </Label>
            <div className="border rounded-lg bg-card divide-y max-h-48 overflow-y-auto">
              {selectedLevels.map((l, idx) => (
                <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 bg-primary/5">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground font-mono w-6">{idx + 1}</span>
                  <span
                    className="h-3 w-3 rounded-full border shrink-0"
                    style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                  />
                  <span className="text-sm flex-1">{l.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveLevel(idx, idx - 1)} disabled={idx === 0}>↑</Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveLevel(idx, idx + 1)} disabled={idx === selectedLevels.length - 1}>↓</Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleLevel(l.id)}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              {unselectedLevels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLevel(l.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 text-left"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span
                    className="h-3 w-3 rounded-full border shrink-0"
                    style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                  />
                  <span className="text-sm text-muted-foreground">{l.name}</span>
                </button>
              ))}
              {levels.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Chưa có level nào. Tạo level ở tab "Quản lý Level".
                </p>
              )}
            </div>
          </div>

          {/* Outcomes */}
          <div>
            <Label className="text-xs mb-1.5 block">Đầu ra (outcomes)</Label>
            <div className="flex gap-2">
              <Input
                value={outcomeDraft}
                onChange={(e) => setOutcomeDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOutcome())}
                placeholder="VD: Đạt band 6.5+ sau 3 tháng"
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={addOutcome} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {outcomes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {outcomes.map((o, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/40 text-sm">
                    <span className="text-primary font-mono text-xs">{i + 1}.</span>
                    <span className="flex-1">{o}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeOutcome(i)}>
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Active */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <Label className="text-sm">Trạng thái</Label>
              <p className="text-[11px] text-muted-foreground">
                {active ? "Đang hoạt động — hiển thị cho user" : "Đã ẩn — chỉ admin thấy"}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {initial ? "Lưu thay đổi" : "Tạo khóa học"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
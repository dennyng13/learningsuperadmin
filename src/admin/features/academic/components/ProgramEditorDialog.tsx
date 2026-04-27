import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Textarea } from "@shared/components/ui/textarea";
import { toast } from "sonner";
import { Plus, X, Loader2, GripVertical, ShieldAlert, Target, Sparkles } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { CourseProgram, CourseProgramInput } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { COLOR_PRESETS } from "@shared/utils/levelColors";
import { useAuth } from "@shared/hooks/useAuth";

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
  // ─── HARDCODE: chỉ admin / super_admin được TẠO Program (chương trình mới).
  // Edit Program vẫn cho mọi role có quyền vào trang này (đã được guard ở layout).
  const { isAdmin } = useAuth();
  const isCreate = !initial;
  const blockedFromCreate = isCreate && !isAdmin;

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
      setOutcomes(Array.isArray(initial.outcomes) ? initial.outcomes : []);
      setColorKey(initial.color_key ?? "teal");
      setIconKey(initial.icon_key ?? "graduation-cap");
      setSortOrder(initial.sort_order ?? 0);
      setActive(initial.status === "active");
      setLevelIds(initial.level_ids ?? []);
    } else {
      setKey(""); setName(""); setDescription("");
      setLongDescription(""); setOutcomes([]); setOutcomeDraft("");
      setColorKey("teal"); setIconKey("graduation-cap");
      setSortOrder(0); setActive(true); setLevelIds([]);
    }
  }, [open, initial]);

  const toggleLevel = (id: string) =>
    setLevelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const moveLevel = (from: number, to: number) => {
    if (to < 0 || to >= levelIds.length) return;
    const next = [...levelIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLevelIds(next);
  };

  const addOutcome = () => {
    const t = outcomeDraft.trim();
    if (!t) return;
    setOutcomes((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setOutcomeDraft("");
  };
  const removeOutcome = (idx: number) =>
    setOutcomes((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (blockedFromCreate) {
      toast.error("Chỉ Admin được tạo chương trình mới.");
      return;
    }
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
        outcomes: outcomes.map((o) => o.trim()).filter(Boolean),
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

        {blockedFromCreate && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-destructive">Chỉ Admin được tạo chương trình mới.</p>
              <p className="text-muted-foreground mt-0.5">
                Bạn chỉ có thể chỉnh sửa các chương trình hiện có. Liên hệ Admin nếu cần
                tạo chương trình mới (vd. IELTS, WRE, Customized).
              </p>
            </div>
          </div>
        )}

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

          {/* Mô tả ngắn — 1 dòng dùng ở list / chip */}
          <div>
            <Label className="text-xs">Mô tả ngắn</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lộ trình luyện thi IELTS toàn diện 4 kỹ năng"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Hiện ở danh sách / chip / breadcrumb (≤120 ký tự là vừa).
            </p>
          </div>

          {/* Mô tả chi tiết — paragraph dùng ở landing/giới thiệu */}
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Mô tả chi tiết
            </Label>
            <Textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder="Mô tả tổng quan về chương trình, đối tượng phù hợp, phương pháp giảng dạy, thời lượng tổng…"
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Đầu ra — outcomes (chip list) */}
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-emerald-600" />
              Đầu ra ({outcomes.length})
            </Label>
            <div className="mt-1.5 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={outcomeDraft}
                  onChange={(e) => setOutcomeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOutcome();
                    }
                  }}
                  placeholder="VD: Đạt IELTS 6.5+ sau 6 tháng"
                  className="h-9 text-sm flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={addOutcome} disabled={!outcomeDraft.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Thêm
                </Button>
              </div>
              {outcomes.length > 0 ? (
                <ul className="space-y-1.5">
                  {outcomes.map((o, idx) => (
                    <li
                      key={`${o}-${idx}`}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20"
                    >
                      <Target className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-sm flex-1 leading-snug">{o}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeOutcome(idx)}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Chưa có đầu ra nào — gõ và bấm Enter (hoặc Thêm) để liệt kê các kết quả học viên đạt được.
                </p>
              )}
            </div>
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
          <Button onClick={handleSubmit} disabled={saving || blockedFromCreate}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {initial ? "Lưu thay đổi" : "Tạo khóa học"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
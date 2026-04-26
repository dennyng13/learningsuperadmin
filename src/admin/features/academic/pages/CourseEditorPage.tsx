import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Plus, X, GripVertical, GraduationCap, Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { useCoursesAdmin, type CourseProgramInput } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { COLOR_PRESETS } from "@shared/utils/levelColors";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

/**
 * Trang full-screen tạo / chỉnh sửa Khóa học (program).
 *   • /courses/new        → tạo mới
 *   • /courses/:id/edit   → chỉnh sửa
 *
 * Layout 2 cột: form bên trái, preview card bên phải (giống thẻ trên list).
 * Tách khỏi `ProgramEditorDialog` để có không gian rộng cho mô tả + outcomes
 * + danh sách level (nhiều nội dung mô tả thì dialog quá chật).
 */

const COLOR_OPTIONS = [
  "emerald", "blue", "violet", "orange", "rose", "cyan", "amber", "pink",
  "teal", "indigo", "purple", "red", "yellow", "green", "sky", "fuchsia",
] as const;

const ICON_OPTIONS = [
  "graduation-cap", "book-open", "sparkles", "calendar-days", "briefcase",
  "user", "users", "award", "globe", "languages", "trophy", "target",
  "rocket", "star", "heart",
] as const;

export default function CourseEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { programs, loading: loadingPrograms, create, update, remove } = useCoursesAdmin();
  const { levels } = useCourseLevels();

  const initial = useMemo(
    () => (isEdit ? programs.find((p) => p.id === id) ?? null : null),
    [isEdit, id, programs],
  );

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

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hydrate khi vào edit mode
  useEffect(() => {
    if (!isEdit) return;
    if (!initial) return;
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
  }, [isEdit, initial]);

  const addOutcome = () => {
    const v = outcomeDraft.trim();
    if (!v) return;
    setOutcomes((prev) => [...prev, v]);
    setOutcomeDraft("");
  };
  const removeOutcome = (idx: number) =>
    setOutcomes((prev) => prev.filter((_, i) => i !== idx));
  const moveOutcome = (from: number, to: number) => {
    if (to < 0 || to >= outcomes.length) return;
    const next = [...outcomes];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setOutcomes(next);
  };

  const toggleLevel = (lid: string) =>
    setLevelIds((prev) => (prev.includes(lid) ? prev.filter((x) => x !== lid) : [...prev, lid]));
  const moveLevel = (from: number, to: number) => {
    if (to < 0 || to >= levelIds.length) return;
    const next = [...levelIds];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setLevelIds(next);
  };

  const handleSubmit = async () => {
    if (!key.trim() || !name.trim()) {
      toast.error("Vui lòng nhập key và tên khóa học");
      return;
    }
    setSaving(true);
    try {
      const payload: CourseProgramInput = {
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
      };
      if (isEdit && id) {
        await update(id, payload);
        toast.success("Đã cập nhật khóa học");
      } else {
        await create(payload);
        toast.success("Đã tạo khóa học");
      }
      navigate("/courses");
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không xác định"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await remove(id);
      toast.success("Đã xóa khóa học");
      navigate("/courses");
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không xác định"}`);
    }
  };

  const selectedLevels = levelIds
    .map((lid) => levels.find((l) => l.id === lid))
    .filter((l): l is NonNullable<typeof l> => !!l);
  const unselectedLevels = levels.filter((l) => !levelIds.includes(l.id));

  if (isEdit && loadingPrograms) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isEdit && !loadingPrograms && !initial) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center space-y-3">
        <p className="text-sm text-muted-foreground">Không tìm thấy khóa học.</p>
        <Button variant="outline" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  const PreviewIcon = getProgramIcon(key || "default");
  const previewPalette = getProgramPalette(key || "default");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <button
            onClick={() => navigate("/courses")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Quản lý Khóa học
          </button>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            {isEdit ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Khóa học (program) sẽ hiển thị trong toàn bộ hệ thống — đặt key bằng tiếng Anh viết liền (vd. <code>ielts</code>, <code>wre</code>).
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isEdit && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate("/courses")} disabled={saving}>
            Hủy
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEdit ? "Lưu thay đổi" : "Tạo khóa học"}
          </Button>
        </div>
      </header>

      {/* 2-column layout */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ─── LEFT: Form ─── */}
        <div className="space-y-5">
          {/* Basic info */}
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <SectionHeader
              title="Thông tin cơ bản"
              hint="Tên hiển thị + slug định danh (key) — không thể đổi sau khi tạo."
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <Label className="text-xs">Key (slug)</Label>
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="ielts"
                  className="h-9 text-sm font-mono"
                  disabled={isEdit}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Tên hiển thị</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="IELTS Academic"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Mô tả ngắn</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lộ trình luyện thi IELTS toàn diện 4 kỹ năng"
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Hiển thị ở thẻ tóm tắt trong danh sách.
              </p>
            </div>
            <div>
              <Label className="text-xs">Mô tả chi tiết</Label>
              <Textarea
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Mô tả đầy đủ về chương trình, đối tượng, phương pháp giảng dạy, lộ trình..."
                className="text-sm min-h-[140px]"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Markdown được hỗ trợ. Hiển thị trên trang chi tiết khóa học (sắp tới).
              </p>
            </div>
          </section>

          {/* Visual identity */}
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <SectionHeader title="Nhận diện" hint="Màu + icon dùng trong list, badges, và lịch học." />
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
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
                        colorKey === c
                          ? "border-foreground ring-2 ring-primary/30 scale-110"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: COLOR_PRESETS[c]?.swatch ?? `var(--${c}, #94a3b8)` }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Sort order</Label>
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
          </section>

          {/* Levels */}
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <SectionHeader
              title={`Cấp độ (${levelIds.length} đã chọn)`}
              hint="Chọn các level thuộc khóa này. Kéo để sắp xếp thứ tự hiển thị."
            />
            <div className="border rounded-lg bg-background divide-y max-h-72 overflow-y-auto">
              {selectedLevels.map((l, idx) => (
                <div key={l.id} className="flex items-center gap-2 px-3 py-2 bg-primary/5">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground font-mono w-6">{idx + 1}</span>
                  <span
                    className="h-3 w-3 rounded-full border shrink-0"
                    style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                  />
                  <span className="text-sm flex-1">{l.name}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveLevel(idx, idx - 1)} disabled={idx === 0}>↑</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveLevel(idx, idx + 1)} disabled={idx === selectedLevels.length - 1}>↓</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleLevel(l.id)}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              {unselectedLevels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLevel(l.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-left"
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
                <p className="text-xs text-muted-foreground text-center py-4">
                  Chưa có level nào. Tạo level ở tab "Cấp độ" trong trang Quản lý Khóa học.
                </p>
              )}
            </div>
          </section>

          {/* Outcomes */}
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <SectionHeader
              title={`Đầu ra (${outcomes.length})`}
              hint="Liệt kê các kết quả/cam kết khi học viên hoàn thành khóa."
            />
            <div className="flex gap-2">
              <Input
                value={outcomeDraft}
                onChange={(e) => setOutcomeDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOutcome())}
                placeholder="VD: Đạt band 6.5+ sau 3 tháng"
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={addOutcome} variant="secondary" className="gap-1">
                <Plus className="h-4 w-4" /> Thêm
              </Button>
            </div>
            {outcomes.length > 0 && (
              <ul className="space-y-1">
                {outcomes.map((o, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-muted/40 text-sm group"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-primary font-mono text-xs w-5">{i + 1}.</span>
                    <span className="flex-1">{o}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveOutcome(i, i - 1)} disabled={i === 0}>↑</Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveOutcome(i, i + 1)} disabled={i === outcomes.length - 1}>↓</Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeOutcome(i)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Status */}
          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold">Trạng thái</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {active ? "Đang hoạt động — hiển thị cho user" : "Đã ẩn — chỉ admin thấy"}
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </section>
        </div>

        {/* ─── RIGHT: Live preview ─── */}
        <aside className="space-y-3 lg:sticky lg:top-4 self-start">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Xem trước thẻ
          </p>
          <div className={cn(
            "rounded-xl border bg-card overflow-hidden",
            !active && "opacity-60",
          )}>
            <div className={cn("h-1 w-full", previewPalette.progressFill)} />
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", previewPalette.iconBg)}>
                  <PreviewIcon className={cn("h-5 w-5", previewPalette.iconText)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base truncate">
                    {name || "Tên khóa học"}
                  </h3>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {key || "key-slug"}
                  </p>
                </div>
              </div>
              {description && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {description}
                </p>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Cấp độ ({selectedLevels.length})
                </p>
                {selectedLevels.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 italic">Chưa gán level</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedLevels.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 text-[10px] font-medium"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                        />
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Đầu ra ({outcomes.length})
                </p>
                {outcomes.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 italic">Chưa có outcome</p>
                ) : (
                  <ul className="space-y-0.5">
                    {outcomes.slice(0, 3).map((o, i) => (
                      <li key={i} className="text-[11px] leading-snug text-foreground/80">
                        • {o}
                      </li>
                    ))}
                    {outcomes.length > 3 && (
                      <li className="text-[10px] text-muted-foreground">+{outcomes.length - 3} mục khác</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khóa học này?</AlertDialogTitle>
            <AlertDialogDescription>
              Liên kết level sẽ bị xóa theo. Lớp/bài tập đã gán khóa này sẽ giữ
              lại giá trị cũ nhưng có thể không hiển thị màu/tên đúng nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="font-display font-bold text-base">{title}</h2>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
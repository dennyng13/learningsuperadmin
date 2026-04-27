/**
 * CourseStudyPlansDialog — popup search & gán Study Plan vào một khoá học.
 *
 * Hai vùng dữ liệu:
 *   1. "Đã gắn tag khoá học này"  — templates có `course_id === course.id`
 *      hoặc đang được link sẵn qua bảng `course_study_plans`.
 *   2. "Tìm thêm"                 — toàn bộ template còn lại, lọc theo:
 *        · query (tên / level / skills / mô tả)
 *        · scope: cùng program ↔ tất cả program
 *
 * UX highlights:
 *   - Toggle nhanh bằng click cả hàng (checkbox + label cùng zone click).
 *   - Nút "Đặt mặc định" để đẩy plan lên đầu (idx 0 = default theo convention
 *     của `syncStudyPlans`).
 *   - Optimistic local state; chỉ commit khi user bấm "Lưu".
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList, Search, X, Star, Tag, Plus, ExternalLink, Loader2,
  Check, Sparkles, Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Checkbox } from "@shared/components/ui/checkbox";
import { cn } from "@shared/lib/utils";
import { getProgramPalette } from "@shared/utils/programColors";
import { useStudyPlanTemplates } from "@shared/hooks/useStudyPlanTemplates";
import type { Course } from "@admin/features/academic/hooks/useCourses";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: Course;
  programKey: string;
  programName: string;
  /** Commit thay đổi — parent gọi `updateStudyPlans(course.id, ids)`. */
  onSave: (templateIds: string[]) => Promise<void>;
}

export default function CourseStudyPlansDialog({
  open, onOpenChange, course, programKey, programName, onSave,
}: Props) {
  const palette = getProgramPalette(programKey);
  const { data: allTemplates, isLoading } = useStudyPlanTemplates();

  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"program" | "all">("program");
  const [saving, setSaving] = useState(false);

  // Reset state khi mở dialog hoặc course đổi.
  useEffect(() => {
    if (!open) return;
    setSelected(course.study_plan_ids);
    setQuery("");
    setScope("program");
  }, [open, course.id, course.study_plan_ids]);

  // Đồng bộ phòng vệ: khi templates load xong, loại bỏ id không còn tồn tại.
  useEffect(() => {
    if (!open || isLoading) return;
    const validIds = new Set((allTemplates ?? []).map((t) => t.id));
    setSelected((arr) => arr.filter((id) => validIds.has(id)));
  }, [open, isLoading, allTemplates]);

  /** Templates đã được tag trực tiếp với course này, hoặc đã link sẵn. */
  const tagged = useMemo(() => {
    const list = allTemplates ?? [];
    const linkedSet = new Set(course.study_plan_ids);
    return list.filter(
      (t: any) => t.course_id === course.id || linkedSet.has(t.id),
    );
  }, [allTemplates, course.id, course.study_plan_ids]);

  const taggedIds = useMemo(() => new Set(tagged.map((t) => t.id)), [tagged]);

  /** Templates còn lại — vùng "Tìm thêm". */
  const others = useMemo(() => {
    const list = allTemplates ?? [];
    return list.filter((t: any) => !taggedIds.has(t.id));
  }, [allTemplates, taggedIds]);

  const filteredOthers = useMemo(() => {
    let list = others;
    if (scope === "program") {
      list = list.filter(
        (t: any) => !t.program || t.program.toLowerCase() === programKey.toLowerCase(),
      );
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t: any) => {
      const blob = [
        t.template_name, t.assigned_level, t.program, t.description,
        ...(Array.isArray(t.skills) ? t.skills : []),
      ].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [others, scope, query, programKey]);

  const defaultId = selected[0] ?? null;
  const dirty = useMemo(() => {
    if (selected.length !== course.study_plan_ids.length) return true;
    return selected.some((id, i) => id !== course.study_plan_ids[i]);
  }, [selected, course.study_plan_ids]);

  const toggle = (id: string) =>
    setSelected((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  const makeDefault = (id: string) =>
    setSelected((arr) => [id, ...arr.filter((x) => x !== id)]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      toast.success("Đã cập nhật study plan của khoá học.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Lưu thất bại: ${e?.message ?? "không rõ"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[88vh] sm:h-[min(88vh,720px)] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className={cn("px-5 pt-4 pb-3 border-b", palette.accentSoftBg)}>
          <div className="flex items-start gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", palette.iconBg)}>
              <ClipboardList className={cn("h-5 w-5", palette.iconText)} />
            </div>
            <DialogHeader className="space-y-0.5 text-left flex-1 min-w-0">
              <DialogTitle className="text-base font-display font-extrabold leading-tight">
                Gán Study plan
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Khoá <span className={cn("font-semibold", palette.accentText)}>{course.name}</span>
                {" · "}
                <span className="text-muted-foreground">{programName}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Đã chọn</p>
              <p className={cn("text-2xl font-display font-extrabold leading-none", palette.accentText)}>
                {selected.length}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5 scrollbar-prominent">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải study plans…
            </div>
          ) : (
            <>
              {/* ── Section 1: Đã gắn tag ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className={cn("h-3.5 w-3.5", palette.iconText)} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Gắn tag khoá học này ({tagged.length})
                    </h3>
                  </div>
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Link to="/study-plans/templates" target="_blank" rel="noopener noreferrer">
                      <Plus className="h-3 w-3" /> Tạo mới <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </Link>
                  </Button>
                </div>

                {tagged.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      Chưa có template nào được gắn tag với khoá này.
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      Tìm thêm bên dưới hoặc tạo mới ở trang Study plans.
                    </p>
                  </div>
                ) : (
                  <ul className="rounded-xl border bg-muted/10 divide-y">
                    {tagged.map((t: any) => (
                      <PlanRow
                        key={t.id}
                        template={t}
                        checked={selected.includes(t.id)}
                        isDefault={defaultId === t.id}
                        onToggle={() => toggle(t.id)}
                        onMakeDefault={() => makeDefault(t.id)}
                        palette={palette}
                        taggedToCourse={t.course_id === course.id}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* ── Section 2: Tìm thêm ── */}
              <section className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Search className={cn("h-3.5 w-3.5", palette.iconText)} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tìm thêm Study plan
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tìm theo tên, level, skill, mô tả…"
                      className="h-8 pl-8 pr-8 text-sm"
                      autoFocus
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Xoá tìm kiếm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="inline-flex rounded-md border bg-background p-0.5 text-[11px]">
                    {([
                      ["program", programName],
                      ["all", "Tất cả program"],
                    ] as const).map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setScope(v)}
                        className={cn(
                          "px-2 py-1 rounded transition-colors font-semibold",
                          scope === v
                            ? cn(palette.iconBg, palette.iconText)
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredOthers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6 rounded-lg border bg-muted/10">
                    {query
                      ? `Không có study plan khớp "${query}".`
                      : others.length === 0
                        ? "Tất cả study plans hiện có đều đã gắn tag với khoá này."
                        : "Không có plan trong phạm vi này."}
                  </p>
                ) : (
                  <ul className="rounded-xl border bg-muted/10 divide-y max-h-[320px] overflow-y-auto">
                    {filteredOthers.map((t: any) => (
                      <PlanRow
                        key={t.id}
                        template={t}
                        checked={selected.includes(t.id)}
                        isDefault={defaultId === t.id}
                        onToggle={() => toggle(t.id)}
                        onMakeDefault={() => makeDefault(t.id)}
                        palette={palette}
                        taggedToCourse={false}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* Hint footer */}
              <div className="rounded-lg border bg-muted/30 p-2.5 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Plan đầu tiên trong danh sách "đã chọn" sẽ là <strong>mặc định</strong> khi tạo lớp.
                  Dùng <Star className="inline h-3 w-3 align-text-top" /> để đẩy plan khác lên đầu.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t bg-background flex items-center sm:justify-between gap-2">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            {dirty
              ? <><Sparkles className="inline h-3 w-3 mr-1" />Có thay đổi chưa lưu</>
              : "Chưa có thay đổi"}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Lưu thay đổi
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Sub-components ─────────────────────────── */

function PlanRow({
  template, checked, isDefault, onToggle, onMakeDefault, palette, taggedToCourse,
}: {
  template: any;
  checked: boolean;
  isDefault: boolean;
  onToggle: () => void;
  onMakeDefault: () => void;
  palette: ReturnType<typeof getProgramPalette>;
  taggedToCourse: boolean;
}) {
  const sessions = template.total_sessions;
  const skills: string[] = Array.isArray(template.skills) ? template.skills : [];
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 px-3 py-2.5 transition-colors cursor-pointer",
        checked ? cn(palette.accentSoftBg, "hover:opacity-90") : "hover:bg-background",
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={cn("text-sm font-semibold truncate", checked && palette.accentText)}>
            {template.template_name}
          </p>
          {isDefault && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded",
              palette.iconBg, palette.iconText,
            )}>
              <Star className="h-2.5 w-2.5 fill-current" /> Mặc định
            </span>
          )}
          {taggedToCourse && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <Tag className="h-2.5 w-2.5" /> Tag
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[10.5px] text-muted-foreground">
          {template.program && (
            <span className="uppercase font-bold tracking-wider">{template.program}</span>
          )}
          {template.assigned_level && (
            <span>· {template.assigned_level}</span>
          )}
          {sessions != null && sessions > 0 && (
            <span>· {sessions} buổi</span>
          )}
          {skills.length > 0 && (
            <span className="truncate">· {skills.slice(0, 3).join(" / ")}</span>
          )}
        </div>
        {template.description && (
          <p className="text-[11px] text-muted-foreground/80 mt-0.5 line-clamp-1">
            {template.description}
          </p>
        )}
      </div>
      {checked && !isDefault && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-[10.5px] gap-1 px-2 shrink-0"
          onClick={(e) => { e.stopPropagation(); onMakeDefault(); }}
          title="Đặt làm plan mặc định"
        >
          <Star className="h-3 w-3" /> Mặc định
        </Button>
      )}
    </li>
  );
}
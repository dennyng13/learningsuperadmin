import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Check, X, GripVertical, Loader2, Layers, ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { COLOR_PRESETS, getLevelColor } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";
import { useCoursesAdmin, type CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels, type CourseLevel } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";

/**
 * /courses/levels — Trang quản lý cấp độ tập trung.
 *
 * Mỗi level có badge các program đang dùng. Khi tạo level mới bắt buộc chọn
 * ≥1 program (multi-select). Edit/Delete ở đây để tránh ảnh hưởng nhầm khi
 * đang ở tab program.
 */

const colorKeys = Object.keys(COLOR_PRESETS);

function ColorPicker({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 w-7 rounded-full border-2 shrink-0 transition-all hover:scale-110",
            value ? "border-foreground/30" : "border-dashed border-muted-foreground/40",
          )}
          style={{ backgroundColor: value ? COLOR_PRESETS[value]?.swatch : "#d1d5db" }}
          title="Chọn màu"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">Chọn màu</p>
        <div className="grid grid-cols-5 gap-2">
          {colorKeys.map((k) => (
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

function ProgramMultiSelect({
  programs,
  selectedIds,
  onChange,
  required,
}: {
  programs: CourseProgram[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  required?: boolean;
}) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  const empty = required && selectedIds.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 px-3 rounded-md border bg-background text-xs font-medium inline-flex items-center gap-2 hover:bg-muted/30 transition-colors",
            empty && "border-destructive/60 text-destructive",
          )}
        >
          {empty
            ? "Chọn khóa…"
            : selectedIds.length === 0
            ? "Khóa nào?"
            : `${selectedIds.length} khóa`}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-2">
          Cấp độ này thuộc khóa nào?
        </p>
        <div className="space-y-0.5 max-h-72 overflow-auto">
          {programs.map((p) => {
            const Icon = getProgramIcon(p.key);
            const palette = getProgramPalette(p.key);
            const checked = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors",
                  checked ? "bg-primary/10" : "hover:bg-muted/40",
                )}
              >
                <span className={cn(
                  "h-5 w-5 rounded flex items-center justify-center shrink-0",
                  palette.iconBg,
                )}>
                  <Icon className={cn("h-3 w-3", palette.iconText)} />
                </span>
                <span className="flex-1 truncate">{p.name}</span>
                {checked && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ───────────────────── Page ───────────────────── */

export default function CourseLevelsPage() {
  const { programs, loading: programsLoading, refetch: refetchPrograms } = useCoursesAdmin();
  const { levels, loading: levelsLoading, refetch: refetchLevels } = useCourseLevels();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");

  const programById = useMemo(
    () => new Map(programs.map((p) => [p.id, p])),
    [programs],
  );

  /** levelId → program[] (đảo ngược program.level_ids) */
  const programsByLevel = useMemo(() => {
    const m = new Map<string, CourseProgram[]>();
    for (const p of programs) {
      for (const lid of p.level_ids) {
        const arr = m.get(lid) ?? [];
        arr.push(p);
        m.set(lid, arr);
      }
    }
    return m;
  }, [programs]);

  /* ─── Add ─── */
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [newProgramIds, setNewProgramIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const addLevel = async () => {
    const name = newName.trim();
    if (!name) return;
    if (newProgramIds.length === 0) {
      toast.error("Phải chọn ít nhất 1 khóa cho cấp độ này");
      return;
    }
    setAdding(true);
    try {
      const maxOrder = levels.length > 0 ? Math.max(...levels.map((l) => l.sort_order)) : 0;
      const { data: created, error: insertErr } = await supabase
        .from("course_levels")
        .insert({ name, sort_order: maxOrder + 1, color_key: newColor })
        .select("id")
        .single();
      if (insertErr) {
        if (insertErr.code === "23505") toast.error("Tên cấp độ đã tồn tại");
        else toast.error(`Lỗi: ${insertErr.message}`);
        return;
      }
      const rows = newProgramIds.map((program_id, idx) => ({
        program_id,
        level_id: created!.id,
        sort_order: idx,
      }));
      const { error: linkErr } = await (supabase as any).from("program_levels").insert(rows);
      if (linkErr) {
        toast.error(`Lỗi liên kết: ${linkErr.message}`);
        return;
      }
      toast.success(`Đã tạo "${name}" trong ${newProgramIds.length} khóa`);
      setNewName("");
      setNewColor(null);
      setNewProgramIds([]);
      await Promise.all([refetchLevels(), refetchPrograms()]);
    } finally {
      setAdding(false);
    }
  };

  /* ─── Edit (name/color) ─── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editProgramIds, setEditProgramIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const focusedRef = useRef(false);

  // auto-open editor cho ?focus=
  useEffect(() => {
    if (focusedRef.current) return;
    if (!focusId || levelsLoading || programsLoading) return;
    const target = levels.find((l) => l.id === focusId);
    if (!target) return;
    focusedRef.current = true;
    startEdit(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, levels, levelsLoading, programsLoading]);

  const startEdit = (l: CourseLevel) => {
    setEditingId(l.id);
    setEditName(l.name);
    setEditColor(l.color_key);
    setEditProgramIds((programsByLevel.get(l.id) ?? []).map((p) => p.id));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor(null);
    setEditProgramIds([]);
  };
  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    if (editProgramIds.length === 0) {
      toast.error("Cấp độ phải gắn với ít nhất 1 khóa");
      return;
    }
    setSavingEdit(true);
    try {
      const { error: updErr } = await supabase
        .from("course_levels")
        .update({ name: editName.trim(), color_key: editColor })
        .eq("id", editingId);
      if (updErr) {
        toast.error(`Lỗi: ${updErr.message}`);
        return;
      }
      // Re-sync program_levels: xóa hết rồi insert lại set mới.
      const { error: delErr } = await (supabase as any)
        .from("program_levels")
        .delete()
        .eq("level_id", editingId);
      if (delErr) {
        toast.error(`Lỗi cập nhật khóa: ${delErr.message}`);
        return;
      }
      const rows = editProgramIds.map((program_id, idx) => ({
        program_id,
        level_id: editingId,
        sort_order: idx,
      }));
      if (rows.length > 0) {
        const { error: insErr } = await (supabase as any).from("program_levels").insert(rows);
        if (insErr) {
          toast.error(`Lỗi cập nhật khóa: ${insErr.message}`);
          return;
        }
      }
      toast.success("Đã cập nhật cấp độ");
      cancelEdit();
      await Promise.all([refetchLevels(), refetchPrograms()]);
    } finally {
      setSavingEdit(false);
    }
  };

  /* ─── Delete ─── */
  const [deleteTarget, setDeleteTarget] = useState<CourseLevel | null>(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("course_levels").delete().eq("id", deleteTarget.id);
    if (error) toast.error(`Lỗi xóa: ${error.message}`);
    else {
      toast.success(`Đã xóa "${deleteTarget.name}"`);
      await Promise.all([refetchLevels(), refetchPrograms()]);
    }
    setDeleteTarget(null);
  };

  const loading = programsLoading || levelsLoading;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs -ml-2 mb-2 text-muted-foreground">
            <Link to="/courses">
              <ArrowLeft className="h-3 w-3 mr-1" /> Quay lại danh sách khóa
            </Link>
          </Button>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <Layers className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Quản lý Cấp độ
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Mỗi cấp độ có thể thuộc nhiều khóa. Sửa/Xóa ở đây sẽ ảnh hưởng tới
            <em> tất cả</em> các khóa đang dùng cấp độ đó.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ─── Add row ─── */}
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h3 className="font-display font-bold text-sm">Tạo cấp độ mới</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ColorPicker value={newColor} onChange={setNewColor} />
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên cấp độ (vd. Ra khơi 1)…"
                className="h-9 text-sm flex-1 min-w-[200px] max-w-md"
                onKeyDown={(e) => e.key === "Enter" && addLevel()}
                disabled={adding}
              />
              <ProgramMultiSelect
                programs={programs}
                selectedIds={newProgramIds}
                onChange={setNewProgramIds}
                required
              />
              <Button
                size="sm"
                onClick={addLevel}
                disabled={adding || !newName.trim() || newProgramIds.length === 0}
              >
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span className="ml-1">Tạo</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Bắt buộc chọn ít nhất 1 khóa — cấp độ không gắn khóa sẽ không hiển thị ở đâu cả.
            </p>
          </section>

          {/* ─── List ─── */}
          <section className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <h3 className="font-display font-bold text-sm">
                Tất cả cấp độ ({levels.length})
              </h3>
            </div>

            {levels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12 italic">
                Chưa có cấp độ nào.
              </p>
            ) : (
              <div className="divide-y">
                {levels.map((l) => {
                  const isEditing = editingId === l.id;
                  const linkedPrograms = programsByLevel.get(l.id) ?? [];
                  return (
                    <div key={l.id} className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <ColorPicker value={editColor} onChange={setEditColor} />
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-9 text-sm flex-1 min-w-[200px] max-w-md"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <ProgramMultiSelect
                              programs={programs}
                              selectedIds={editProgramIds}
                              onChange={setEditProgramIds}
                              required
                            />
                            <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span className="ml-1">Lưu</span>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground pl-9">
                            Đổi danh sách khóa sẽ thêm/gỡ link, không xóa cấp độ.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full border shrink-0",
                              l.color_key ? "" : "border-dashed border-muted-foreground/40",
                            )}
                            style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                          />
                          <span className={cn(
                            "font-medium text-sm px-2 py-0.5 rounded shrink-0",
                            getLevelColor(l.color_key || l.name),
                          )}>
                            {l.name}
                          </span>

                          <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                            {linkedPrograms.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                                <AlertTriangle className="h-3 w-3" /> Chưa thuộc khóa nào
                              </span>
                            ) : (
                              linkedPrograms.map((p) => {
                                const Icon = getProgramIcon(p.key);
                                const palette = getProgramPalette(p.key);
                                return (
                                  <span
                                    key={p.id}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                      palette.iconBg,
                                      palette.iconText,
                                    )}
                                    title={`Thuộc khóa ${p.name}`}
                                  >
                                    <Icon className="h-2.5 w-2.5" />
                                    {p.name}
                                  </span>
                                );
                              })
                            )}
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            title="Sửa tên/màu/khóa"
                            onClick={() => startEdit(l)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            title="Xóa cấp độ vĩnh viễn (mọi khóa)"
                            onClick={() => setDeleteTarget(l)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cấp độ "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (() => {
                const linked = programsByLevel.get(deleteTarget.id) ?? [];
                return linked.length > 0 ? (
                  <>
                    Cấp độ đang thuộc <strong>{linked.length} khóa</strong> ({linked.map((p) => p.name).join(", ")})
                    và sẽ bị gỡ khỏi tất cả. Lớp/bài tập đã gán level này sẽ giữ
                    giá trị cũ nhưng có thể không hiển thị màu/tên đúng nữa.
                  </>
                ) : (
                  <>Cấp độ này hiện không thuộc khóa nào — sẽ bị xóa hoàn toàn.</>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
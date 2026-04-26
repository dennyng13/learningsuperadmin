import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Check, X, GripVertical, Loader2, Layers, Unlink,
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
import type { CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";

/**
 * ProgramLevelManager — CRUD cấp độ trong scope 1 program.
 *
 * Schema vẫn many-to-many (`course_levels` + `program_levels`):
 *   • Add        → insert vào `course_levels` rồi link vào `program_levels` cho
 *                  program hiện tại với sort_order tiếp theo.
 *   • Edit       → update name/color trên `course_levels` (ảnh hưởng global
 *                  nếu level cũng được dùng ở program khác — confirm trước).
 *   • Remove     → 2 lựa chọn:
 *                  (a) "Bỏ khỏi khóa này" — chỉ delete `program_levels` row.
 *                  (b) "Xóa hoàn toàn" — delete `course_levels` (cascade gỡ
 *                      khỏi mọi program). Cảnh báo rõ.
 *   • Sort       → kéo thả → update `program_levels.sort_order` cho program này.
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

interface Props {
  program: CourseProgram;
  /** Tất cả levels trong DB (để resolve metadata khi đã link) */
  allLevels: CourseLevel[];
  /** Callback gọi khi có thay đổi cần parent refetch */
  onChanged: () => void | Promise<void>;
}

type DeleteMode = "unlink" | "purge" | null;

export default function ProgramLevelManager({ program, allLevels, onChanged }: Props) {
  /* ─── Local list of linked levels (sorted theo program_levels.sort_order) ─── */
  const linkedLevels = useMemo(() => {
    const map = new Map(allLevels.map((l) => [l.id, l]));
    return program.level_ids
      .map((id) => map.get(id))
      .filter((l): l is CourseLevel => !!l);
  }, [program.level_ids, allLevels]);

  /* ─── Add form ─── */
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const addLevel = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      // 1. insert level (global pool)
      const maxOrder = allLevels.length > 0 ? Math.max(...allLevels.map((l) => l.sort_order)) : 0;
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
      // 2. link vào program với sort_order tiếp theo
      const nextProgramOrder = linkedLevels.length;
      const { error: linkErr } = await (supabase as any)
        .from("program_levels")
        .insert({
          program_id: program.id,
          level_id: created!.id,
          sort_order: nextProgramOrder,
        });
      if (linkErr) {
        toast.error(`Lỗi liên kết: ${linkErr.message}`);
        return;
      }
      toast.success(`Đã thêm "${name}" vào ${program.name}`);
      setNewName("");
      setNewColor(null);
      await onChanged();
    } finally {
      setAdding(false);
    }
  };

  /* ─── Edit (global) ─── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (l: CourseLevel) => {
    setEditingId(l.id);
    setEditName(l.name);
    setEditColor(l.color_key);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor(null);
  };
  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("course_levels")
      .update({ name: editName.trim(), color_key: editColor })
      .eq("id", editingId);
    if (error) toast.error(`Lỗi: ${error.message}`);
    else {
      toast.success("Đã cập nhật cấp độ");
      await onChanged();
    }
    setSavingEdit(false);
    cancelEdit();
  };

  /* ─── Delete (unlink hoặc purge) ─── */
  const [deleteTarget, setDeleteTarget] = useState<CourseLevel | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>(null);

  const askDelete = (l: CourseLevel, mode: Exclude<DeleteMode, null>) => {
    setDeleteTarget(l);
    setDeleteMode(mode);
  };
  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteMode(null);
  };
  const confirmDelete = async () => {
    if (!deleteTarget || !deleteMode) return;
    if (deleteMode === "unlink") {
      const { error } = await (supabase as any)
        .from("program_levels")
        .delete()
        .eq("program_id", program.id)
        .eq("level_id", deleteTarget.id);
      if (error) toast.error(`Lỗi gỡ link: ${error.message}`);
      else toast.success(`Đã gỡ "${deleteTarget.name}" khỏi ${program.name}`);
    } else {
      // purge — xóa khỏi course_levels (cascade tự gỡ program_levels)
      const { error } = await supabase
        .from("course_levels")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) toast.error(`Lỗi xóa: ${error.message}`);
      else toast.success(`Đã xóa cấp độ "${deleteTarget.name}"`);
    }
    cancelDelete();
    await onChanged();
  };

  /* ─── Drag sort (program_levels.sort_order, scope theo program) ─── */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<CourseLevel[] | null>(null);
  const savingOrderRef = useRef(false);

  const display = localOrder ?? linkedLevels;

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setOverIdx(idx);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDrop = async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      handleDragEnd();
      return;
    }
    const items = [...display];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(dropIdx, 0, moved);
    setLocalOrder(items);
    setDragIdx(null);
    setOverIdx(null);

    if (savingOrderRef.current) return;
    savingOrderRef.current = true;
    try {
      // Re-sync toàn bộ program_levels của program này (delete-all-insert).
      const { error: delErr } = await (supabase as any)
        .from("program_levels")
        .delete()
        .eq("program_id", program.id);
      if (delErr) {
        toast.error(`Lỗi sắp xếp: ${delErr.message}`);
        return;
      }
      const rows = items.map((l, i) => ({
        program_id: program.id,
        level_id: l.id,
        sort_order: i,
      }));
      if (rows.length > 0) {
        const { error: insErr } = await (supabase as any).from("program_levels").insert(rows);
        if (insErr) {
          toast.error(`Lỗi sắp xếp: ${insErr.message}`);
          return;
        }
      }
      await onChanged();
    } finally {
      savingOrderRef.current = false;
      setLocalOrder(null);
    }
  };

  /* ─── Reset local order khi program đổi ─── */
  useEffect(() => {
    setLocalOrder(null);
    cancelEdit();
    cancelDelete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program.id]);

  return (
    <section className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-sm">
            Cấp độ trong khóa ({display.length})
          </h3>
        </div>
        <p className="text-[11px] text-muted-foreground hidden sm:block">
          Kéo <GripVertical className="inline h-3 w-3" /> để sắp xếp
        </p>
      </div>

      {/* Add row */}
      <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
        <ColorPicker value={newColor} onChange={setNewColor} />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`Thêm cấp độ mới cho ${program.name}…`}
          className="h-9 text-sm"
          onKeyDown={(e) => e.key === "Enter" && addLevel()}
          disabled={adding}
        />
        <Button size="sm" onClick={addLevel} disabled={adding || !newName.trim()} className="shrink-0">
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="ml-1">Thêm</span>
        </Button>
      </div>

      {/* List */}
      <div className="rounded-lg border bg-card overflow-hidden divide-y">
        {display.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 italic">
            Chưa có cấp độ nào — thêm cấp độ đầu tiên cho khóa này.
          </p>
        ) : (
          display.map((l, idx) => {
            const isEditing = editingId === l.id;
            return (
              <div
                key={l.id}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 transition-colors select-none",
                  dragIdx === idx && "opacity-40",
                  overIdx === idx && dragIdx !== null && dragIdx !== idx && "bg-primary/10",
                  dragIdx === null && !isEditing && "hover:bg-muted/30",
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
                <span className="text-[10px] font-mono text-muted-foreground w-5 text-center shrink-0">
                  {idx + 1}
                </span>

                {isEditing ? (
                  <>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm flex-1 max-w-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit} disabled={savingEdit}>
                      {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4 text-primary" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full border shrink-0",
                        l.color_key ? "" : "border-dashed border-muted-foreground/40",
                      )}
                      style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                    />
                    <span className={cn(
                      "font-medium text-sm flex-1 px-2 py-0.5 rounded truncate",
                      getLevelColor(l.color_key || l.name),
                    )}>
                      {l.name}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Sửa tên/màu"
                      onClick={() => startEdit(l)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Bỏ khỏi khóa này (vẫn giữ cấp độ trong DB)"
                      onClick={() => askDelete(l, "unlink")}
                    >
                      <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Xóa cấp độ vĩnh viễn"
                      onClick={() => askDelete(l, "purge")}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        <Unlink className="inline h-3 w-3 mr-0.5" /> = bỏ khỏi khóa này (giữ trong các khóa khác).
        <span className="mx-1">·</span>
        <Trash2 className="inline h-3 w-3 mr-0.5 text-destructive/80" /> = xóa hoàn toàn khỏi hệ thống.
      </p>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "unlink" ? "Bỏ cấp độ khỏi khóa này?" : "Xóa cấp độ vĩnh viễn?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "unlink" ? (
                <>
                  Cấp độ <strong>{deleteTarget?.name}</strong> sẽ bị bỏ khỏi khóa{" "}
                  <strong>{program.name}</strong>, nhưng vẫn còn trong DB và các
                  khóa khác (nếu có).
                </>
              ) : (
                <>
                  Cấp độ <strong>{deleteTarget?.name}</strong> sẽ bị xóa khỏi
                  <em> mọi khóa học</em> đang dùng. Lớp/bài tập đã gán level này
                  sẽ giữ giá trị cũ nhưng có thể không hiển thị màu/tên đúng nữa.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={cn(
                deleteMode === "purge" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {deleteMode === "unlink" ? "Bỏ khỏi khóa" : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
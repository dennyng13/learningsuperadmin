import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseLevels, CourseLevel } from "@shared/hooks/useCourseLevels";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Check, X, GripVertical, Loader2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { cn } from "@shared/lib/utils";
import { COLOR_PRESETS, getLevelColor } from "@shared/utils/levelColors";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@shared/components/ui/popover";

const colorKeys = Object.keys(COLOR_PRESETS);

function ColorPicker({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 w-7 rounded-full border-2 shrink-0 transition-all hover:scale-110",
            value ? "border-foreground/30" : "border-dashed border-muted-foreground/40"
          )}
          style={{ backgroundColor: value ? COLOR_PRESETS[value]?.swatch : "#d1d5db" }}
          title="Chọn màu"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">Chọn màu cho level</p>
        <div className="grid grid-cols-5 gap-2">
          {colorKeys.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
                value === key ? "border-foreground ring-2 ring-primary/30 scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: COLOR_PRESETS[key].swatch }}
              title={COLOR_PRESETS[key].label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function CourseLevelManager() {
  // Trang quản lý cấp độ trong Settings — hiển thị cả level mồ côi / inactive
  // để admin có thể edit / xóa.
  const { levels, loading, refetch } = useCourseLevels({ includeOrphans: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColorKey, setEditColorKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColorKey, setNewColorKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [localLevels, setLocalLevels] = useState<CourseLevel[] | null>(null);

  const displayLevels = localLevels ?? levels;

  const startEdit = (l: CourseLevel) => {
    setEditingId(l.id);
    setEditName(l.name);
    setEditColorKey(l.color_key);
  };

  const cancelEdit = () => { setEditingId(null); setEditName(""); setEditColorKey(null); };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("course_levels")
      .update({ name: editName.trim(), color_key: editColorKey })
      .eq("id", editingId);
    if (error) toast.error("Lỗi cập nhật");
    else { toast.success("Đã cập nhật"); refetch(); }
    setSaving(false);
    setEditingId(null);
    setEditColorKey(null);
  };

  const addLevel = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const maxOrder = levels.length > 0 ? Math.max(...levels.map(l => l.sort_order)) : 0;
    const { error } = await supabase
      .from("course_levels")
      .insert({ name: newName.trim(), sort_order: maxOrder + 1, color_key: newColorKey });
    if (error) {
      if (error.code === "23505") toast.error("Level này đã tồn tại");
      else toast.error("Lỗi thêm level");
    } else {
      toast.success("Đã thêm level");
      setNewName("");
      setNewColorKey(null);
      refetch();
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("course_levels").delete().eq("id", deleteId);
    if (error) toast.error("Lỗi xóa");
    else { toast.success("Đã xóa"); refetch(); }
    setDeleteId(null);
  };

  // Drag handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setOverIdx(idx);
  };

  const handleDrop = async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const items = [...displayLevels];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(dropIdx, 0, moved);
    setLocalLevels(items);
    setDragIdx(null);
    setOverIdx(null);

    const updates = items.map((item, i) => ({ id: item.id, sort_order: i + 1 }));
    let hasError = false;
    for (const u of updates) {
      const { error } = await supabase
        .from("course_levels")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id);
      if (error) { hasError = true; break; }
    }
    if (hasError) {
      toast.error("Lỗi lưu thứ tự");
    }
    setLocalLevels(null);
    refetch();
  };

  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ColorPicker value={newColorKey} onChange={setNewColorKey} />
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Tên level mới..."
          className="max-w-xs h-9 text-sm"
          onKeyDown={e => e.key === "Enter" && addLevel()}
        />
        <Button size="sm" onClick={addLevel} disabled={saving || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Thêm
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Kéo thả <GripVertical className="inline h-3 w-3" /> để sắp xếp thứ tự</p>

      <div className="border rounded-xl overflow-hidden bg-card divide-y">
        {displayLevels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có level nào</p>
        ) : (
          displayLevels.map((l, idx) => (
            <div
              key={l.id}
              draggable={editingId !== l.id}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors select-none",
                dragIdx === idx && "opacity-40",
                overIdx === idx && dragIdx !== null && dragIdx !== idx && "bg-primary/10 border-primary",
                dragIdx === null && "hover:bg-muted/30",
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
              <span className="text-xs text-muted-foreground font-mono w-6 text-center">{idx + 1}</span>

              {editingId === l.id ? (
                <>
                  <ColorPicker value={editColorKey} onChange={setEditColorKey} />
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 text-sm flex-1 max-w-xs"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit} disabled={saving}>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      "inline-block h-5 w-5 rounded-full border shrink-0",
                      l.color_key ? "" : "border-dashed border-muted-foreground/40"
                    )}
                    style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                  />
                  <span className={cn(
                    "font-medium text-sm flex-1 px-2 py-0.5 rounded",
                    getLevelColor(l.color_key || l.name)
                  )}>
                    {l.name}
                  </span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(l)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(l.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa level này?</AlertDialogTitle>
            <AlertDialogDescription>
              Level sẽ bị xóa vĩnh viễn. Các lớp/bài tập đã gán level này sẽ không bị ảnh hưởng nhưng sẽ hiển thị giá trị cũ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

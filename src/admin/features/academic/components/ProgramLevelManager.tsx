import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus, GripVertical, Layers, Settings2, Pencil, Target, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { COLOR_PRESETS, getLevelColor } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";
import { useCoursesAdmin, type CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import LevelEditorDialog from "@admin/features/academic/components/LevelEditorDialog";

/**
 * ProgramLevelManager — list + drag-sort cấp độ trong scope 1 program.
 *
 * Tạo/sửa cấp độ qua `LevelEditorDialog` (form đầy đủ trường: outcomes,
 * mô tả dài, target score, CEFR, study plan template). Mỗi cấp độ thuộc
 * ĐÚNG 1 chương trình (UI + DB UNIQUE).
 */

interface Props {
  program: CourseProgram;
  /** Tất cả levels trong DB (để resolve metadata khi đã link) */
  allLevels: CourseLevel[];
  /** Callback gọi khi có thay đổi cần parent refetch */
  onChanged: () => void | Promise<void>;
}

export default function ProgramLevelManager({ program, allLevels, onChanged }: Props) {
  const { programs } = useCoursesAdmin();
  /* ─── Linked levels (theo program_levels.sort_order, từ program.level_ids) ─── */
  const linkedLevels = useMemo(() => {
    const map = new Map(allLevels.map((l) => [l.id, l]));
    return program.level_ids
      .map((id) => map.get(id))
      .filter((l): l is CourseLevel => !!l);
  }, [program.level_ids, allLevels]);

  /* ─── Editor dialog ─── */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CourseLevel | null>(null);
  const openCreate = () => { setEditingLevel(null); setEditorOpen(true); };
  const openEdit = (l: CourseLevel) => { setEditingLevel(l); setEditorOpen(true); };

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

  /* ─── Reset local state khi program đổi ─── */
  useEffect(() => {
    setLocalOrder(null);
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
        <div className="flex items-center gap-1">
          <Button onClick={openCreate} size="sm" className="h-7 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Thêm cấp độ
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1.5">
            <Link to="/courses/levels">
              <Settings2 className="h-3.5 w-3.5" /> Quản lý tập trung
            </Link>
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-lg border bg-card overflow-hidden divide-y">
        {display.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 italic">
            Chưa có cấp độ nào — thêm cấp độ đầu tiên cho khóa này.
          </p>
        ) : (
          display.map((l, idx) => (
            <div
              key={l.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2 px-3 py-2 transition-colors select-none",
                dragIdx === idx && "opacity-40",
                overIdx === idx && dragIdx !== null && dragIdx !== idx && "bg-primary/10",
                dragIdx === null && "hover:bg-muted/30",
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground w-5 text-center shrink-0">
                {idx + 1}
              </span>
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full border shrink-0",
                  l.color_key ? "" : "border-dashed border-muted-foreground/40",
                )}
                style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
              />
              <span className={cn(
                "font-medium text-sm px-2 py-0.5 rounded truncate shrink-0",
                getLevelColor(l.color_key || l.name),
              )}>
                {l.name}
              </span>
              <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                {l.cefr && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    CEFR {l.cefr}
                  </span>
                )}
                {l.target_score && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Target className="h-2.5 w-2.5" /> {l.target_score}
                  </span>
                )}
                {l.study_plan_template_id && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary" title="Có Study Plan Template">
                    <Sparkles className="h-2.5 w-2.5" /> Template
                  </span>
                )}
                {Array.isArray(l.outcomes) && l.outcomes.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {l.outcomes.length} đầu ra
                  </span>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Sửa cấp độ"
                onClick={() => openEdit(l)}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Kéo <GripVertical className="inline h-3 w-3" /> để đổi thứ tự trong khóa này.
        Bấm <Pencil className="inline h-3 w-3" /> để sửa chi tiết, hoặc mở{" "}
        <Link to="/courses/levels" className="underline hover:text-foreground">
          trang quản lý tập trung
        </Link>.
      </p>

      <LevelEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        level={editingLevel}
        programs={programs}
        initialProgramId={program.id}
        onSaved={onChanged}
      />
    </section>
  );
}
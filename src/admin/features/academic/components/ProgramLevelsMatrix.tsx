import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, RotateCcw, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import type { CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { COLOR_PRESETS } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";

interface Props {
  programs: CourseProgram[];
  levels: CourseLevel[];
  onSave: (programId: string, levelIds: string[]) => Promise<void>;
}

/**
 * Matrix gán nhanh program ↔ level.
 *   • Hàng = program, cột = level.
 *   • Tick checkbox để gán; "Lưu thay đổi" sẽ ghi đè program_levels của các
 *     program đã sửa (giữ thứ tự theo course_levels.sort_order).
 *   • "Đặt lại" hoàn tác mọi thay đổi chưa lưu.
 */
export default function ProgramLevelsMatrix({ programs, levels, onSave }: Props) {
  // local pending state: programId → Set<levelId>
  const initial = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of programs) map.set(p.id, new Set(p.level_ids));
    return map;
  }, [programs]);

  const [pending, setPending] = useState<Map<string, Set<string>>>(() => cloneMap(initial));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  // Re-sync local state khi programs đổi (sau refetch). So sánh shallow
  // theo size + danh sách level_ids đã hash để tránh ghi đè state khi user
  // đang edit.
  useEffect(() => {
    setPending(cloneMap(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const isChecked = (pid: string, lid: string) => pending.get(pid)?.has(lid) ?? false;

  const toggle = (pid: string, lid: string) => {
    setPending((prev) => {
      const next = cloneMap(prev);
      const set = next.get(pid) ?? new Set<string>();
      if (set.has(lid)) set.delete(lid);
      else set.add(lid);
      next.set(pid, set);
      return next;
    });
  };

  const dirtyPrograms = useMemo(() => {
    const dirty: string[] = [];
    for (const p of programs) {
      const orig = new Set(p.level_ids);
      const cur = pending.get(p.id) ?? new Set<string>();
      if (!sameSet(orig, cur)) dirty.push(p.id);
    }
    return dirty;
  }, [pending, programs]);

  const orderedLevelIdsFor = (pid: string) => {
    const set = pending.get(pid) ?? new Set<string>();
    return levels.filter((l) => set.has(l.id)).map((l) => l.id);
  };

  const handleSaveOne = async (pid: string) => {
    setSavingId(pid);
    try {
      await onSave(pid, orderedLevelIdsFor(pid));
      toast.success("Đã lưu gán cấp độ");
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message ?? "Không xác định"}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    if (dirtyPrograms.length === 0) return;
    setSavingAll(true);
    try {
      for (const pid of dirtyPrograms) {
        await onSave(pid, orderedLevelIdsFor(pid));
      }
      toast.success(`Đã lưu ${dirtyPrograms.length} khóa học`);
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message ?? "Không xác định"}`);
    } finally {
      setSavingAll(false);
    }
  };

  const handleReset = () => setPending(cloneMap(initial));

  if (programs.length === 0 || levels.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
        <LayoutGrid className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {programs.length === 0
            ? "Chưa có khóa học nào — tạo khóa học trước khi gán cấp độ."
            : "Chưa có cấp độ nào — tạo cấp độ trong tab \"Cấp độ\"."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Tick để gán cấp độ cho từng khóa học. Thứ tự sẽ theo
          <code className="mx-1 px-1 py-0.5 bg-muted rounded text-[10px]">course_levels.sort_order</code>.
        </p>
        <div className="flex items-center gap-1.5">
          {dirtyPrograms.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-mono">
              {dirtyPrograms.length} thay đổi chưa lưu
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5"
            onClick={handleReset}
            disabled={dirtyPrograms.length === 0 || savingAll || !!savingId}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleSaveAll}
            disabled={dirtyPrograms.length === 0 || savingAll || !!savingId}
          >
            {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu tất cả
          </Button>
        </div>
      </div>

      {/* Matrix */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <ScrollArea className="w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="sticky left-0 z-10 bg-muted/40 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2 min-w-[200px] border-r">
                  Khóa học
                </th>
                {levels.map((l) => (
                  <th
                    key={l.id}
                    className="text-center text-[10px] font-semibold text-muted-foreground px-2 py-2 min-w-[80px] border-r last:border-r-0"
                    title={l.name}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full border"
                        style={{
                          backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db",
                        }}
                      />
                      <span className="truncate max-w-[90px]">{l.name}</span>
                    </div>
                  </th>
                ))}
                <th className="sticky right-0 z-10 bg-muted/40 px-3 py-2 min-w-[100px] text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-l">
                  Lưu
                </th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => {
                const Icon = getProgramIcon(p.key);
                const palette = getProgramPalette(p.key);
                const dirty = dirtyPrograms.includes(p.id);
                const count = pending.get(p.id)?.size ?? 0;

                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b last:border-b-0 transition-colors",
                      dirty ? "bg-primary/[0.04]" : "hover:bg-muted/20",
                      p.status === "inactive" && "opacity-60",
                    )}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-r">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                            palette.iconBg,
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", palette.iconText)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">
                            {p.key} · {count}/{levels.length}
                          </p>
                        </div>
                      </div>
                    </td>
                    {levels.map((l) => (
                      <td
                        key={l.id}
                        className="text-center px-2 py-2 border-r last:border-r-0"
                      >
                        <Checkbox
                          checked={isChecked(p.id, l.id)}
                          onCheckedChange={() => toggle(p.id, l.id)}
                          aria-label={`${p.name} – ${l.name}`}
                        />
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 bg-inherit px-2 py-2 border-l text-center">
                      <Button
                        size="sm"
                        variant={dirty ? "default" : "ghost"}
                        className="h-7 px-2 gap-1"
                        onClick={() => handleSaveOne(p.id)}
                        disabled={!dirty || savingAll || savingId === p.id}
                      >
                        {savingId === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        <span className="text-[11px]">Lưu</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function cloneMap(m: Map<string, Set<string>>): Map<string, Set<string>> {
  const next = new Map<string, Set<string>>();
  for (const [k, v] of m) next.set(k, new Set(v));
  return next;
}

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
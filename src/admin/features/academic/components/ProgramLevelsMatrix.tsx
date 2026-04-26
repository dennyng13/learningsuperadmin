import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save, RotateCcw, LayoutGrid, CheckSquare, Square } from "lucide-react";
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
  /**
   * Local pending state: programId → Set<levelId>.
   *
   * Sync rules (tránh ghi đè khi user đang tick):
   *   1. Khi `programs` (DB snapshot) thay đổi:
   *        - Thêm program MỚI         → copy level_ids vào pending.
   *        - Xóa program               → bỏ khỏi pending.
   *        - Program cũ:
   *            · Chưa dirty            → đồng bộ theo DB (nhận update từ nơi khác).
   *            · Đang dirty (user sửa) → GIỮ NGUYÊN pending, không ghi đè.
   *   2. So sánh DB bằng signature (sort + join) để tránh false-positive
   *      khi reference đổi nhưng nội dung giống.
   */
  const [pending, setPending] = useState<Map<string, Set<string>>>(
    () => buildInitial(programs),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  // Snapshot DB signature đã sync gần nhất (programId → "lid1|lid2|...").
  // Dùng để biết DB có thực sự đổi không, không phải chỉ reference change.
  const dbSyncedRef = useRef<Map<string, string>>(buildSignatureMap(programs));

  useEffect(() => {
    setPending((prev) => {
      const next = new Map<string, Set<string>>();
      const newSync = new Map<string, string>();
      const dbSynced = dbSyncedRef.current;

      for (const p of programs) {
        const dbSig = sigFromIds(p.level_ids);
        newSync.set(p.id, dbSig);

        const prevSet = prev.get(p.id);
        const lastDbSig = dbSynced.get(p.id);

        if (!prevSet) {
          // Program mới xuất hiện → copy từ DB.
          next.set(p.id, new Set(p.level_ids));
          continue;
        }

        const prevSig = sigFromSet(prevSet);
        const isDirty = lastDbSig !== undefined && prevSig !== lastDbSig;
        const dbChanged = lastDbSig !== dbSig;

        if (isDirty) {
          // User đang chỉnh dở → GIỮ pending hiện tại.
          next.set(p.id, prevSet);
        } else if (dbChanged) {
          // DB thật sự đổi (vd. được update từ chỗ khác) → đồng bộ.
          next.set(p.id, new Set(p.level_ids));
        } else {
          // DB không đổi & user không dirty → giữ reference cũ.
          next.set(p.id, prevSet);
        }
      }

      dbSyncedRef.current = newSync;
      return next;
    });
    // Chỉ phụ thuộc vào `programs`. `levels` đổi không cần reset pending —
    // checkbox sẽ tự re-render khi danh sách cột đổi.
  }, [programs]);

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

  const selectAll = (pid: string) => {
    setPending((prev) => {
      const next = cloneMap(prev);
      next.set(pid, new Set(levels.map((l) => l.id)));
      return next;
    });
  };

  const clearAll = (pid: string) => {
    setPending((prev) => {
      const next = cloneMap(prev);
      next.set(pid, new Set());
      return next;
    });
  };

  const dirtyPrograms = useMemo(() => {
    const dirty: string[] = [];
    for (const p of programs) {
      const cur = pending.get(p.id);
      if (!cur) continue;
      if (sigFromSet(cur) !== sigFromIds(p.level_ids)) dirty.push(p.id);
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
      // Save thành công → coi pending hiện tại là "đã sync" để useEffect tới
      // không nhận diện nhầm là dirty khi `programs` refetch về.
      const cur = pending.get(pid);
      if (cur) dbSyncedRef.current.set(pid, sigFromSet(cur));
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
        const cur = pending.get(pid);
        if (cur) dbSyncedRef.current.set(pid, sigFromSet(cur));
      }
      toast.success(`Đã lưu ${dirtyPrograms.length} khóa học`);
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message ?? "Không xác định"}`);
    } finally {
      setSavingAll(false);
    }
  };

  const handleReset = () => {
    setPending(buildInitial(programs));
    dbSyncedRef.current = buildSignatureMap(programs);
  };

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
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{p.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">
                            {p.key} · {count}/{levels.length}
                          </p>
                        </div>
                        {/* Bulk-select shortcuts */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            title="Chọn tất cả cấp độ"
                            onClick={() => selectAll(p.id)}
                            disabled={count === levels.length}
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            title="Bỏ chọn tất cả"
                            onClick={() => clearAll(p.id)}
                            disabled={count === 0}
                          >
                            <Square className="h-3.5 w-3.5" />
                          </Button>
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

function buildInitial(programs: CourseProgram[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const p of programs) map.set(p.id, new Set(p.level_ids));
  return map;
}

function buildSignatureMap(programs: CourseProgram[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of programs) map.set(p.id, sigFromIds(p.level_ids));
  return map;
}

function sigFromIds(ids: string[]): string {
  return [...ids].sort().join("|");
}

function sigFromSet(s: Set<string>): string {
  return [...s].sort().join("|");
}
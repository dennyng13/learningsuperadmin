import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@shared/components/ui/dialog";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import type { CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";

/**
 * CefrMappingDialog — Map hàng loạt CEFR (A1..C2) cho từng cấp độ.
 *
 * Lưu vào bảng `level_cefr_map` (many-to-many: 1 level có thể map nhiều CEFR,
 * vd "Ra khơi 2" = B2+C1). Idempotent: replace toàn bộ rows của level mỗi lần
 * nhấn "Lưu".
 */

const CEFR_VALUES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Cefr = (typeof CEFR_VALUES)[number];

/** Suggest CEFR theo tên cấp độ — gợi ý mặc định cho IELTS path. */
function suggestCefr(name: string): Cefr[] {
  const n = name.toLowerCase();
  if (n.includes("căng buồm")) return ["A1"];
  if (n.includes("đón gió 1")) return ["A1"];
  if (n.includes("đón gió 2")) return ["A2"];
  if (n.includes("lướt sóng 1")) return ["B1"];
  if (n.includes("lướt sóng 2")) return ["B1"];
  if (n.includes("ra khơi 1")) return ["B2"];
  if (n.includes("ra khơi 2")) return ["C1"];
  return [];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levels: CourseLevel[];
  programs: CourseProgram[];
  onSaved?: () => void | Promise<void>;
}

export default function CefrMappingDialog({ open, onOpenChange, levels, programs, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Record<string, Set<Cefr>>>({});
  const [initial, setInitial] = useState<Record<string, Set<Cefr>>>({});

  const programByLevel = useMemo(() => {
    const m = new Map<string, CourseProgram>();
    for (const p of programs) for (const lid of p.level_ids) m.set(lid, p);
    return m;
  }, [programs]);

  // Load current mapping mỗi khi mở
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("level_cefr_map")
        .select("level_id, cefr");
      if (cancelled) return;
      const byLevel: Record<string, Set<Cefr>> = {};
      if (!error && Array.isArray(data)) {
        for (const row of data as Array<{ level_id: string; cefr: Cefr }>) {
          (byLevel[row.level_id] ||= new Set()).add(row.cefr);
        }
      }
      // Đảm bảo mọi level có entry (kể cả rỗng) để render dễ
      for (const l of levels) byLevel[l.id] ||= new Set();
      setInitial(cloneMap(byLevel));
      setSelection(cloneMap(byLevel));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, levels]);

  const toggle = (levelId: string, c: Cefr) => {
    setSelection((prev) => {
      const next = { ...prev };
      const set = new Set(next[levelId] ?? []);
      if (set.has(c)) set.delete(c); else set.add(c);
      next[levelId] = set;
      return next;
    });
  };

  const applySuggestions = () => {
    setSelection((prev) => {
      const next = { ...prev };
      for (const l of levels) {
        const sug = suggestCefr(l.name);
        if (sug.length > 0 && (next[l.id]?.size ?? 0) === 0) {
          next[l.id] = new Set(sug);
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Tính diff: chỉ chạm những level có thay đổi
      const changed: string[] = [];
      for (const l of levels) {
        const a = initial[l.id] ?? new Set();
        const b = selection[l.id] ?? new Set();
        if (!setsEqual(a, b)) changed.push(l.id);
      }
      if (changed.length === 0) {
        toast.info("Không có thay đổi.");
        setSaving(false);
        return;
      }
      const { error: delErr } = await (supabase as any)
        .from("level_cefr_map")
        .delete()
        .in("level_id", changed);
      if (delErr) throw delErr;
      const rows: Array<{ level_id: string; cefr: Cefr }> = [];
      for (const lid of changed) {
        for (const c of selection[lid] ?? []) rows.push({ level_id: lid, cefr: c });
      }
      if (rows.length > 0) {
        const { error: insErr } = await (supabase as any).from("level_cefr_map").insert(rows);
        if (insErr) throw insErr;
      }
      toast.success(`Đã lưu CEFR cho ${changed.length} cấp độ`);
      await onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi lưu: ${err.message ?? "Unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  // Group level theo program để dễ xem
  const grouped = useMemo(() => {
    const map = new Map<string, { program: CourseProgram | null; items: CourseLevel[] }>();
    for (const l of levels) {
      const p = programByLevel.get(l.id) ?? null;
      const key = p?.id ?? "__orphan__";
      const bucket = map.get(key) ?? { program: p, items: [] };
      bucket.items.push(l);
      map.set(key, bucket);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (!a.program) return 1;
      if (!b.program) return -1;
      return (a.program.sort_order ?? 0) - (b.program.sort_order ?? 0);
    });
  }, [levels, programByLevel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Map CEFR cho cấp độ</DialogTitle>
          <DialogDescription>
            1 cấp độ có thể map nhiều CEFR (vd "Ra khơi 2" = B2 + C1). Lưu vào bảng <code>level_cefr_map</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 -mt-2">
          <p className="text-xs text-muted-foreground">
            {levels.length} cấp độ • Click để bật/tắt CEFR.
          </p>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={applySuggestions}>
            <Sparkles className="h-3 w-3" /> Áp gợi ý IELTS
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 border-y py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 italic">Chưa có cấp độ nào.</p>
          ) : (
            grouped.map(({ program, items }) => (
              <div key={program?.id ?? "orphan"} className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {program?.name ?? "Chưa thuộc chương trình"}
                </h4>
                <div className="space-y-1.5">
                  {items.map((l) => {
                    const sel = selection[l.id] ?? new Set<Cefr>();
                    return (
                      <div key={l.id} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/40">
                        <span className="text-sm font-medium min-w-[140px] shrink-0">{l.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {CEFR_VALUES.map((c) => {
                            const active = sel.has(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => toggle(l.id, c)}
                                className={cn(
                                  "h-6 w-9 rounded text-[11px] font-mono font-bold border transition-colors",
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border hover:border-primary/50",
                                )}
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                        {sel.size > 0 && (
                          <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                            {sel.size}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cloneMap(m: Record<string, Set<Cefr>>): Record<string, Set<Cefr>> {
  const out: Record<string, Set<Cefr>> = {};
  for (const [k, v] of Object.entries(m)) out[k] = new Set(v);
  return out;
}
function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
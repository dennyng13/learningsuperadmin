import { useEffect, useMemo, useState } from "react";
import { BookCheck, Loader2, Save, GraduationCap, PenLine, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Label } from "@shared/components/ui/label";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";

interface ProgramRow {
  id: string;
  key: string;
  name: string;
  program_key: string | null;
  level: string | null;
  sort_order: number;
  is_active: boolean;
}

interface CapabilityRow {
  id: string;
  teacher_id: string;
  eligible_program_keys: string[] | null;
}

interface Props {
  teacherId: string;
}

type GroupKey = "ielts" | "wre" | "customized" | "other";

const GROUP_META: Record<GroupKey, { label: string; description: string; Icon: typeof GraduationCap; accent: string }> = {
  ielts: {
    label: "IELTS",
    description: "8 cấp độ theo lộ trình band",
    Icon: GraduationCap,
    accent: "bg-primary/10 text-primary border-primary/30",
  },
  wre: {
    label: "WRE",
    description: "Writing & Reading Exam",
    Icon: PenLine,
    accent: "bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-300",
  },
  customized: {
    label: "Customized",
    description: "Lớp 1-1 / thiết kế riêng",
    Icon: Sparkles,
    accent: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300",
  },
  other: {
    label: "Khác",
    description: "Chương trình ngoài catalog chính",
    Icon: BookCheck,
    accent: "bg-muted text-muted-foreground border-border",
  },
};

const GROUP_ORDER: GroupKey[] = ["ielts", "wre", "customized", "other"];

function normalizeGroup(p: ProgramRow): GroupKey {
  const raw = (p.program_key || "").toLowerCase().trim();
  if (raw === "ielts" || raw === "wre" || raw === "customized") return raw;
  const k = (p.key || "").toLowerCase();
  if (k.startsWith("ielts")) return "ielts";
  if (k.startsWith("wre")) return "wre";
  if (k.startsWith("custom")) return "customized";
  return "other";
}

export default function TeacherProgramEligibilityCard({ teacherId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [capability, setCapability] = useState<CapabilityRow | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [progsRes, capRes] = await Promise.all([
        (supabase.from as any)("programs")
          .select("id, key, name, program_key, level, sort_order, is_active")
          .eq("is_active", true)
          .order("program_key", { ascending: true })
          .order("sort_order", { ascending: true }),
        (supabase.from as any)("teacher_capabilities")
          .select("id, teacher_id, eligible_program_keys")
          .eq("teacher_id", teacherId)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      if (progsRes.error) {
        toast.error("Không tải được danh sách chương trình", { description: progsRes.error.message });
      }
      const rows: ProgramRow[] = Array.isArray(progsRes.data) ? (progsRes.data as ProgramRow[]) : [];
      setPrograms(rows);

      const cap = (capRes.data as CapabilityRow | null) ?? null;
      setCapability(cap);
      const initial = new Set<string>(cap?.eligible_program_keys ?? []);
      setSelectedKeys(initial);
      setTouched(false);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [teacherId]);

  const grouped = useMemo(() => {
    const map: Record<GroupKey, ProgramRow[]> = { ielts: [], wre: [], customized: [], other: [] };
    for (const p of programs) map[normalizeGroup(p)].push(p);
    for (const g of GROUP_ORDER) map[g].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return map;
  }, [programs]);

  const visibleGroups = GROUP_ORDER.filter((g) => grouped[g].length > 0);

  const total = programs.length;
  const selectedCount = selectedKeys.size;

  const toggleProgram = (key: string) => {
    setTouched(true);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleGroupAll = (g: GroupKey, on: boolean) => {
    setTouched(true);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const p of grouped[g]) {
        if (on) next.add(p.key); else next.delete(p.key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const keysArr = [...selectedKeys];
      if (capability?.id) {
        const { error } = await (supabase.from as any)("teacher_capabilities")
          .update({ eligible_program_keys: keysArr, updated_at: new Date().toISOString() })
          .eq("id", capability.id);
        if (error) throw error;
        setCapability({ ...capability, eligible_program_keys: keysArr });
      } else {
        const { data: inserted, error } = await (supabase.from as any)("teacher_capabilities")
          .insert({ teacher_id: teacherId, eligible_program_keys: keysArr })
          .select("id, teacher_id, eligible_program_keys")
          .single();
        if (error) throw error;
        setCapability(inserted as CapabilityRow);
      }
      setTouched(false);
      toast.success(`Đã lưu ${keysArr.length} chương trình`, {
        description: keysArr.length === 0
          ? "Giáo viên hiện chưa có chương trình nào được cấp"
          : "Giáo viên có thể chọn các chương trình này khi đăng ký lịch rảnh",
      });
    } catch (e: any) {
      toast.error("Lưu thất bại", { description: e?.message ?? String(e) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu chương trình…
        </div>
      </section>
    );
  }

  const isFresh = capability?.eligible_program_keys === null || capability?.eligible_program_keys === undefined;

  return (
    <section className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-5">
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-tight">Chương trình được phép nhận</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Setup theo hợp đồng / phụ lục hợp đồng. Giáo viên chỉ chọn được các chương trình được cấp khi đăng ký lịch rảnh.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className="text-xs font-medium">
            {selectedCount}/{total} đã chọn
          </Badge>
          <Button onClick={handleSave} disabled={saving || !touched} size="sm" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </Button>
        </div>
      </header>

      {isFresh && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Giáo viên này <b>chưa được cấu hình</b>. Hệ thống đang fallback hiển thị toàn bộ chương trình cho đến khi bạn lưu lần đầu.
          </span>
        </div>
      )}

      {programs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Chưa có chương trình nào trong catalog. Vui lòng tạo programs trước.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((g) => {
            const meta = GROUP_META[g];
            const items = grouped[g];
            const groupSelected = items.filter((p) => selectedKeys.has(p.key)).length;
            const allOn = groupSelected === items.length;
            const partOn = groupSelected > 0 && !allOn;
            const Icon = meta.Icon;
            return (
              <div key={g} className="rounded-xl border border-border overflow-hidden">
                <header className="flex items-center justify-between gap-3 p-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("flex items-center justify-center h-8 w-8 rounded-md border shrink-0", meta.accent)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{meta.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{groupSelected}/{items.length}</span>
                    <button
                      type="button"
                      onClick={() => toggleGroupAll(g, !allOn)}
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded-md border transition-colors",
                        allOn
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : partOn
                            ? "border-primary/30 bg-primary/5 text-primary"
                            : "border-border hover:bg-accent",
                      )}
                    >
                      {allOn ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                    </button>
                  </div>
                </header>
                <ul className="divide-y divide-border">
                  {items.map((p) => {
                    const checked = selectedKeys.has(p.key);
                    return (
                      <li key={p.id}>
                        <label
                          htmlFor={`elig-${p.key}`}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors",
                            checked && "bg-primary/5",
                          )}
                        >
                          <Checkbox
                            id={`elig-${p.key}`}
                            checked={checked}
                            onCheckedChange={() => toggleProgram(p.key)}
                          />
                          <span className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{p.name}</span>
                            {p.level && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.level}</Badge>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">{p.key}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {touched && (
        <p className="text-xs text-muted-foreground">
          * Có thay đổi chưa lưu — bấm <b>Lưu</b> để áp dụng.
        </p>
      )}
    </section>
  );
}

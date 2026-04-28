/**
 * TeacherProgramEligibilityCard
 *
 * Cấu hình "Chương trình & Cấp độ được phép giảng dạy" cho 1 giáo viên.
 *
 * Nguồn dữ liệu DUY NHẤT: trang "Quản lý khoá học" (`/courses`) — đọc qua
 *   - `useCoursesAdmin()`  → 3 chương trình chuẩn (IELTS / WRE / Customized)
 *   - `useCourseLevels()`  → các cấp độ con đã gắn vào program (program_levels)
 *
 * Lưu vào bảng `teacher_capabilities`:
 *   - `eligible_program_keys`  → keys của program (vd. ["ielts","wre"])
 *   - `level_keys`             → ids của course_levels được tick
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, GraduationCap, AlertTriangle, Layers, BookCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";
import { useCoursesAdmin } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";

interface CapabilityRow {
  id: string;
  teacher_id: string;
  eligible_program_keys: string[] | null;
  level_keys: string[] | null;
}

interface Props { teacherId: string }

export default function TeacherProgramEligibilityCard({ teacherId }: Props) {
  const { programs, loading: progLoading } = useCoursesAdmin();
  const { levels } = useCourseLevels({ includeOrphans: false });

  const [capLoading, setCapLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capability, setCapability] = useState<CapabilityRow | null>(null);
  const [progKeys, setProgKeys] = useState<Set<string>>(new Set());
  const [levelIds, setLevelIds] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

  // Load capability for this teacher
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCapLoading(true);
      const { data, error } = await (supabase.from as any)("teacher_capabilities")
        .select("id, teacher_id, eligible_program_keys, level_keys")
        .eq("teacher_id", teacherId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Không tải được capability", { description: error.message });
      }
      const cap = (data as CapabilityRow | null) ?? null;
      setCapability(cap);
      setProgKeys(new Set(cap?.eligible_program_keys ?? []));
      setLevelIds(new Set(cap?.level_keys ?? []));
      setTouched(false);
      setCapLoading(false);
    })();
    return () => { cancelled = true; };
  }, [teacherId]);

  // Group: 1 program → list level objects (resolved from level_ids)
  const groups = useMemo(() => {
    const lvlMap = new Map(levels.map((l) => [l.id, l]));
    return programs.map((p) => ({
      program: p,
      levelObjs: (p.level_ids ?? [])
        .map((id) => lvlMap.get(id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }));
  }, [programs, levels]);

  const totalLevels = useMemo(
    () => groups.reduce((acc, g) => acc + g.levelObjs.length, 0),
    [groups],
  );
  const selectedLevelCount = levelIds.size;
  const selectedProgramCount = progKeys.size;

  const toggleProgram = (key: string, levelObjs: { id: string }[]) => {
    setTouched(true);
    setProgKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // bỏ chọn cả level con
        setLevelIds((prevL) => {
          const nl = new Set(prevL);
          for (const lv of levelObjs) nl.delete(lv.id);
          return nl;
        });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleLevel = (id: string, programKey: string) => {
    setTouched(true);
    setLevelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // tự động bật program nếu đang tick level con
      if (next.has(id)) setProgKeys((p) => new Set(p).add(programKey));
      return next;
    });
  };

  const toggleAllLevelsInProgram = (programKey: string, levelObjs: { id: string }[], on: boolean) => {
    setTouched(true);
    setLevelIds((prev) => {
      const next = new Set(prev);
      for (const lv of levelObjs) {
        if (on) next.add(lv.id); else next.delete(lv.id);
      }
      return next;
    });
    if (on) setProgKeys((p) => new Set(p).add(programKey));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        eligible_program_keys: [...progKeys],
        level_keys: [...levelIds],
        updated_at: new Date().toISOString(),
      };
      if (capability?.id) {
        const { error } = await (supabase.from as any)("teacher_capabilities")
          .update(payload).eq("id", capability.id);
        if (error) throw error;
        setCapability({ ...capability, ...payload } as CapabilityRow);
      } else {
        const { data, error } = await (supabase.from as any)("teacher_capabilities")
          .insert({ teacher_id: teacherId, ...payload })
          .select("id, teacher_id, eligible_program_keys, level_keys")
          .single();
        if (error) throw error;
        setCapability(data as CapabilityRow);
      }
      setTouched(false);
      toast.success("Đã lưu phân quyền giảng dạy", {
        description: `${progKeys.size} chương trình · ${levelIds.size} cấp độ`,
      });
    } catch (e: any) {
      toast.error("Lưu thất bại", { description: e?.message ?? String(e) });
    } finally {
      setSaving(false);
    }
  };

  const loading = progLoading || capLoading;

  if (loading) {
    return (
      <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu khoá học…
        </div>
      </section>
    );
  }

  const isFresh = !capability;

  return (
    <section className="rounded-2xl bg-card border border-border overflow-hidden shadow-card">
      {/* Header */}
      <header className="relative p-5 md:p-6 border-b bg-gradient-to-br from-primary/5 via-violet-500/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-violet-500 text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <BookCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold leading-tight">
                Chương trình &amp; Cấp độ được phép giảng dạy
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Đồng bộ với <strong>Quản lý khoá học</strong> · Tick cấp độ tương ứng để giáo viên có thể nhận lớp đúng phân quyền.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs font-medium gap-1">
              <GraduationCap className="h-3 w-3" />
              {selectedProgramCount} CT
            </Badge>
            <Badge variant="outline" className="text-xs font-medium gap-1">
              <Layers className="h-3 w-3" />
              {selectedLevelCount}/{totalLevels} cấp độ
            </Badge>
            <Button onClick={handleSave} disabled={saving || !touched} size="sm" className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu
            </Button>
          </div>
        </div>

        {isFresh && (
          <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50/60 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Giáo viên này <b>chưa được cấu hình</b>. Tick các chương trình &amp; cấp độ rồi bấm <b>Lưu</b> để bắt đầu phân lớp.
            </span>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="p-4 md:p-5">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Chưa có chương trình nào. Vào <a href="/courses" className="text-primary underline">Quản lý khoá học</a> để tạo trước.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {groups.map(({ program, levelObjs }) => {
              const palette = getProgramPalette(program.key);
              const Icon = getProgramIcon(program.icon_key);
              const progChecked = progKeys.has(program.key);
              const ownLevelCount = levelObjs.filter((l) => levelIds.has(l.id)).length;
              const allLevelsOn = levelObjs.length > 0 && ownLevelCount === levelObjs.length;
              return (
                <div
                  key={program.id}
                  className={cn(
                    "relative rounded-xl border overflow-hidden transition-all",
                    progChecked
                      ? "border-primary/40 shadow-sm shadow-primary/10"
                      : "border-border hover:border-border/80",
                  )}
                >
                  {/* Accent strip */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ background: `hsl(var(--${palette.dotVar}))` }}
                    aria-hidden
                  />
                  <header className="flex items-center gap-3 p-3 bg-muted/20 border-b">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        background: `hsl(var(--${palette.dotVar}) / 0.12)`,
                        color: `hsl(var(--${palette.dotVar}))`,
                        borderColor: `hsl(var(--${palette.dotVar}) / 0.3)`,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <Checkbox
                        checked={progChecked}
                        onCheckedChange={() => toggleProgram(program.key, levelObjs)}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{program.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {levelObjs.length} cấp độ · key <code className="font-mono">{program.key}</code>
                        </p>
                      </div>
                    </label>
                    {levelObjs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleAllLevelsInProgram(program.key, levelObjs, !allLevelsOn)}
                        className={cn(
                          "text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors shrink-0",
                          allLevelsOn
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border hover:bg-accent",
                        )}
                      >
                        {allLevelsOn ? "Bỏ tất cả" : "Chọn tất cả"}
                      </button>
                    )}
                  </header>

                  {levelObjs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-3 py-3">
                      Chương trình này chưa có cấp độ nào trong catalog.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-1 p-2">
                      {levelObjs.map((lv) => {
                        const checked = levelIds.has(lv.id);
                        return (
                          <li key={lv.id}>
                            <label
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-xs transition-colors",
                                checked
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-accent",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleLevel(lv.id, program.key)}
                                className="h-3.5 w-3.5"
                              />
                              <span className="truncate">{lv.name}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {touched && (
          <p className="text-xs text-muted-foreground mt-3">
            * Có thay đổi chưa lưu — bấm <b>Lưu</b> để áp dụng.
          </p>
        )}
      </div>
    </section>
  );
}

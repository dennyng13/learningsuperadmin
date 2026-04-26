import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Loader2, Save, BookOpen, CheckCircle2, Circle, ChevronLeft, ChevronRight, Plus, X, GripVertical, Trash2, BarChart3 } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { Progress } from "@shared/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { clearConversionCache } from "@shared/utils/scoreConversion";

const DESCRIPTOR_SKILLS = [
  {
    key: "writing",
    label: "Writing",
    taskTypes: [
      { key: "task1", label: "Task 1" },
      { key: "task2", label: "Task 2" },
    ],
    criteria: [
      { key: "task_achievement", label: "Task Achievement", short: "TA" },
      { key: "coherence_cohesion", label: "Coherence & Cohesion", short: "CC" },
      { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
      { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
    ],
  },
  {
    key: "speaking",
    label: "Speaking",
    taskTypes: [
      { key: "general", label: "Tất cả Parts" },
    ],
    criteria: [
      { key: "fluency_coherence", label: "Fluency & Coherence", short: "FC" },
      { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
      { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
      { key: "pronunciation", label: "Pronunciation", short: "P" },
    ],
  },
];

const ALL_SKILLS = [
  { key: "writing", label: "Writing" },
  { key: "speaking", label: "Speaking" },
  { key: "reading", label: "Reading" },
  { key: "listening", label: "Listening" },
];

const BANDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const BAND_COLORS: Record<string, string> = {
  "9": "bg-emerald-500", "8.5": "bg-emerald-400", "8": "bg-teal-500",
  "7.5": "bg-teal-400", "7": "bg-sky-500", "6.5": "bg-sky-400",
  "6": "bg-blue-500", "5.5": "bg-blue-400", "5": "bg-amber-500",
  "4.5": "bg-amber-400", "4": "bg-orange-500", "3.5": "bg-orange-400",
  "3": "bg-red-400", "2.5": "bg-red-500", "2": "bg-red-600",
};

interface ConversionRow {
  id?: string;
  min_marks: number;
  max_marks: number;
  band_score: number;
}

function ScoreConversionSection({ skill }: { skill: string }) {
  const [rows, setRows] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("score_conversion" as any)
      .select("id, min_marks, max_marks, band_score")
      .eq("skill", skill)
      .order("band_score", { ascending: false }) as any;
    if (error) toast.error("Lỗi tải dữ liệu: " + error.message);
    else setRows(data || []);
    setLoading(false);
    setDirty(false);
  }, [skill]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateRow = (idx: number, field: keyof ConversionRow, value: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    setDirty(true);
  };

  const addRow = () => {
    const lastBand = rows.length > 0 ? rows[rows.length - 1].band_score - 0.5 : 9;
    setRows(prev => [...prev, { min_marks: 0, max_marks: 0, band_score: Math.max(1, lastBand) }]);
    setDirty(true);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const handleSave = async () => {
    for (const r of rows) {
      if (r.min_marks > r.max_marks) {
        toast.error(`Band ${r.band_score}: Min marks không được lớn hơn Max marks`);
        return;
      }
    }
    setSaving(true);
    await supabase.from("score_conversion" as any).delete().eq("skill", skill);
    if (rows.length > 0) {
      const payload = rows.map(r => ({ skill, min_marks: r.min_marks, max_marks: r.max_marks, band_score: r.band_score }));
      const { error } = await supabase.from("score_conversion" as any).insert(payload as any);
      if (error) { toast.error("Lỗi lưu: " + error.message); setSaving(false); return; }
    }
    clearConversionCache();
    toast.success("Đã lưu bảng quy đổi điểm!");
    setDirty(false);
    setSaving(false);
  };

  const totalMarks = 40;
  const coveredMarks = new Set<number>();
  rows.forEach(r => { for (let i = r.min_marks; i <= r.max_marks; i++) coveredMarks.add(i); });

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Bảng quy đổi điểm — {skill === "reading" ? "Reading" : "Listening"}</span>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Lưu
        </Button>
      </div>

      {/* Visual band bar */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phân bổ điểm (0–40)</p>
        <div className="flex gap-px h-8 rounded-lg overflow-hidden bg-muted/50">
          {Array.from({ length: totalMarks + 1 }, (_, i) => {
            const row = rows.find(r => i >= r.min_marks && i <= r.max_marks);
            const bandKey = row ? String(row.band_score) : "";
            const bgColor = bandKey ? (BAND_COLORS[bandKey] || "bg-primary/30") : "bg-muted";
            return (
              <div key={i} className={cn("flex-1 transition-colors relative group", bgColor)} title={row ? `${i} marks → Band ${row.band_score}` : `${i} marks — chưa gán`}>
                {(i % 5 === 0) && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground">{i}</span>}
              </div>
            );
          })}
        </div>
        <div className="h-4" />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_40px] gap-0 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 px-3 py-2.5">
          <span>#</span><span>Band Score</span><span>Min Marks</span><span>Max Marks</span><span />
        </div>
        <div className="divide-y">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[60px_1fr_1fr_1fr_40px] gap-0 items-center px-3 py-2 hover:bg-accent/30 transition-colors">
              <span className="text-xs text-muted-foreground">{idx + 1}</span>
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full shrink-0", BAND_COLORS[String(row.band_score)] || "bg-muted")} />
                <Input type="number" step="0.5" min="1" max="9" value={row.band_score} onChange={e => updateRow(idx, "band_score", parseFloat(e.target.value) || 0)} className="h-8 w-20 text-xs font-bold" />
              </div>
              <Input type="number" min="0" max="40" value={row.min_marks} onChange={e => updateRow(idx, "min_marks", parseInt(e.target.value) || 0)} className="h-8 w-20 text-xs" />
              <Input type="number" min="0" max="40" value={row.max_marks} onChange={e => updateRow(idx, "max_marks", parseInt(e.target.value) || 0)} className="h-8 w-20 text-xs" />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
        <Plus className="h-3.5 w-3.5" /> Thêm dòng
      </Button>

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span>{rows.length} band scores</span>
        <span>•</span>
        <span>{coveredMarks.size}/{totalMarks + 1} marks được gán</span>
        {coveredMarks.size < totalMarks + 1 && (
          <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
            Thiếu {totalMarks + 1 - coveredMarks.size} marks
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function AdminBandDescriptorsTab() {
  const [skill, setSkill] = useState("writing");
  const [taskType, setTaskType] = useState("task1");
  const [descriptors, setDescriptors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeCriteria, setActiveCriteria] = useState<string | null>(null);

  const currentSkill = DESCRIPTOR_SKILLS.find(s => s.key === skill);
  const isScoreConversion = skill === "reading" || skill === "listening";
  const makeKey = (criteria: string, band: number) => `${criteria}:${band}`;

  const loadDescriptors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("band_descriptors" as any)
      .select("*")
      .eq("skill", skill)
      .eq("task_type", taskType) as any;

    if (error) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } else if (data) {
      const map: Record<string, string> = {};
      for (const d of data) {
        map[makeKey(d.criteria, d.band)] = d.description;
      }
      setDescriptors(map);
    }
    setLoading(false);
    setDirty(false);
  }, [skill, taskType]);

  useEffect(() => {
    loadDescriptors();
  }, [loadDescriptors]);

  useEffect(() => {
    const s = DESCRIPTOR_SKILLS.find(s => s.key === skill);
    if (s) {
      setTaskType(s.taskTypes[0].key);
    }
    setActiveCriteria(null);
  }, [skill]);

  useEffect(() => {
    setActiveCriteria(null);
  }, [taskType]);

  const handleChange = (criteria: string, band: number, value: string) => {
    setDescriptors(prev => ({ ...prev, [makeKey(criteria, band)]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const rows: { skill: string; criteria: string; band: number; description: string; task_type: string }[] = [];
    for (const c of currentSkill.criteria) {
      for (const band of BANDS) {
        const desc = descriptors[makeKey(c.key, band)] || "";
        if (desc.trim()) {
          rows.push({ skill, criteria: c.key, band, description: desc.trim(), task_type: taskType });
        }
      }
    }

    await supabase.from("band_descriptors" as any).delete().eq("skill", skill).eq("task_type", taskType);

    if (rows.length > 0) {
      const { error } = await supabase.from("band_descriptors" as any).insert(rows as any);
      if (error) {
        toast.error("Lỗi lưu: " + error.message);
        setSaving(false);
        return;
      }
    }

    toast.success("Đã lưu mô tả band điểm!");
    setDirty(false);
    setSaving(false);
  };

  // Stats (only for descriptor skills)
  const totalSlots = currentSkill ? currentSkill.criteria.length * BANDS.length : 0;
  const filledSlots = currentSkill ? currentSkill.criteria.reduce((sum, c) =>
    sum + BANDS.filter(b => (descriptors[makeKey(c.key, b)] || "").trim()).length, 0) : 0;
  const progressPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  const getFilledCount = (criteriaKey: string) =>
    BANDS.filter(b => (descriptors[makeKey(criteriaKey, b)] || "").trim()).length;

  // Navigate criteria
  const criteriaIdx = activeCriteria && currentSkill ? currentSkill.criteria.findIndex(c => c.key === activeCriteria) : -1;
  const canPrev = criteriaIdx > 0;
  const canNext = currentSkill ? criteriaIdx >= 0 && criteriaIdx < currentSkill.criteria.length - 1 : false;

  return (
    <div className="space-y-5">
      {/* Save action only — header trùng với Header chính nên đã bỏ */}
      {!isScoreConversion && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="gap-1.5 shrink-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
        </div>
      )}

      {/* Skill + Task Type selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={skill} onValueChange={v => setSkill(v)}>
          <TabsList className="bg-muted/60 rounded-lg h-9">
            {ALL_SKILLS.map(s => (
              <TabsTrigger key={s.key} value={s.key} className="text-xs font-semibold rounded-md px-4">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {currentSkill && currentSkill.taskTypes.length > 1 && (
          <Tabs value={taskType} onValueChange={v => setTaskType(v)}>
            <TabsList className="bg-muted/40 rounded-lg h-9">
              {currentSkill.taskTypes.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="text-xs font-semibold rounded-md px-3">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {isScoreConversion ? (
        <ScoreConversionSection skill={skill} />
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !activeCriteria ? (
        /* ===== OVERVIEW GRID ===== */
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Tiến độ hoàn thành</span>
                <span className="text-xs font-bold text-primary">{filledSlots}/{totalSlots}</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
            {progressPct === 100 && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            )}
          </div>

          {/* Criteria cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {currentSkill.criteria.map(c => {
              const filled = getFilledCount(c.key);
              const complete = filled === 9;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCriteria(c.key)}
                  className={cn(
                    "group relative flex flex-col gap-3 p-4 rounded-xl border text-left transition-all",
                    "hover:border-primary/40 hover:shadow-md hover:bg-accent/30",
                    "bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">
                          {c.short}
                        </Badge>
                        <span className="text-sm font-bold">{c.label}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  {/* Band dots grid */}
                  <div className="flex items-center gap-1.5">
                    <TooltipProvider delayDuration={200}>
                      {BANDS.map(b => {
                        const has = (descriptors[makeKey(c.key, b)] || "").trim();
                        return (
                          <Tooltip key={b}>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                                has
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted/60 text-muted-foreground/50"
                              )}>
                                {b}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">
                              {has ? `Band ${b}: Đã có mô tả` : `Band ${b}: Chưa có`}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </div>

                  {/* Mini progress */}
                  <div className="flex items-center gap-2">
                    <Progress value={(filled / 9) * 100} className="h-1.5 flex-1" />
                    <span className={cn(
                      "text-[10px] font-bold",
                      complete ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    )}>
                      {filled}/9
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Nhấn vào tiêu chí để chỉnh sửa mô tả từng band điểm
          </p>
        </div>
      ) : (
        /* ===== CRITERIA DETAIL EDITOR ===== */
        <div className="space-y-4">
          {/* Navigation bar */}
          <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setActiveCriteria(null)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Tổng quan
            </Button>

            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">
                {currentSkill.criteria[criteriaIdx]?.short}
              </Badge>
              <span className="text-sm font-bold">
                {currentSkill.criteria[criteriaIdx]?.label}
              </span>
              <span className={cn(
                "text-[10px] font-bold ml-1 rounded-full px-2 py-0.5",
                getFilledCount(activeCriteria) === 9
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {getFilledCount(activeCriteria)}/9
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canPrev}
                onClick={() => setActiveCriteria(currentSkill.criteria[criteriaIdx - 1].key)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canNext}
                onClick={() => setActiveCriteria(currentSkill.criteria[criteriaIdx + 1].key)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Band editors — bullet point style */}
          <div className="grid gap-3">
            {BANDS.map(band => {
              const raw = descriptors[makeKey(activeCriteria, band)] || "";
              const bullets = raw ? raw.split("\n").filter(l => l.trim()) : [];
              const hasFill = bullets.length > 0;

              const setBullets = (newBullets: string[]) => {
                handleChange(activeCriteria, band, newBullets.join("\n"));
              };

              const updateBullet = (idx: number, val: string) => {
                const next = [...bullets];
                next[idx] = val;
                setBullets(next);
              };

              const removeBullet = (idx: number) => {
                setBullets(bullets.filter((_, i) => i !== idx));
              };

              const addBullet = () => {
                setBullets([...bullets, ""]);
              };

              const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = [...bullets];
                  next.splice(idx + 1, 0, "");
                  setBullets(next);
                  // Focus next input after render
                  setTimeout(() => {
                    const inputs = document.querySelectorAll(`[data-band-input="${activeCriteria}-${band}"]`);
                    (inputs[idx + 1] as HTMLInputElement)?.focus();
                  }, 50);
                } else if (e.key === "Backspace" && bullets[idx] === "" && bullets.length > 1) {
                  e.preventDefault();
                  removeBullet(idx);
                  setTimeout(() => {
                    const inputs = document.querySelectorAll(`[data-band-input="${activeCriteria}-${band}"]`);
                    const focusIdx = Math.max(0, idx - 1);
                    (inputs[focusIdx] as HTMLInputElement)?.focus();
                  }, 50);
                }
              };

              return (
                <div
                  key={band}
                  className={cn(
                    "flex gap-3 items-start p-3 rounded-xl border transition-colors",
                    hasFill ? "border-primary/20 bg-primary/[0.02]" : "border-border bg-card"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm shrink-0 mt-0.5",
                    hasFill
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {band}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Band {band}</span>
                      <span className="text-[10px] text-muted-foreground">{bullets.length} mục</span>
                    </div>

                    {/* Bullet list */}
                    <div className="space-y-1">
                      {bullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 group">
                          <span className="text-primary text-xs shrink-0">•</span>
                          <Input
                            data-band-input={`${activeCriteria}-${band}`}
                            value={bullet}
                            onChange={e => updateBullet(idx, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx)}
                            placeholder="Nhập mô tả..."
                            className="h-7 text-xs border-transparent bg-transparent hover:bg-muted/30 focus:bg-background focus:border-input px-2 py-1"
                          />
                          <button
                            onClick={() => removeBullet(idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={addBullet}
                      className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors pl-4"
                    >
                      <Plus className="h-3 w-3" />
                      Thêm mục
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

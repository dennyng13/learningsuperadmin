import React, { useState, useEffect, useCallback, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { PopButton } from "@shared/components/ui/pop-button";
import { Input } from "@shared/components/ui/input";
import { Loader2, Save, CheckCircle2, ChevronLeft, ChevronRight, Plus, X, Trash2, BarChart3, Pen, AlignLeft, BookOpen, Mic, Volume2, Headphones, CheckSquare, MessageSquare } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { clearConversionCache } from "@shared/utils/scoreConversion";

/* IELTS official band criteria.
   AP#1 fix: Writing Task 2 dùng "Task Response" (TR) — không phải "Task
   Achievement" như Task 1. Trước đây chỉ có 1 mảng criteria cho cả writing
   skill nên Task 2 hiển thị TA sai. Restructure cho phép per-task criteria. */
const WRITING_TASK1_CRITERIA = [
  { key: "task_achievement", label: "Task Achievement", short: "TA" },
  { key: "coherence_cohesion", label: "Coherence & Cohesion", short: "CC" },
  { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
  { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
];
const WRITING_TASK2_CRITERIA = [
  { key: "task_response", label: "Task Response", short: "TR" },
  { key: "coherence_cohesion", label: "Coherence & Cohesion", short: "CC" },
  { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
  { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
];
const SPEAKING_CRITERIA = [
  { key: "fluency_coherence", label: "Fluency & Coherence", short: "FC" },
  { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
  { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
  { key: "pronunciation", label: "Pronunciation", short: "P" },
];

const DESCRIPTOR_SKILLS = [
  {
    key: "writing",
    label: "Writing",
    taskTypes: [
      { key: "task1", label: "Task 1", criteria: WRITING_TASK1_CRITERIA },
      { key: "task2", label: "Task 2", criteria: WRITING_TASK2_CRITERIA },
    ],
  },
  {
    key: "speaking",
    label: "Speaking",
    taskTypes: [
      { key: "general", label: "Tất cả Parts", criteria: SPEAKING_CRITERIA },
    ],
  },
];

const ALL_SKILLS = [
  { key: "writing",   label: "Writing",   icon: "pen",       color: "#FA7D64", soft: "#FFF1EF" },
  { key: "speaking",  label: "Speaking",  icon: "mic",       color: "#A78BFA", soft: "#F5F3FF" },
  { key: "reading",   label: "Reading",   icon: "book",      color: "#10B981", soft: "#ECFDF5" },
  { key: "listening", label: "Listening", icon: "headphones", color: "#0EA5E9", soft: "#E0F2FE" },
];

const SKILL_ICON: Record<string, React.ReactNode> = {
  writing:   <Pen size={13} />,
  speaking:  <Mic size={13} />,
  reading:   <BookOpen size={13} />,
  listening: <Headphones size={13} />,
};

const CRITERIA_ICON: Record<string, React.ReactNode> = {
  task_achievement:  <CheckSquare size={14} />,
  task_response:     <MessageSquare size={14} />,
  coherence_cohesion:<AlignLeft size={14} />,
  lexical_resource:  <BookOpen size={14} />,
  grammar_accuracy:  <CheckSquare size={14} />,
  fluency_coherence: <Volume2 size={14} />,
  pronunciation:     <Mic size={14} />,
};

const BANDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const BAND_COLORS: Record<string, string> = {
  "9": "bg-emerald-500", "8.5": "bg-emerald-400", "8": "bg-teal-500",
  "7.5": "bg-teal-400", "7": "bg-sky-500", "6.5": "bg-sky-400",
  "6": "bg-blue-500", "5.5": "bg-blue-400", "5": "bg-amber-500",
  "4.5": "bg-amber-400", "4": "bg-orange-500", "3.5": "bg-orange-400",
  "3": "bg-red-400", "2.5": "bg-red-500", "2": "bg-red-600",
};

const BAND_STYLE: Record<number, { bg: string; label: string }> = {
  9: { bg: "#7C3AED", label: "Expert" },
  8: { bg: "#0EA5E9", label: "Very Good" },
  7: { bg: "#10B981", label: "Good" },
  6: { bg: "#F59E0B", label: "Competent" },
  5: { bg: "#FA7D64", label: "Modest" },
  4: { bg: "#94A3B8", label: "Limited" },
  3: { bg: "#F87171", label: "Extremely Limited" },
  2: { bg: "#EF4444", label: "Intermittent" },
  1: { bg: "#B91C1C", label: "Non User" },
};

const CRITERIA_COLORS: string[] = ["coral", "teal", "yellow", "violet"];
const CRITERIA_BG: Record<string, string> = {
  coral: "var(--lp-coral-soft, #FFF1EF)",
  teal: "var(--lp-teal-soft, #E6F7F6)",
  yellow: "var(--lp-yellow-soft, #FFFBEB)",
  violet: "#F5F3FF",
};
const CRITERIA_ACCENT: Record<string, string> = {
  coral: "var(--lp-coral, #FA7D64)",
  teal: "var(--lp-teal, #2DD4BF)",
  yellow: "var(--lp-yellow, #F59E0B)",
  violet: "#7C3AED",
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
  /* AP#1: criteria giờ ở task-type level (Writing Task 1 vs Task 2 khác
     nhau). Resolve based on currentSkill + taskType. Speaking chỉ có 1 task
     nên fallback an toàn. */
  const currentTask = currentSkill?.taskTypes.find(t => t.key === taskType) ?? currentSkill?.taskTypes[0];
  const currentCriteria = currentTask?.criteria ?? [];
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
    for (const c of currentCriteria) {
      for (const band of BANDS) {
        const desc = descriptors[makeKey(c.key, band)] || "";
        // Loại bullets trống trước khi lưu để DB sạch sẽ.
        const cleaned = desc
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .join("\n");
        if (cleaned) {
          rows.push({ skill, criteria: c.key, band, description: cleaned, task_type: taskType });
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
  const totalSlots = currentSkill ? currentCriteria.length * BANDS.length : 0;
  const filledSlots = currentSkill ? currentCriteria.reduce((sum, c) =>
    sum + BANDS.filter(b => (descriptors[makeKey(c.key, b)] || "").trim()).length, 0) : 0;
  const progressPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  const getFilledCount = (criteriaKey: string) =>
    BANDS.filter(b => (descriptors[makeKey(criteriaKey, b)] || "").trim()).length;

  // Navigate criteria
  const criteriaIdx = activeCriteria && currentSkill ? currentCriteria.findIndex(c => c.key === activeCriteria) : -1;
  const canPrev = criteriaIdx > 0;
  const canNext = currentSkill ? criteriaIdx >= 0 && criteriaIdx < currentCriteria.length - 1 : false;

  // active band for preview (overview mode)
  const [activeBand, setActiveBand] = useState(7);
  const displayBands = [9, 8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div className="space-y-6">

      {/* ── Skill + Task tab bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {/* Skill pill tabs — icon + color per skill */}
        <div style={{
          display: "flex", gap: 4, padding: 4,
          background: "var(--lp-cream, #F9F8F4)",
          border: "2.5px solid var(--lp-ink, #0B0C0E)",
          borderRadius: 14,
          boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)",
        }}>
          {ALL_SKILLS.map(s => {
            const isActive = skill === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSkill(s.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", fontSize: 12, fontWeight: 800,
                  background: isActive ? s.color : "transparent",
                  color: isActive ? "#fff" : "var(--lp-ink, #0B0C0E)",
                  border: isActive ? "2px solid var(--lp-ink, #0B0C0E)" : "2px solid transparent",
                  borderRadius: 10, cursor: "pointer", transition: "all .12s",
                  boxShadow: isActive ? "2px 2px 0 0 var(--lp-ink)" : "none",
                }}
              >
                <span style={{ display: "flex", opacity: isActive ? 1 : 0.5 }}>{SKILL_ICON[s.key]}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Task type sub-tabs — colored with active skill color */}
        {currentSkill && currentSkill.taskTypes.length > 1 && (() => {
          const activeSkillMeta = ALL_SKILLS.find(s => s.key === skill);
          return (
            <div style={{
              display: "flex", gap: 0,
              border: "2px solid var(--lp-ink, #0B0C0E)",
              borderRadius: 10, overflow: "hidden",
              boxShadow: "2px 2px 0 0 var(--lp-ink)",
            }}>
              {currentSkill.taskTypes.map((t, idx) => (
                <button
                  key={t.key}
                  onClick={() => setTaskType(t.key)}
                  style={{
                    padding: "6px 16px", fontSize: 11,
                    fontWeight: taskType === t.key ? 900 : 700,
                    background: taskType === t.key ? (activeSkillMeta?.soft ?? "#fff") : "#fff",
                    color: "var(--lp-ink, #0B0C0E)",
                    border: "none", cursor: "pointer", transition: "all .1s",
                    borderRight: idx < currentSkill.taskTypes.length - 1 ? "1.5px solid var(--lp-line, #E5E7EB)" : "none",
                  }}
                >{t.label}</button>
              ))}
            </div>
          );
        })()}

        <div style={{ flex: 1 }} />

        {!isScoreConversion && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Progress pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: progressPct === 100 ? "var(--lp-teal-soft, #E6F7F6)" : "var(--lp-cream, #F9F8F4)",
              border: "2px solid var(--lp-ink, #0B0C0E)",
              borderRadius: 20, padding: "4px 12px",
              fontSize: 11, fontWeight: 800,
            }}>
              {progressPct === 100 && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#10B981" }} />}
              <span style={{ color: "var(--lp-body)" }}>{filledSlots}/{totalSlots}</span>
              <div style={{
                width: 60, height: 6, background: "var(--lp-line, #E5E7EB)",
                borderRadius: 99, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progressPct}%`, height: "100%",
                  background: progressPct === 100 ? "#10B981" : "var(--lp-coral, #FA7D64)",
                  transition: "width .3s",
                }} />
              </div>
            </div>

            <PopButton tone="coral" size="sm" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Lưu
            </PopButton>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isScoreConversion ? (
        <div style={{
          background: "#fff",
          border: "2.5px solid var(--lp-ink, #0B0C0E)",
          borderRadius: 18,
          boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
          overflow: "hidden",
        }}>
          {/* Skill header bar */}
          <div style={{
            padding: "14px 20px",
            borderBottom: "2px solid var(--lp-ink, #0B0C0E)",
            background: ALL_SKILLS.find(s => s.key === skill)?.soft ?? "var(--lp-cream, #F9F8F4)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: ALL_SKILLS.find(s => s.key === skill)?.color ?? "var(--lp-ink)",
              border: "2px solid var(--lp-ink, #0B0C0E)",
              display: "grid", placeItems: "center", color: "#fff", flexShrink: 0,
            }}>
              {SKILL_ICON[skill]}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--lp-body)" }}>Score Conversion</div>
              <div className="font-display" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em" }}>
                {skill === "reading" ? "Reading" : "Listening"} · Bảng quy đổi điểm
              </div>
            </div>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <ScoreConversionSection skill={skill} />
          </div>
        </div>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--lp-body)" }} />
        </div>
      ) : !activeCriteria ? (
        /* ===== OVERVIEW: band ladder + detail card ===== */
        <div className="space-y-6">
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 18 }}>

            {/* Band ladder */}
            <div style={{
              background: "#fff",
              border: "2.5px solid var(--lp-ink, #0B0C0E)",
              borderRadius: 18, padding: "14px 12px",
              boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
              height: "fit-content",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--lp-body)", padding: "4px 8px 10px" }}>Band</div>
              {displayBands.map(b => {
                const m = BAND_STYLE[b];
                if (!m) return null;
                const filled = currentCriteria.length > 0
                  ? currentCriteria.filter(c => (descriptors[makeKey(c.key, b)] || "").trim()).length
                  : 0;
                return (
                  <div
                    key={b}
                    onClick={() => setActiveBand(b)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 8px", borderRadius: 10, cursor: "pointer",
                      background: activeBand === b ? "var(--lp-cream, #F9F8F4)" : "transparent",
                      border: activeBand === b ? "2px solid var(--lp-ink, #0B0C0E)" : "2px solid transparent",
                      marginBottom: 3,
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 9, background: m.bg,
                      border: "2.5px solid var(--lp-ink, #0B0C0E)",
                      display: "grid", placeItems: "center",
                      fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 19, color: "#fff",
                      boxShadow: activeBand === b ? "3px 3px 0 0 var(--lp-ink)" : "none",
                      flexShrink: 0,
                    }}>{b}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, fontFamily: "var(--ff-display, inherit)" }}>Band {b}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--lp-body)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.label}</div>
                      {currentCriteria.length > 0 && (
                        <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                          {currentCriteria.map((c, i) => {
                            const has = (descriptors[makeKey(c.key, b)] || "").trim();
                            return (
                              <div key={c.key} style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: has ? CRITERIA_ACCENT[CRITERIA_COLORS[i] || "coral"] : "var(--lp-line, #E5E7EB)",
                              }} />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active band detail — criteria cards */}
            <div style={{
              background: "#fff",
              border: "2.5px solid var(--lp-ink, #0B0C0E)",
              borderRadius: 18, padding: "22px 24px",
              boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
            }}>
              {/* Band header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 16, marginBottom: 18,
                paddingBottom: 16, borderBottom: "2px dashed var(--lp-ink, #0B0C0E)",
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 14, background: BAND_STYLE[activeBand]?.bg,
                  border: "3px solid var(--lp-ink, #0B0C0E)",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 38, color: "#fff",
                  boxShadow: "5px 5px 0 0 var(--lp-ink, #0B0C0E)", flexShrink: 0,
                }}>{activeBand}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--lp-body)" }}>
                    {skill === "writing"
                      ? `IELTS Writing · ${currentSkill?.taskTypes.find(t => t.key === taskType)?.label ?? ""}`
                      : "IELTS Speaking"} · Band {activeBand}
                  </div>
                  <h2 className="font-display" style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", margin: "4px 0 2px" }}>
                    {BAND_STYLE[activeBand]?.label} user
                  </h2>
                  <div style={{ fontSize: 12, color: "var(--lp-body)" }}>
                    {currentCriteria.length} tiêu chí · nhấn một tiêu chí để chỉnh sửa mô tả
                  </div>
                </div>
              </div>

              {/* 2×2 criteria preview cards */}
              {currentCriteria.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {currentCriteria.map((c, i) => {
                    const color = CRITERIA_COLORS[i] || "coral";
                    const desc = descriptors[makeKey(c.key, activeBand)] || "";
                    const firstLine = desc.split("\n").find(l => l.trim()) || "";
                    const iconColor = color === "yellow" ? "var(--lp-ink)" : "#fff";
                    return (
                      <button
                        key={c.key}
                        onClick={() => setActiveCriteria(c.key)}
                        style={{
                          padding: "14px 16px",
                          background: CRITERIA_BG[color],
                          border: "2px solid var(--lp-ink, #0B0C0E)",
                          borderRadius: 14, textAlign: "left", cursor: "pointer",
                          transition: "box-shadow .1s, transform .1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 0 var(--lp-ink)"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          {/* Icon square with flat icon + abbr below */}
                          <div style={{
                            width: 36, height: 36, borderRadius: 9,
                            background: CRITERIA_ACCENT[color],
                            border: "2px solid var(--lp-ink, #0B0C0E)",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            flexShrink: 0, gap: 1,
                          }}>
                            <span style={{ color: iconColor, display: "flex", lineHeight: 1 }}>{CRITERIA_ICON[c.key]}</span>
                            <span style={{ fontFamily: "var(--ff-mono, monospace)", fontSize: 7, fontWeight: 900, color: iconColor, letterSpacing: "0.04em" }}>{c.short}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: CRITERIA_ACCENT[color], marginBottom: 1 }}>{c.short}</div>
                            <div className="font-display" style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15 }}>{c.label}</div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--lp-body)", flexShrink: 0 }} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--lp-ink)", lineHeight: 1.5, minHeight: 36 }}>
                          {firstLine || <span style={{ color: "var(--lp-body)", fontStyle: "italic" }}>Chưa có mô tả — nhấn để thêm</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--lp-body)", fontSize: 13 }}>
                  Không có tiêu chí cho skill này
                </div>
              )}
            </div>
          </div>

          {/* Full comparison table */}
          {currentCriteria.length > 0 && (
            <div style={{
              background: "#fff",
              border: "2.5px solid var(--lp-ink, #0B0C0E)",
              borderRadius: 18,
              boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "14px 20px", borderBottom: "2px solid var(--lp-ink, #0B0C0E)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span className="font-display" style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>Bảng so sánh đầy đủ</span>
                <span style={{ fontSize: 12, color: "var(--lp-body)" }}>· Click hàng để focus band</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--lp-ink, #0B0C0E)" }}>
                      <th style={{ width: 80, padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.06em" }}>BAND</th>
                      {currentCriteria.map((c, i) => {
                        const color = CRITERIA_COLORS[i] || "coral";
                        return (
                          <th key={c.key} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{
                                fontFamily: "var(--ff-mono, monospace)", fontSize: 10, fontWeight: 900,
                                padding: "1px 6px", background: CRITERIA_ACCENT[color], borderRadius: 4,
                                color: color === "yellow" ? "var(--lp-ink)" : "#fff",
                              }}>{c.short}</span>
                              <span style={{ fontWeight: 700 }}>{c.label}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {displayBands.map(b => {
                      const m = BAND_STYLE[b];
                      if (!m) return null;
                      return (
                        <tr
                          key={b}
                          onClick={() => setActiveBand(b)}
                          style={{
                            background: activeBand === b ? "var(--lp-yellow-soft, #FFFBEB)" : undefined,
                            borderBottom: "1.5px solid var(--lp-line, #E5E7EB)",
                            cursor: "pointer",
                          }}
                        >
                          <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 9, background: m.bg,
                              border: "2.5px solid var(--lp-ink, #0B0C0E)",
                              display: "grid", placeItems: "center",
                              fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 17, color: "#fff",
                            }}>{b}</div>
                          </td>
                          {currentCriteria.map(c => (
                            <td key={c.key} style={{ padding: "10px 14px", fontSize: 12.5, lineHeight: 1.5, color: "var(--lp-ink)", verticalAlign: "top" }}>
                              {descriptors[makeKey(c.key, b)]?.split("\n").find(l => l.trim()) || (
                                <span style={{ color: "var(--lp-line, #E5E7EB)", fontStyle: "italic" }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ===== CRITERIA DETAIL EDITOR ===== */
        <div className="space-y-4">
          {/* Navigation bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fff",
            border: "2px solid var(--lp-ink, #0B0C0E)",
            borderRadius: 12, padding: "8px 14px",
            boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)",
          }}>
            <button
              onClick={() => setActiveCriteria(null)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, color: "var(--lp-ink)",
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Tổng quan
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(() => {
                const color = CRITERIA_COLORS[criteriaIdx] || "coral";
                return (
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, background: CRITERIA_ACCENT[color],
                    border: "2px solid var(--lp-ink)", display: "grid", placeItems: "center",
                  }}>
                    <span style={{ fontFamily: "var(--ff-mono, monospace)", fontSize: 9, fontWeight: 900, color: color === "yellow" ? "var(--lp-ink)" : "#fff" }}>
                      {currentCriteria[criteriaIdx]?.short}
                    </span>
                  </div>
                );
              })()}
              <span style={{ fontWeight: 900, fontSize: 14 }}>{currentCriteria[criteriaIdx]?.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
                background: getFilledCount(activeCriteria) === 9 ? "#D1FAE5" : "var(--lp-cream, #F9F8F4)",
                color: getFilledCount(activeCriteria) === 9 ? "#065F46" : "var(--lp-body)",
                border: "1.5px solid var(--lp-line)",
              }}>
                {getFilledCount(activeCriteria)}/9
              </span>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              <button
                disabled={!canPrev}
                onClick={() => canPrev && setActiveCriteria(currentCriteria[criteriaIdx - 1].key)}
                style={{
                  width: 28, height: 28, display: "grid", placeItems: "center",
                  background: "none", border: "2px solid var(--lp-line, #E5E7EB)",
                  borderRadius: 7, cursor: canPrev ? "pointer" : "not-allowed",
                  opacity: canPrev ? 1 : 0.35,
                }}
              ><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button
                disabled={!canNext}
                onClick={() => canNext && setActiveCriteria(currentCriteria[criteriaIdx + 1].key)}
                style={{
                  width: 28, height: 28, display: "grid", placeItems: "center",
                  background: "none", border: "2px solid var(--lp-line, #E5E7EB)",
                  borderRadius: 7, cursor: canNext ? "pointer" : "not-allowed",
                  opacity: canNext ? 1 : 0.35,
                }}
              ><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Band editors */}
          <div style={{ display: "grid", gap: 10 }}>
            {BANDS.slice().reverse().map(band => {
              const m = BAND_STYLE[band];
              const raw = descriptors[makeKey(activeCriteria, band)] || "";
              const bullets = raw ? raw.split("\n") : [];
              const hasFill = bullets.filter(l => l.trim()).length > 0;

              const setBullets = (newBullets: string[]) => {
                handleChange(activeCriteria, band, newBullets.join("\n"));
              };
              const updateBullet = (idx: number, val: string) => {
                const next = [...bullets]; next[idx] = val; setBullets(next);
              };
              const removeBullet = (idx: number) => {
                setBullets(bullets.filter((_, i) => i !== idx));
              };
              const addBullet = () => {
                setBullets([...bullets, ""]);
                setTimeout(() => {
                  const inputs = document.querySelectorAll(`[data-band-input="${activeCriteria}-${band}"]`);
                  (inputs[inputs.length - 1] as HTMLInputElement)?.focus();
                }, 50);
              };
              const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = [...bullets];
                  next.splice(idx + 1, 0, "");
                  setBullets(next);
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
                  style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    padding: "12px 14px",
                    background: hasFill ? "#fff" : "var(--lp-cream, #F9F8F4)",
                    border: hasFill ? "2px solid var(--lp-ink, #0B0C0E)" : "2px solid var(--lp-line, #E5E7EB)",
                    borderRadius: 14,
                    boxShadow: hasFill ? "3px 3px 0 0 var(--lp-ink)" : "none",
                    transition: "all .15s",
                  }}
                >
                  {/* Band badge */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: m?.bg ?? "#aaa",
                    border: "2.5px solid var(--lp-ink, #0B0C0E)",
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 18, color: "#fff",
                    flexShrink: 0,
                  }}>{band}</div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--lp-body)" }}>
                        Band {band} · {m?.label}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--lp-body)" }}>{bullets.filter(l => l.trim()).length} mục</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {bullets.map((bullet, idx) => (
                        <div key={idx} className="group" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "var(--lp-coral, #FA7D64)", fontSize: 14, lineHeight: 1, flexShrink: 0 }}>•</span>
                          <Input
                            data-band-input={`${activeCriteria}-${band}`}
                            value={bullet}
                            onChange={e => updateBullet(idx, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx)}
                            placeholder="Nhập mô tả..."
                            className="h-7 text-xs border-transparent bg-transparent hover:bg-muted/30 focus:bg-background focus:border-input px-2 py-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeBullet(idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", display: "flex" }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addBullet}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700, color: "var(--lp-body)",
                        marginTop: 6, paddingLeft: 20,
                      }}
                    >
                      <Plus className="h-3 w-3" /> Thêm mục
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

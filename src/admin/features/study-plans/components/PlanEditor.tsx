/**
 * PlanEditor — F3.4 shared scaffold for 3 plan tiers (Template / UOP / Instance).
 *
 * Mode-aware editor handling all 3 tiers per F3 v2 spec §4.1:
 * - mode="template": Tier 1 — admin scope, course/program defaults
 * - mode="uop":      Tier 2 — User-Owned Plan, teacher account scope, optional public share
 * - mode="instance": Tier 2 — class-level instance, derived from template/UOP
 *
 * Tabs:
 * 1. Info — name, program, course, CEFR, levels, tags
 * 2. Time — bidirectional sessions ↔ total_hours với session_duration_minutes
 * 3. Milestones — placeholder cho lessons/units (F3 later sprint)
 *
 * SCAFFOLD: Empty editor renders correctly. Save logic stub (calls onSave callback).
 * Wire to schema after F3.1 migration deliver (parent component will handle data fetch
 * + DB write via mutation hook).
 *
 * Usage:
 *   <PlanEditor
 *     mode="template"
 *     value={data}
 *     onChange={setData}
 *     onSave={async (data) => { await upsertPlan.mutateAsync(data); }}
 *   />
 */

import { useState, useCallback } from "react";
import { BookOpen, Clock, Loader2, Milestone, Save, Tag, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { DurationPicker } from "@shared/components/ui/duration-picker";
import { cn } from "@shared/lib/utils";

export type PlanEditorMode = "template" | "uop" | "instance";

export interface PlanEditorData {
  // Common (all modes)
  name: string;
  program: string | null;
  course_id: string | null;
  cefr_level: string | null;
  level_ids: string[];
  tags: string[];
  description: string | null;

  // Time fields (bidirectional, F3 v2 §4.2)
  sessions: number;
  total_hours: number;
  session_duration_minutes: number;

  // Mode-specific
  class_id?: string | null;        // instance only
  is_public?: boolean;              // uop only
  created_by_user_id?: string | null; // uop only (set by parent)
  parent_template_id?: string | null; // instance derived from template
  parent_uop_id?: string | null;      // instance derived from UOP, OR uop copied from public
}

export const EMPTY_PLAN_DATA: PlanEditorData = {
  name: "",
  program: null,
  course_id: null,
  cefr_level: null,
  level_ids: [],
  tags: [],
  description: null,
  sessions: 10,
  total_hours: 10,
  session_duration_minutes: 60,
  class_id: null,
  is_public: false,
  created_by_user_id: null,
  parent_template_id: null,
  parent_uop_id: null,
};

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface PlanEditorProps {
  mode: PlanEditorMode;
  value: PlanEditorData;
  onChange: (data: PlanEditorData) => void;
  onSave?: (data: PlanEditorData) => Promise<void> | void;
  saving?: boolean;
  /** Header title override. Default derives from mode. */
  title?: string;
  className?: string;
}

const MODE_META: Record<PlanEditorMode, { label: string; tone: string; icon: typeof BookOpen }> = {
  template: { label: "Template (Tier 1)",  tone: "text-primary",      icon: BookOpen },
  uop:      { label: "UOP (Tier 3)",       tone: "text-violet-600",   icon: Users },
  instance: { label: "Instance (Tier 2)",  tone: "text-emerald-600",  icon: Milestone },
};

export function PlanEditor({
  mode,
  value,
  onChange,
  onSave,
  saving = false,
  title,
  className,
}: PlanEditorProps) {
  const [activeTab, setActiveTab] = useState<"info" | "time" | "milestones">("info");
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  // Bidirectional time math (F3 v2 §4.2)
  // Single source of truth: total_hours (derived from sessions × duration if needed)
  const updateField = <K extends keyof PlanEditorData>(key: K, val: PlanEditorData[K]) => {
    onChange({ ...value, [key]: val });
  };

  const setSessions = useCallback((n: number) => {
    const safe = Math.max(0, Math.floor(Number(n) || 0));
    const totalHours = +(safe * value.session_duration_minutes / 60).toFixed(2);
    onChange({ ...value, sessions: safe, total_hours: totalHours });
  }, [value, onChange]);

  const setTotalHours = useCallback((h: number) => {
    const safe = Math.max(0, +Number(h).toFixed(2));
    const slotMinutes = value.session_duration_minutes || 60;
    const suggestedSessions = Math.ceil((safe * 60) / slotMinutes);
    onChange({ ...value, total_hours: safe, sessions: suggestedSessions });
  }, [value, onChange]);

  const setSessionDuration = useCallback((minutes: number) => {
    const safe = Math.max(15, Math.min(240, Math.floor(Number(minutes) || 60)));
    // Recompute total_hours từ existing sessions count với new duration
    const totalHours = +(value.sessions * safe / 60).toFixed(2);
    onChange({ ...value, session_duration_minutes: safe, total_hours: totalHours });
  }, [value, onChange]);

  const handleSave = async () => {
    if (!onSave) return;
    await onSave(value);
  };

  const headerTitle = title ?? (mode === "template" ? "Tạo / Sửa Template"
    : mode === "uop" ? "Tạo / Sửa Kế hoạch của bạn"
    : "Sửa Kế hoạch lớp");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-bold inline-flex items-center gap-2">
            <Icon className={cn("h-5 w-5", meta.tone)} /> {headerTitle}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
            <span className={cn("inline-block h-2 w-2 rounded-full", mode === "template" ? "bg-primary" : mode === "uop" ? "bg-violet-500" : "bg-emerald-500")} />
            {meta.label}
          </p>
        </div>
        {onSave && (
          <Button onClick={handleSave} disabled={saving || !value.name.trim()} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1 gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Thông tin
          </TabsTrigger>
          <TabsTrigger value="time" className="flex-1 gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Thời gian
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex-1 gap-1.5">
            <Milestone className="h-3.5 w-3.5" /> Buổi học
          </TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div>
            <Label>Tên kế hoạch <span className="text-destructive">*</span></Label>
            <Input
              value={value.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={mode === "template" ? "VD: IELTS 6.5 Foundation" : mode === "uop" ? "VD: Plan Customized cho HS yếu" : "VD: Lớp IELTS 6.5 — Khai giảng 05/2026"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Program</Label>
              <Select
                value={value.program ?? ""}
                onValueChange={(v) => updateField("program", v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ielts">IELTS</SelectItem>
                  <SelectItem value="wre">WRE</SelectItem>
                  <SelectItem value="customized">Customized</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>CEFR Level</Label>
              <Select
                value={value.cefr_level ?? ""}
                onValueChange={(v) => updateField("cefr_level", v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn CEFR (tuỳ chọn)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Không gắn —</SelectItem>
                  {CEFR_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Mô tả</Label>
            <Textarea
              rows={3}
              value={value.description ?? ""}
              onChange={(e) => updateField("description", e.target.value || null)}
              placeholder="Mô tả ngắn về kế hoạch..."
            />
          </div>

          {/* Tags placeholder — multi-input wiring deferred to next sprint */}
          <div>
            <Label>Tags</Label>
            <Input
              value={value.tags.join(", ")}
              onChange={(e) => updateField("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="Nhập tags cách nhau dấu phẩy (foundation, exam-prep, ...)"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Phân cách dấu phẩy. Multi-select picker sẽ thay thế ở sprint sau.
            </p>
          </div>

          {/* Course + Levels wiring deferred — needs F3.1 schema first */}
          <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
            ⏳ Course picker + Levels multi-select sẽ wire sau F3.1 schema deliver
            (cần fetch courses + course_levels và filter theo program).
          </div>

          {/* UOP-only: public share toggle */}
          {mode === "uop" && (
            <div className="rounded-lg border bg-violet-500/5 border-violet-500/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="font-semibold">Chia sẻ công khai</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Plan trở thành public trong "Kho UOPs". Mọi giáo viên có thể copy.
                  </p>
                </div>
                <Switch
                  checked={value.is_public ?? false}
                  onCheckedChange={(c) => updateField("is_public", c)}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Time tab — bidirectional sessions ↔ hours (F3 v2 §4.2) */}
        <TabsContent value="time" className="space-y-4 mt-4">
          <div className="rounded-lg border bg-primary/5 border-primary/30 p-3 text-xs">
            <p className="font-semibold mb-1">📊 Thời gian biểu kế hoạch (bidirectional)</p>
            <p className="text-muted-foreground">
              Nhập <strong>số buổi</strong> hoặc <strong>tổng giờ</strong> — hai trường tự động tính dựa trên thời lượng mỗi buổi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Số buổi học</Label>
              <Input
                type="number"
                min={0}
                value={value.sessions}
                onChange={(e) => setSessions(Number(e.target.value))}
                className="tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Total: <strong className="text-foreground">{value.sessions}</strong> buổi
              </p>
            </div>

            <div className="flex items-end justify-center pb-7">
              <span className="text-2xl text-muted-foreground">↔</span>
            </div>

            <div>
              <Label>Tổng giờ học</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={value.total_hours}
                onChange={(e) => setTotalHours(Number(e.target.value))}
                className="tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Total: <strong className="text-foreground tabular-nums">{value.total_hours}</strong> hrs
              </p>
            </div>
          </div>

          <div className="border-t pt-3">
            <Label>Thời lượng mỗi buổi</Label>
            <div className="flex items-center gap-3 mt-1">
              <DurationPicker
                value={value.session_duration_minutes}
                onChange={setSessionDuration}
              />
              <p className="text-[11px] text-muted-foreground">
                Mặc định 60 phút (1 giờ). Đổi sẽ recompute tổng giờ.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-1">
            <p>⚙️ Công thức:</p>
            <p>• <strong>Tổng giờ</strong> = <code>số buổi × thời lượng buổi / 60</code></p>
            <p>• <strong>Số buổi gợi ý</strong> = <code>ceil(tổng giờ × 60 / thời lượng buổi)</code></p>
            <p>Wizard tạo lớp dùng <code>total_hours</code> để compute requiredSessions theo slot duration (Day 6 e8a04d4).</p>
          </div>
        </TabsContent>

        {/* Milestones tab — placeholder */}
        <TabsContent value="milestones" className="mt-4">
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center space-y-2">
            <Milestone className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium">Buổi học chi tiết</p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              Section này sẽ chứa danh sách buổi học (lesson plan, homework, milestones). Implementation defer F3 sprint sau khi schema deliver.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

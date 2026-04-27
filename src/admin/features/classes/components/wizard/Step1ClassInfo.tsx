import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import type { WizardClassInfo } from "./wizardTypes";

interface Props {
  value: WizardClassInfo;
  onChange: (v: WizardClassInfo) => void;
  errors: Record<string, string>;
}

// Backend convention: program_keys are lowercase ('ielts' | 'wre' | 'customized').
// Must match values stored in `programs.program_key` and used by RPC
// `find_available_teachers_for_slot(p_program_key)`.
const PROGRAM_FALLBACK: { program_key: string; label: string }[] = [
  { program_key: "ielts", label: "IELTS" },
  { program_key: "wre", label: "WRE" },
  { program_key: "customized", label: "Customized" },
];

const PROGRAM_GROUP_LABEL: Record<string, string> = {
  ielts: "IELTS",
  wre: "WRE",
  customized: "Customized",
};

export default function Step1ClassInfo({ value, onChange, errors }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // The `programs` table contains one row per individual program (e.g. 8 IELTS
  // levels share program_key='ielts'). The wizard picks a *group*, so dedupe
  // by program_key. Use a hardcoded label per group rather than the per-row
  // `name` (which would be e.g. "Căng buồm").
  const programsQ = useQuery({
    queryKey: ["wizard-programs"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("programs")
        .select("program_key, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) return PROGRAM_FALLBACK;
      const list = (data || []) as Array<{ program_key: string | null }>;
      const seen = new Set<string>();
      const unique: { program_key: string; label: string }[] = [];
      for (const row of list) {
        const key = (row.program_key || "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push({ program_key: key, label: PROGRAM_GROUP_LABEL[key] || key.toUpperCase() });
      }
      return unique.length ? unique : PROGRAM_FALLBACK;
    },
  });

  const levelsQ = useQuery({
    queryKey: ["wizard-levels", value.program],
    enabled: value.program === "ielts",
    queryFn: async () => {
      // Chỉ lấy levels thuộc program đang chọn VÀ program đó đang ACTIVE.
      const [{ data: progRows }, { data: linkRows }, { data: lvlRows }] = await Promise.all([
        (supabase as any)
          .from("programs")
          .select("id, key, status")
          .eq("status", "active")
          .eq("key", value.program),
        (supabase as any).from("program_levels").select("level_id, program_id"),
        supabase.from("course_levels").select("id, name, sort_order").order("sort_order", { ascending: true }),
      ]);
      const programId: string | undefined = Array.isArray(progRows) && progRows[0]?.id;
      if (!programId) return [];
      const allowed = new Set<string>(
        (Array.isArray(linkRows) ? linkRows : [])
          .filter((r: any) => r.program_id === programId)
          .map((r: any) => r.level_id),
      );
      return (lvlRows ?? []).filter((l: any) => allowed.has(l.id));
    },
  });

  const studyPlansQ = useQuery({
    queryKey: ["wizard-study-plans", value.program, value.level],
    enabled: !!value.program,
    queryFn: async () => {
      let query = supabase.from("study_plans").select("id, plan_name, program, assigned_level").eq("plan_type", "template").limit(50);
      if (value.program) query = query.eq("program", value.program);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
  });

  const set = <K extends keyof WizardClassInfo>(k: K, v: WizardClassInfo[K]) => onChange({ ...value, [k]: v });

  const minEnd = useMemo(() => {
    if (!value.start_date) return today;
    const d = new Date(value.start_date + "T00:00:00");
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, [value.start_date, today]);

  // Reset level when program changes away from IELTS
  useEffect(() => {
    if (value.program !== "ielts" && value.level) onChange({ ...value, level: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.program]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label>Tên lớp <span className="text-destructive">*</span></Label>
        <Input value={value.class_name} onChange={(e) => set("class_name", e.target.value)} placeholder="VD: IELTS 6.5 - Khai giảng 05/2026" />
        {errors.class_name && <p className="text-xs text-destructive mt-1">{errors.class_name}</p>}
      </div>

      <div>
        <Label>Tên khóa</Label>
        <Input value={value.course_title} onChange={(e) => set("course_title", e.target.value)} placeholder="Optional" />
      </div>

      <div>
        <Label>Class type</Label>
        <Select value={value.class_type} onValueChange={(v) => set("class_type", v as WizardClassInfo["class_type"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Program <span className="text-destructive">*</span></Label>
        <Select value={value.program} onValueChange={(v) => set("program", v)}>
          <SelectTrigger><SelectValue placeholder="Chọn program" /></SelectTrigger>
          <SelectContent>
            {(programsQ.data || PROGRAM_FALLBACK).map((p) => (
              <SelectItem key={p.program_key} value={p.program_key}>{p.label || p.program_key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.program && <p className="text-xs text-destructive mt-1">{errors.program}</p>}
      </div>

      <div>
        <Label>Level {value.program !== "ielts" && <span className="text-muted-foreground text-xs">(chỉ IELTS)</span>}</Label>
        <Select value={value.level} onValueChange={(v) => set("level", v)} disabled={value.program !== "ielts"}>
          <SelectTrigger><SelectValue placeholder={value.program === "ielts" ? "Chọn level" : "—"} /></SelectTrigger>
          <SelectContent>
            {(levelsQ.data || []).map((l: any) => (
              <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Ngày bắt đầu <span className="text-destructive">*</span></Label>
        <Input type="date" min={today} value={value.start_date} onChange={(e) => set("start_date", e.target.value)} />
        {errors.start_date && <p className="text-xs text-destructive mt-1">{errors.start_date}</p>}
      </div>

      <div>
        <Label>Ngày kết thúc <span className="text-destructive">*</span></Label>
        <Input type="date" min={minEnd} value={value.end_date} onChange={(e) => set("end_date", e.target.value)} />
        {errors.end_date && <p className="text-xs text-destructive mt-1">{errors.end_date}</p>}
      </div>

      <div>
        <Label>Số học viên tối đa</Label>
        <Input type="number" min={1} value={value.max_students ?? ""} onChange={(e) => set("max_students", e.target.value ? Number(e.target.value) : null)} />
      </div>

      <div>
        <Label>Phòng</Label>
        <Input value={value.room} onChange={(e) => set("room", e.target.value)} placeholder="VD: P301" />
      </div>

      <div className="md:col-span-2">
        <Label>Mô tả</Label>
        <Textarea rows={3} value={value.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="md:col-span-2">
        <Label>Study plan template</Label>
        <Select value={value.study_plan_id ?? "none"} onValueChange={(v) => set("study_plan_id", v === "none" ? null : v)} disabled={!value.program}>
          <SelectTrigger><SelectValue placeholder={value.program ? "Chọn study plan (optional)" : "Chọn program trước"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Không gán —</SelectItem>
            {(studyPlansQ.data || []).map((sp: any) => (
              <SelectItem key={sp.id} value={sp.id}>
                {sp.plan_name || "(no name)"}{sp.assigned_level ? ` · ${sp.assigned_level}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2 flex items-center gap-2">
        <Checkbox id="lb" checked={value.leaderboard_enabled} onCheckedChange={(c) => set("leaderboard_enabled", !!c)} />
        <Label htmlFor="lb" className="cursor-pointer">Bật leaderboard cho lớp này</Label>
      </div>
    </div>
  );
}
import { useMemo } from "react";
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
        .select("key, sort_order, status")
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) return PROGRAM_FALLBACK;
      const list = (data || []) as Array<{ key: string | null }>;
      const seen = new Set<string>();
      const unique: { program_key: string; label: string }[] = [];
      for (const row of list) {
        const key = (row.key || "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push({ program_key: key, label: PROGRAM_GROUP_LABEL[key] || key.toUpperCase() });
      }
      return unique.length ? unique : PROGRAM_FALLBACK;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  /* Fetch courses của program. Pattern lookup program_id by key giống levelsQ.
     Hiện tại chỉ IELTS có courses (verified Lovable Q5: WRE + Customized = 0).
     Course dropdown sẽ ẩn cho program không có courses. Mỗi course đính kèm
     `level_ids` (qua course_level_links) → filteredLevels giới hạn level
     dropdown theo course đã pick. */
  const coursesQ = useQuery({
    queryKey: ["wizard-courses", value.program],
    enabled: !!value.program,
    queryFn: async () => {
      const { data: progRows } = await (supabase as any)
        .from("programs")
        .select("id, key, status")
        .eq("status", "active")
        .eq("key", value.program);
      const programId: string | undefined = Array.isArray(progRows) && progRows[0]?.id;
      if (!programId) return [] as Array<{ id: string; name: string; sort_order: number; status: string; level_ids: string[] }>;
      const [coursesRes, linksRes] = await Promise.all([
        (supabase as any)
          .from("courses")
          .select("id, name, sort_order, status")
          .eq("program_id", programId)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),
        (supabase as any)
          .from("course_level_links")
          .select("course_id, level_id"),
      ]);
      const linksByCourse = new Map<string, string[]>();
      for (const l of (linksRes.data ?? []) as Array<{ course_id: string; level_id: string }>) {
        const arr = linksByCourse.get(l.course_id) ?? [];
        arr.push(l.level_id);
        linksByCourse.set(l.course_id, arr);
      }
      return ((coursesRes.data ?? []) as Array<{ id: string; name: string; sort_order: number; status: string }>)
        .map((c) => ({ ...c, level_ids: linksByCourse.get(c.id) ?? [] }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
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
        // Select study_plan_template_id (cast as any vì types.ts chưa regen sau
        // migration mới của Lovable) — dùng cho L3 hybrid recommendation bên
        // dropdown Study plan template.
        (supabase as any)
          .from("course_levels")
          .select("id, name, sort_order, study_plan_template_id")
          .order("sort_order", { ascending: true }),
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
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  /* Levels visible trong dropdown:
       - Nếu user pick course → chỉ hiện levels nằm trong course.level_ids.
       - Nếu chưa pick course (hoặc skip "— Không gắn —") → hiện toàn bộ levels
         của program như flow cũ. */
  const filteredLevels = useMemo(() => {
    type Lvl = { id: string; name: string; sort_order: number; study_plan_template_id?: string | null };
    const allLevels = (levelsQ.data || []) as Lvl[];
    if (value.course_id && coursesQ.data) {
      const course = coursesQ.data.find((c) => c.id === value.course_id);
      if (course) {
        const allowed = new Set<string>(course.level_ids);
        return allLevels.filter((l) => allowed.has(l.id));
      }
    }
    return allLevels;
  }, [levelsQ.data, value.course_id, coursesQ.data]);

  const set = <K extends keyof WizardClassInfo>(k: K, v: WizardClassInfo[K]) => onChange({ ...value, [k]: v });

  // Issue #1 v2: end_date đã move sang Step 2 (Phase F2.1+ alignment) — depends on
  // weekdays + total_sessions ở Step 2, more logical to live there.
  // Reset logic moved into program Select onValueChange — eliminates double-render
  // cascade (was useEffect[value.program] previously). Single render pass per change.

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label>Tên lớp <span className="text-destructive">*</span></Label>
        <Input value={value.class_name} onChange={(e) => set("class_name", e.target.value)} placeholder="VD: IELTS 6.5 - Khai giảng 05/2026" />
        {errors.class_name && <p className="text-xs text-destructive mt-1">{errors.class_name}</p>}
      </div>

      <div>
        <Label>
          Tên khóa
          {value.course_id && <span className="text-muted-foreground text-xs ml-1">(tự điền từ khoá học)</span>}
        </Label>
        <Input
          value={value.course_title}
          onChange={(e) => set("course_title", e.target.value)}
          placeholder={value.course_id ? "" : "Optional"}
          readOnly={!!value.course_id}
          className={value.course_id ? "bg-muted cursor-not-allowed" : ""}
        />
      </div>

      <div>
        <Label>Loại lớp</Label>
        <Select value={value.class_type} onValueChange={(v) => set("class_type", v as WizardClassInfo["class_type"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Lớp tiêu chuẩn</SelectItem>
            <SelectItem value="private">Lớp 1-1</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1">
          Hình thức dạy (onsite/online/hybrid) chọn ở Step 2.
        </p>
      </div>

      <div>
        <Label>Program <span className="text-destructive">*</span></Label>
        <Select
          value={value.program}
          onValueChange={(v) => {
            // Reset dependent fields atomically (Tier 3 jank fix — was useEffect cascade).
            // Course gắn riêng mỗi program → đổi program = course cũ vô nghĩa.
            // course_title auto-filled từ course → cũng phải reset.
            // Level: chỉ giữ nếu vẫn IELTS (chỉ IELTS có level dropdown).
            // study_plan_id: reset (eligibleTemplates ở Step 2 filter by course_id).
            onChange({
              ...value,
              program: v,
              course_id: null,
              course_title: "",
              level: v === "ielts" ? value.level : "",
              study_plan_id: null,
            });
          }}
        >
          <SelectTrigger><SelectValue placeholder="Chọn program" /></SelectTrigger>
          <SelectContent>
            {(programsQ.data || PROGRAM_FALLBACK).map((p) => (
              <SelectItem key={p.program_key} value={p.program_key}>{p.label || p.program_key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.program && <p className="text-xs text-destructive mt-1">{errors.program}</p>}
      </div>

      {/* Khoá học — luôn render grid cell để tránh layout reflow khi đổi program
          (Tier 2 jank fix). Disabled khi program chưa pick hoặc program không có
          course (verified Lovable Q5: chỉ IELTS có 8 courses; WRE + Customized = 0).
          Pick course → set course_id + auto-fill course_title + reset level. */}
      <div>
        <Label>Khoá học</Label>
        <Select
          value={value.course_id ?? "none"}
          onValueChange={(v) => {
            if (v === "none") {
              // Reset study_plan_id cùng — eligibleTemplates ở Step 2 filter theo course_id.
              onChange({ ...value, course_id: null, study_plan_id: null });
            } else {
              const course = (coursesQ.data ?? []).find((c) => c.id === v);
              onChange({
                ...value,
                course_id: v,
                course_title: course?.name ?? value.course_title,
                level: "",
                study_plan_id: null,
              });
            }
          }}
          disabled={!value.program || coursesQ.isLoading || (coursesQ.data ?? []).length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !value.program ? "Chọn program trước"
              : coursesQ.isLoading ? "Đang tải..."
              : (coursesQ.data ?? []).length === 0 ? "Không có khoá học cho chương trình này"
              : "Chọn khoá học"
            } />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Không gắn khoá học —</SelectItem>
            {(coursesQ.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Level {value.program !== "ielts" && <span className="text-muted-foreground text-xs">(chỉ IELTS)</span>}</Label>
        <Select value={value.level} onValueChange={(v) => set("level", v)} disabled={value.program !== "ielts"}>
          <SelectTrigger><SelectValue placeholder={value.program === "ielts" ? "Chọn level" : "—"} /></SelectTrigger>
          <SelectContent>
            {filteredLevels.map((l) => (
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

      {/* Ngày kết thúc moved to Step 2 (Issue #1 v2 redesign) — depends on
          weekdays + template total_sessions which live in Step 2. */}

      <div>
        <Label>Số học viên tối đa</Label>
        <Input type="number" min={1} value={value.max_students ?? ""} onChange={(e) => set("max_students", e.target.value ? Number(e.target.value) : null)} />
      </div>

      <div className="md:col-span-2">
        <Label>Mô tả</Label>
        <Textarea rows={3} value={value.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      {/* Study plan template dropdown đã move sang Step 2 (Phase F2.1) — filter
          eligible templates theo course_id qua junction course_study_plans. */}

      <div className="md:col-span-2 flex items-center gap-2">
        <Checkbox id="lb" checked={value.leaderboard_enabled} onCheckedChange={(c) => set("leaderboard_enabled", !!c)} />
        <Label htmlFor="lb" className="cursor-pointer">Bật leaderboard cho lớp này</Label>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import type { ClassDetail } from "@admin/features/classes/components/ClassInfoCard";

/**
 * Tab "Cấu hình" — form sửa các field cơ bản trên teachngo_classes. Các field
 * mới (name, class_code, branch, mode, student_count) lưu qua `(supabase as
 * any)` cast vì supabase types.ts (read-only) chưa regen sau migration.
 */
export function SettingsTab({ cls, onSaved }: { cls: ClassDetail; onSaved?: () => void }) {
  const [form, setForm] = useState({
    name: cls.name ?? cls.class_name ?? "",
    class_code: cls.class_code ?? "",
    program: cls.program ?? "",
    level: cls.level ?? "",
    branch: cls.branch ?? "",
    mode: cls.mode ?? "",
    room: cls.room ?? "",
    schedule: cls.schedule ?? "",
    default_start_time: cls.default_start_time ?? "",
    default_end_time: cls.default_end_time ?? "",
    start_date: cls.start_date ?? "",
    end_date: cls.end_date ?? "",
    description: cls.description ?? "",
    class_type: cls.class_type ?? "Standard",
    leaderboard_enabled: cls.leaderboard_enabled ?? true,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      // Strip empty strings — DB nullable cols nên dùng null thay vì ""
      const payload: Record<string, unknown> = {};
      Object.entries(form).forEach(([k, v]) => {
        payload[k] = v === "" ? null : v;
      });
      const { error } = await (supabase as any)
        .from("classes" as any)
        .update(payload)
        .eq("id", cls.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã lưu cấu hình");
      onSaved?.();
    },
    onError: (e: Error) => toast.error(`Lưu thất bại: ${e.message}`),
  });

  return (
    <div className="space-y-5">
      {/* Cơ bản */}
      <Section title="Thông tin cơ bản">
        <Field label="Tên lớp">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Mã lớp">
          <Input
            value={form.class_code}
            onChange={(e) => set("class_code", e.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label="Program">
          <Input value={form.program} onChange={(e) => set("program", e.target.value)} placeholder="VD: IELTS" />
        </Field>
        <Field label="Level">
          <Input value={form.level} onChange={(e) => set("level", e.target.value)} placeholder="VD: Pre" />
        </Field>
        <Field label="Cơ sở">
          <Input value={form.branch} onChange={(e) => set("branch", e.target.value)} />
        </Field>
        <Field label="Hình thức">
          <Input value={form.mode} onChange={(e) => set("mode", e.target.value)} placeholder="Online / Offline / Hybrid" />
        </Field>
        <Field label="Phòng">
          <Input value={form.room} onChange={(e) => set("room", e.target.value)} />
        </Field>
        <Field label="Loại lớp">
          <Input value={form.class_type} onChange={(e) => set("class_type", e.target.value)} placeholder="Standard / Private" />
        </Field>
      </Section>

      {/* Lịch */}
      <Section title="Lịch học">
        <Field label="Mô tả lịch" full>
          <Input value={form.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder="VD: T2-T4-T6 19:00-21:00" />
        </Field>
        <Field label="Giờ bắt đầu (mặc định)">
          <Input
            type="time"
            value={form.default_start_time}
            onChange={(e) => set("default_start_time", e.target.value)}
          />
        </Field>
        <Field label="Giờ kết thúc (mặc định)">
          <Input
            type="time"
            value={form.default_end_time}
            onChange={(e) => set("default_end_time", e.target.value)}
          />
        </Field>
        <Field label="Ngày khai giảng">
          <Input
            type="date"
            value={form.start_date?.slice(0, 10)}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </Field>
        <Field label="Ngày kết thúc">
          <Input
            type="date"
            value={form.end_date?.slice(0, 10)}
            onChange={(e) => set("end_date", e.target.value)}
          />
        </Field>
      </Section>

      {/* Mô tả & toggle */}
      <Section title="Mô tả & cài đặt">
        <Field label="Mô tả" full>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
          />
        </Field>
        <div className="sm:col-span-2 flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Bật bảng xếp hạng</p>
            <p className="text-[11px] text-muted-foreground">Hiển thị tab Xếp hạng cho học viên trong lớp.</p>
          </div>
          <Switch
            checked={form.leaderboard_enabled}
            onCheckedChange={(v) => set("leaderboard_enabled", v)}
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="gap-1.5">
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveMut.isPending ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

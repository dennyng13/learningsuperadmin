import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
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
    course_id: cls.course_id ?? "",
    price_vnd_override: cls.price_vnd_override?.toString() ?? "",
  });

  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* Q7: prompt khi đổi course_id → có muốn inherit study plan + giá từ course mới? */
  const coursesQ = useQuery({
    queryKey: ["admin-courses-picker"],
    queryFn: async (): Promise<Array<{ id: string; name: string; price_vnd: number | null }>> => {
      const { data, error } = await (supabase as any)
        .from("courses")
        .select("id, name, price_vnd")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      // Strip empty strings — DB nullable cols nên dùng null thay vì ""
      const payload: Record<string, unknown> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (k === "price_vnd_override") {
          payload[k] = v === "" ? null : Number(v);
        } else if (k === "course_id") {
          payload[k] = v === "" ? null : v;
        } else {
          payload[k] = v === "" ? null : v;
        }
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

  /* RPC inherit_class_from_course — áp study plan default + giá từ course vào lớp. */
  const inheritMut = useMutation({
    mutationFn: async (args: { courseId: string; overwrite: boolean }) => {
      const { error } = await (supabase as any).rpc("inherit_class_from_course", {
        p_class_id: cls.id,
        p_course_id: args.courseId,
        p_overwrite: args.overwrite,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã áp dụng study plan + giá từ khoá học");
      setPendingCourseId(null);
      onSaved?.();
    },
    onError: (e: Error) => toast.error(`Inherit thất bại: ${e.message}`),
  });

  const onChangeCourse = (newCourseId: string) => {
    set("course_id", newCourseId);
    // Chỉ prompt nếu đã có course_id cũ và giá trị thực sự thay đổi.
    if (newCourseId && newCourseId !== (cls.course_id ?? "")) {
      setPendingCourseId(newCourseId);
    }
  };

  return (
    <div className="space-y-5">
      {/* Khoá học + giá (P4a) */}
      <Section title="Khoá học & giá">
        <Field label="Khoá học gốc" full>
          <Select value={form.course_id} onValueChange={onChangeCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Chưa gắn khoá học" />
            </SelectTrigger>
            <SelectContent>
              {coursesQ.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {c.name}
                    {c.price_vnd != null && (
                      <span className="text-[10px] text-muted-foreground">
                        · {c.price_vnd.toLocaleString("vi-VN")}₫
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Gắn khoá học để kế thừa study plan và giá mặc định.
          </p>
        </Field>
        <Field label="Giá lớp override (₫)">
          <Input
            type="number"
            value={form.price_vnd_override}
            onChange={(e) => set("price_vnd_override", e.target.value)}
            placeholder={
              cls.course_price_vnd != null
                ? `Mặc định ${cls.course_price_vnd.toLocaleString("vi-VN")}₫ từ khoá học`
                : "Để trống để dùng giá từ khoá học"
            }
          />
          <p className="text-[11px] text-muted-foreground">
            Override giá cho lớp này. Để trống → dùng giá từ khoá học.
          </p>
        </Field>
      </Section>

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

      {/* Q7: prompt confirm đổi course → có inherit không */}
      <AlertDialog open={!!pendingCourseId} onOpenChange={(o) => !o && setPendingCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Áp dụng study plan + giá từ khoá học mới?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn vừa đổi khoá học gốc của lớp. Có muốn hệ thống tự động:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-foreground">
                <li>Gắn study plan mặc định của khoá học mới</li>
                <li>Cập nhật giá lớp theo giá của khoá học mới (nếu có)</li>
              </ul>
              <p className="mt-2 text-xs">
                Bấm “Không, chỉ đổi khoá” để giữ nguyên study plan và giá hiện tại.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={inheritMut.isPending}>
              Không, chỉ đổi khoá
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={inheritMut.isPending}
              onClick={() =>
                pendingCourseId &&
                inheritMut.mutate({ courseId: pendingCourseId, overwrite: true })
              }
            >
              {inheritMut.isPending ? "Đang áp dụng…" : "Có, áp dụng"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

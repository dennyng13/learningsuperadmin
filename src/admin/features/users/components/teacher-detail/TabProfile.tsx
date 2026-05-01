// Stage P3 admin — TeacherDetailPage "Hồ sơ" tab.
// Read/edit form for the expanded teacher master-data fields. Admin can
// edit any field (RLS allows admin full access). The teacher self-edit
// path (only a subset of fields) lives in the teacher app.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Switch } from "@shared/components/ui/switch";
import { formatDateTimeDDMMYYYY } from "@shared/utils/dateFormat";

interface Props { teacherId: string }

interface TeacherFull {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_address: string | null;
  bio_short: string | null;
  bio_long: string | null;
  dob: string | null;
  gender: string | null;
  notification_email_opt_in: boolean | null;
  notification_zalo: string | null;
  avatar_url: string | null;
  signature_url: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_account_last_confirmed_at: string | null;
  national_id: string | null;
  national_id_issued_at: string | null;
  national_id_issued_by: string | null;
  tax_code: string | null;
  employment_status: string | null;
  hired_at: string | null;
  terminated_at: string | null;
  internal_employee_id: string | null;
  status: string | null;
  notes: string | null;
}

const FIELDS = [
  "id","full_name","email","phone","current_address","bio_short","bio_long",
  "dob","gender","notification_email_opt_in","notification_zalo","avatar_url",
  "signature_url","bank_account_holder","bank_account_number","bank_name",
  "bank_account_last_confirmed_at","national_id","national_id_issued_at",
  "national_id_issued_by","tax_code","employment_status","hired_at",
  "terminated_at","internal_employee_id","status","notes",
].join(", ");

export default function TabProfile({ teacherId }: Props) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher-full", teacherId],
    queryFn: async (): Promise<TeacherFull | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("teachers")
        .select(FIELDS)
        .eq("id", teacherId)
        .maybeSingle();
      if (error) throw error;
      return (data as TeacherFull) ?? null;
    },
  });

  const [form, setForm] = useState<Partial<TeacherFull>>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)("teachers")
        .update({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          current_address: form.current_address,
          bio_short: form.bio_short,
          bio_long: form.bio_long,
          dob: form.dob || null,
          gender: form.gender || null,
          notification_email_opt_in: form.notification_email_opt_in ?? true,
          notification_zalo: form.notification_zalo,
          avatar_url: form.avatar_url,
          signature_url: form.signature_url,
          bank_account_holder: form.bank_account_holder,
          bank_account_number: form.bank_account_number,
          bank_name: form.bank_name,
          national_id: form.national_id,
          national_id_issued_at: form.national_id_issued_at || null,
          national_id_issued_by: form.national_id_issued_by,
          tax_code: form.tax_code,
          employment_status: form.employment_status || null,
          hired_at: form.hired_at || null,
          terminated_at: form.terminated_at || null,
          internal_employee_id: form.internal_employee_id,
          status: form.status,
          notes: form.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teacherId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã lưu hồ sơ");
      qc.invalidateQueries({ queryKey: ["teacher-full", teacherId] });
      qc.invalidateQueries({ queryKey: ["teacher-kpi-snapshot", teacherId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Lưu thất bại"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải hồ sơ…
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>;

  const set = (k: keyof TeacherFull, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <Section title="Cá nhân">
        <Grid>
          <Field label="Họ và tên">
            <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="SĐT">
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Địa chỉ">
            <Input value={form.current_address ?? ""} onChange={(e) => set("current_address", e.target.value)} />
          </Field>
          <Field label="Ngày sinh">
            <Input type="date" value={form.dob ?? ""} onChange={(e) => set("dob", e.target.value)} />
          </Field>
          <Field label="Giới tính">
            <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Nam</SelectItem>
                <SelectItem value="female">Nữ</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Bio ngắn" full>
            <Textarea rows={2} value={form.bio_short ?? ""} onChange={(e) => set("bio_short", e.target.value)} />
          </Field>
          <Field label="Bio đầy đủ" full>
            <Textarea rows={4} value={form.bio_long ?? ""} onChange={(e) => set("bio_long", e.target.value)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Avatar & chữ ký">
        <Grid>
          <Field label="Avatar URL">
            <Input value={form.avatar_url ?? ""} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Chữ ký URL">
            <Input value={form.signature_url ?? ""} onChange={(e) => set("signature_url", e.target.value)} placeholder="https://…" />
          </Field>
        </Grid>
      </Section>

      <Section title="Thông báo">
        <Grid>
          <Field label="Nhận email công việc">
            <div className="flex items-center gap-2 h-9">
              <Switch
                checked={form.notification_email_opt_in ?? true}
                onCheckedChange={(v) => set("notification_email_opt_in", v)}
              />
              <span className="text-xs text-muted-foreground">
                {form.notification_email_opt_in ?? true ? "Đang nhận" : "Đã tắt"}
              </span>
            </div>
          </Field>
          <Field label="Zalo / WhatsApp">
            <Input value={form.notification_zalo ?? ""} onChange={(e) => set("notification_zalo", e.target.value)} placeholder="VD: 098…" />
          </Field>
        </Grid>
      </Section>

      <Section title="Tài khoản ngân hàng">
        <Grid>
          <Field label="Tên chủ tài khoản">
            <Input value={form.bank_account_holder ?? ""} onChange={(e) => set("bank_account_holder", e.target.value)} />
          </Field>
          <Field label="Số tài khoản">
            <Input value={form.bank_account_number ?? ""} onChange={(e) => set("bank_account_number", e.target.value)} />
          </Field>
          <Field label="Ngân hàng">
            <Input value={form.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value)} />
          </Field>
          <Field label="Lần xác nhận gần nhất">
            <div className="h-9 flex items-center text-sm">
              {form.bank_account_last_confirmed_at
                ? formatDateTimeDDMMYYYY(form.bank_account_last_confirmed_at)
                : <span className="text-muted-foreground">Giáo viên chưa xác nhận</span>}
            </div>
          </Field>
        </Grid>
      </Section>

      <Section title="Pháp lý / thuế">
        <Grid>
          <Field label="CCCD / CMND">
            <Input value={form.national_id ?? ""} onChange={(e) => set("national_id", e.target.value)} />
          </Field>
          <Field label="Ngày cấp">
            <Input type="date" value={form.national_id_issued_at ?? ""} onChange={(e) => set("national_id_issued_at", e.target.value)} />
          </Field>
          <Field label="Nơi cấp">
            <Input value={form.national_id_issued_by ?? ""} onChange={(e) => set("national_id_issued_by", e.target.value)} />
          </Field>
          <Field label="Mã số thuế">
            <Input value={form.tax_code ?? ""} onChange={(e) => set("tax_code", e.target.value)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Nhân sự / hợp đồng">
        <Grid>
          <Field label="Loại công việc">
            <Select value={form.employment_status ?? ""} onValueChange={(v) => set("employment_status", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="contract">Hợp đồng</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mã nhân viên">
            <Input value={form.internal_employee_id ?? ""} onChange={(e) => set("internal_employee_id", e.target.value)} />
          </Field>
          <Field label="Vào làm">
            <Input type="date" value={form.hired_at ?? ""} onChange={(e) => set("hired_at", e.target.value)} />
          </Field>
          <Field label="Nghỉ việc">
            <Input type="date" value={form.terminated_at ?? ""} onChange={(e) => set("terminated_at", e.target.value)} />
          </Field>
          <Field label="Trạng thái GV">
            <Select value={form.status ?? ""} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue placeholder="active" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ghi chú nội bộ" full>
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </Grid>
      </Section>

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

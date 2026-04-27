// Stage P3 admin — TeacherDetailPage "Chứng chỉ" tab.
// Lists teacher_certifications + admin can add/verify/delete.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Award, BadgeCheck, GraduationCap, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@shared/components/ui/dialog";

interface Cert {
  id: string;
  teacher_id: string;
  kind: "degree" | "language_cert" | "training" | "other";
  issuer: string | null;
  name: string;
  score: number | string | null;
  issued_at: string | null;
  expires_at: string | null;
  attachment_url: string | null;
  verified: boolean;
  verified_at: string | null;
  notes: string | null;
}

const KIND_LABEL: Record<Cert["kind"], string> = {
  degree: "Bằng cấp",
  language_cert: "Chứng chỉ ngoại ngữ",
  training: "Đào tạo nội bộ",
  other: "Khác",
};

interface Props { teacherId: string }

export default function TabCertifications({ teacherId }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-certs", teacherId],
    queryFn: async (): Promise<Cert[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("teacher_certifications")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("issued_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data as Cert[]) ?? [];
    },
  });

  const verifyMut = useMutation({
    mutationFn: async (vars: { id: string; verified: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)("teacher_certifications")
        .update({
          verified: vars.verified,
          verified_at: vars.verified ? new Date().toISOString() : null,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái xác thực");
      qc.invalidateQueries({ queryKey: ["teacher-certs", teacherId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Lỗi"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)("teacher_certifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xóa");
      qc.invalidateQueries({ queryKey: ["teacher-certs", teacherId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Lỗi"),
  });

  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold inline-flex items-center gap-2">
          <Award className="h-4 w-4" />
          Chứng chỉ & bằng cấp
        </h3>
        <AddCertDialog
          teacherId={teacherId}
          onAdded={() => qc.invalidateQueries({ queryKey: ["teacher-certs", teacherId] })}
        />
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      )}
      {!isLoading && (data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có chứng chỉ.</p>
      )}

      <div className="space-y-2">
        {(data ?? []).map((c) => (
          <article key={c.id} className="rounded-lg border bg-background p-3 flex items-start gap-3">
            <div className="rounded bg-muted p-2 shrink-0">
              {c.kind === "degree" ? <GraduationCap className="h-4 w-4" /> : <Award className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {KIND_LABEL[c.kind]}
                </span>
                {c.verified && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px]">
                    <BadgeCheck className="h-3 w-3" /> Đã verify
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                {c.issuer && <span>{c.issuer}</span>}
                {c.score !== null && c.score !== undefined && <span>Điểm: {c.score}</span>}
                {c.issued_at && <span>Cấp: {c.issued_at}</span>}
                {c.expires_at && <span>Hết hạn: {c.expires_at}</span>}
              </div>
              {c.notes && <p className="text-xs mt-1">{c.notes}</p>}
              {c.attachment_url && (
                <a href={c.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                  Xem file đính kèm
                </a>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                variant={c.verified ? "outline" : "default"}
                onClick={() => verifyMut.mutate({ id: c.id, verified: !c.verified })}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                {c.verified ? "Bỏ verify" : "Verify"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMut.mutate(c.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AddCertDialog({ teacherId, onAdded }: { teacherId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Cert>>({ kind: "language_cert" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name) {
      toast.error("Cần nhập tên chứng chỉ");
      return;
    }
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)("teacher_certifications").insert({
        teacher_id: teacherId,
        kind: form.kind ?? "language_cert",
        issuer: form.issuer ?? null,
        name: form.name,
        score: form.score ?? null,
        issued_at: form.issued_at || null,
        expires_at: form.expires_at || null,
        attachment_url: form.attachment_url ?? null,
        notes: form.notes ?? null,
        verified: false,
      });
      if (error) throw error;
      toast.success("Đã thêm chứng chỉ");
      setForm({ kind: "language_cert" });
      setOpen(false);
      onAdded();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Thêm
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm chứng chỉ / bằng cấp</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Loại</Label>
              <Select value={form.kind ?? "language_cert"} onValueChange={(v) => setForm({ ...form, kind: v as Cert["kind"] })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Đơn vị cấp</Label>
              <Input className="mt-1.5" value={form.issuer ?? ""} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tên / nội dung *</Label>
            <Input className="mt-1.5" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: IELTS 8.0 Overall" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Điểm</Label>
              <Input className="mt-1.5" type="number" step="0.1" value={(form.score as number | string | undefined) ?? ""} onChange={(e) => setForm({ ...form, score: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Ngày cấp</Label>
              <Input className="mt-1.5" type="date" value={form.issued_at ?? ""} onChange={(e) => setForm({ ...form, issued_at: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Hết hạn</Label>
              <Input className="mt-1.5" type="date" value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">URL file đính kèm</Label>
            <Input className="mt-1.5" value={form.attachment_url ?? ""} onChange={(e) => setForm({ ...form, attachment_url: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <Label className="text-xs">Ghi chú</Label>
            <Textarea className="mt-1.5" rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

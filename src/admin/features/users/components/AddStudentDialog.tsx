import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STUDENT_FIELDS, FIELD_GROUP_LABELS, type StudentFieldGroup } from "@shared/types/student";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Checkbox } from "@shared/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, User, Phone, CreditCard, Users, GraduationCap, StickyNote } from "lucide-react";
import { ScrollArea } from "@shared/components/ui/scroll-area";

const ICON_MAP: Record<StudentFieldGroup, React.ElementType> = {
  basic: User, contact: Phone, personal: CreditCard, guardian: Users,
  academic: GraduationCap, financial: User, admin_notes: StickyNote,
};

const FORM_GROUPS: StudentFieldGroup[] = ["basic", "contact", "personal", "guardian", "academic", "admin_notes"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function AddStudentDialog({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [createAccount, setCreateAccount] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({}); setCreateAccount(false); };

  const handleSubmit = async () => {
    if (!form.full_name?.trim()) { toast.error("Vui lòng nhập họ và tên"); return; }
    setSaving(true);
    try {
      const insertData: Record<string, any> = {
        teachngo_id: null,
        full_name: form.full_name.trim(),
        data_source: "manual",
        is_active: true,
        status: form.status || "active",
      };

      // Map form fields
      STUDENT_FIELDS.forEach(f => {
        if (f.key !== "full_name" && f.key !== "status" && form[f.key]) {
          insertData[f.key] = f.type === "number" ? Number(form[f.key]) : form[f.key];
        }
      });

      const { data: student, error } = await supabase
        .from("synced_students" as any)
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;

      // Optionally create auth account
      if (createAccount && form.email) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await supabase.functions.invoke("create-external-account", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: {
              full_name: form.full_name.trim(),
              email: form.email,
              password: "123456",
              role: "user",
              send_email: false,
            },
          });
          if (res.data?.user_id && (student as any)?.id) {
            await supabase
              .from("synced_students" as any)
              .update({ linked_user_id: res.data.user_id })
              .eq("id", (student as any).id);
          }
          if (res.data?.password) {
            toast.info(`Mật khẩu mặc định: ${res.data.password}`, { duration: 10000 });
          }
        }
      }

      toast.success(`Đã thêm học viên ${form.full_name}`);
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Thêm học viên thủ công
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-5 max-h-[60vh]">
          <div className="space-y-5 py-3">
            {FORM_GROUPS.map(group => {
              const Icon = ICON_MAP[group];
              const fields = STUDENT_FIELDS.filter(f => f.group === group);
              return (
                <div key={group}>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Icon className="h-3.5 w-3.5" />
                    {FIELD_GROUP_LABELS[group]}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map(field => (
                      <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
                        </label>
                        {field.type === "select" ? (
                          <Select value={form[field.key] || ""} onValueChange={v => setForm(p => ({ ...p, [field.key]: v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {field.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            value={form[field.key] || ""}
                            onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                            className="text-sm min-h-[60px]"
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            value={form[field.key] || ""}
                            onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Create account option */}
            <div className="flex items-start gap-2 rounded-lg border p-3 bg-muted/30">
              <Checkbox
                id="create-account"
                checked={createAccount}
                onCheckedChange={(v) => setCreateAccount(!!v)}
                className="mt-0.5"
              />
              <label htmlFor="create-account" className="text-xs cursor-pointer">
                <span className="font-medium">Tạo tài khoản đăng nhập</span>
                <p className="text-muted-foreground mt-0.5">
                  Cần có email. Mật khẩu mặc định: <code className="bg-muted px-1 rounded">123456</code>
                </p>
              </label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-5 pb-5 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => { resetForm(); onOpenChange(false); }}>Hủy</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !form.full_name?.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Thêm học viên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

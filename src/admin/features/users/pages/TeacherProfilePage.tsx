import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { DetailPageLayout } from "@shared/components/layouts";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { toast } from "sonner";

type TeacherRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  subjects: string | null;
  classes: string | null;
  notes: string | null;
  linked_user_id: string | null;
  created_at: string;
};

export default function TeacherProfilePage() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!teacherId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, phone, status, subjects, classes, notes, linked_user_id, created_at")
        .eq("id", teacherId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error("Không tải được hồ sơ giáo viên");
        navigate("/teachers", { replace: true });
        return;
      }

      if (!data) {
        toast.error("Không tìm thấy giáo viên");
        navigate("/teachers", { replace: true });
        return;
      }

      const row = data as TeacherRow;
      setTeacher(row);
      setFullName(row.full_name ?? "");
      setEmail(row.email ?? "");
      setPhone(row.phone ?? "");
      setNotes(row.notes ?? "");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [teacherId, navigate]);

  const handleSave = async () => {
    if (!teacher) return;
    setSaving(true);
    const { error } = await supabase
      .from("teachers")
      .update({ full_name: fullName, email, phone, notes, updated_at: new Date().toISOString() })
      .eq("id", teacher.id);
    setSaving(false);

    if (error) {
      toast.error("Lưu thất bại: " + error.message);
      return;
    }

    toast.success("Đã lưu hồ sơ giáo viên");
    setTeacher({ ...teacher, full_name: fullName, email, phone, notes });
  };

  const initials = useMemo(
    () => (fullName || email || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((s) => s[0]?.toUpperCase())
      .join(""),
    [fullName, email]
  );

  const subjectsList = useMemo(
    () => (teacher?.subjects ?? "").split(/[,;|]/).map((s) => s.trim()).filter(Boolean),
    [teacher?.subjects]
  );

  const classesList = useMemo(
    () => (teacher?.classes ?? "").split(/[,;|]/).map((s) => s.trim()).filter(Boolean),
    [teacher?.classes]
  );

  const roleLabel = roles.includes("super_admin")
    ? "Super Admin"
    : roles.includes("admin")
      ? "Admin"
      : roles.includes("teacher")
        ? "Giảng viên"
        : "Người dùng";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <DetailPageLayout
      title="Hồ sơ giáo viên"
      subtitle="Đồng bộ giao diện và trường dữ liệu với Teacher’s Hub"
      icon={GraduationCap}
      backRoute="/teachers"
      backLabel="Quay lại giáo viên"
      actions={
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu thay đổi
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl bg-card border border-border overflow-hidden shadow-card">
          <div className="h-28 bg-gradient-primary" />
          <div className="px-6 pb-6 -mt-12 flex flex-col md:flex-row md:items-end gap-4">
            <div className="h-24 w-24 rounded-2xl bg-card border-4 border-card shadow-elevated flex items-center justify-center font-display text-3xl font-bold text-primary">
              {initials || "?"}
            </div>
            <div className="flex-1 md:pb-2 min-w-0">
              <h2 className="font-display text-2xl font-bold truncate">{fullName || "Chưa có tên"}</h2>
              <div className="text-sm text-muted-foreground truncate">{email || "Chưa có email"}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <ShieldCheck className="h-3 w-3" />
                  {roleLabel}
                </span>
                {teacher.status && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border/50">
                    Trạng thái: {teacher.status}
                  </span>
                )}
                {subjectsList.map((subject) => (
                  <span key={subject} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border/50">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
            <h3 className="font-display text-lg font-bold">Thông tin cá nhân</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Họ và tên</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />SĐT</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label>Ghi chú</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5"
                  placeholder="Ghi chú nội bộ về giảng viên..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />Tài khoản
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Teacher ID</div>
                <div className="font-mono text-xs break-all">{teacher.id}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Account ID</div>
                <div className="font-mono text-xs break-all">{teacher.linked_user_id || "Chưa liên kết"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Vai trò đăng nhập hiện tại</div>
                <div className="font-semibold">{roles.length > 0 ? roles.join(", ") : "(chưa gán)"}</div>
              </div>
              {teacher.created_at && (
                <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    Hồ sơ tạo: <span className="font-semibold text-foreground">{new Date(teacher.created_at).toLocaleDateString("vi-VN")}</span>
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        {(classesList.length > 0 || subjectsList.length > 0) && (
          <div className="grid md:grid-cols-2 gap-6">
            {classesList.length > 0 && (
              <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
                <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-primary" />Lớp đang dạy
                </h3>
                <div className="flex flex-wrap gap-2">
                  {classesList.map((className) => (
                    <span key={className} className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground border border-border/50">
                      {className}
                    </span>
                  ))}
                </div>
              </section>
            )}
            {subjectsList.length > 0 && (
              <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
                <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />Môn giảng dạy
                </h3>
                <div className="flex flex-wrap gap-2">
                  {subjectsList.map((subject) => (
                    <span key={subject} className="px-3 py-1.5 rounded-lg text-sm bg-primary/10 text-primary border border-primary/20">
                      {subject}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </DetailPageLayout>
  );
}
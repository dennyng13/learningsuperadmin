// Stage P3 admin — TeacherDetailPage (replaces the previous flat profile view).
// Shell with 7 tabs: Tổng quan / Hồ sơ / Năng lực / Chứng chỉ / Lịch rảnh /
// Lương / Lời mời. Each tab is self-contained and lazy-renders its data.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Award, BarChart3, Calendar, GraduationCap, Loader2, Mail, ShieldCheck, Sparkles, User, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { DetailPageLayout } from "@shared/components/layouts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { toast } from "sonner";

import TabOverview from "@admin/features/users/components/teacher-detail/TabOverview";
import TabProfile from "@admin/features/users/components/teacher-detail/TabProfile";
import TabCapabilities from "@admin/features/users/components/teacher-detail/TabCapabilities";
import TabCertifications from "@admin/features/users/components/teacher-detail/TabCertifications";
import TabAvailability from "@admin/features/users/components/teacher-detail/TabAvailability";
import TabIncome from "@admin/features/users/components/teacher-detail/TabIncome";
import TabPerformance from "@admin/features/users/components/teacher-detail/TabPerformance";
import TabInvitations from "@admin/features/users/components/teacher-detail/TabInvitations";

interface TeacherHeader {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  avatar_url: string | null;
  employment_status: string | null;
  linked_user_id: string | null;
  internal_employee_id: string | null;
  created_at: string;
}

const TABS = [
  { value: "overview",      label: "Tổng quan",   icon: Sparkles },
  { value: "profile",       label: "Hồ sơ",       icon: User },
  { value: "capabilities",  label: "Năng lực",    icon: GraduationCap },
  { value: "certifications",label: "Chứng chỉ",   icon: Award },
  { value: "availability",  label: "Lịch rảnh",   icon: Calendar },
  { value: "income",        label: "Lương",       icon: Wallet },
  { value: "performance",   label: "Hiệu quả",    icon: BarChart3 },
  { value: "invitations",   label: "Lời mời",     icon: Mail },
] as const;

export default function TeacherProfilePage() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const [teacher, setTeacher] = useState<TeacherHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]["value"]>("overview");

  useEffect(() => {
    if (!teacherId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("teachers")
        .select("id, full_name, email, status, avatar_url, employment_status, linked_user_id, internal_employee_id, created_at")
        .eq("id", teacherId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Không tìm thấy giáo viên");
        navigate("/teachers", { replace: true });
        return;
      }
      setTeacher(data as TeacherHeader);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [teacherId, navigate]);

  const initials = useMemo(() => {
    const name = teacher?.full_name ?? teacher?.email ?? "?";
    return name.split(/\s+/).filter(Boolean).slice(-2).map((s) => s[0]?.toUpperCase()).join("");
  }, [teacher?.full_name, teacher?.email]);

  const roleLabel = roles.includes("super_admin")
    ? "Super Admin"
    : roles.includes("admin")
      ? "Admin"
      : "Người dùng";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!teacher || !teacherId) return null;

  return (
    <DetailPageLayout
      title="Hồ sơ giáo viên"
      subtitle="Master data + KPI + năng lực + chứng chỉ + lịch rảnh + lương + lời mời"
      icon={GraduationCap}
      backRoute="/teachers"
      backLabel="Quay lại giáo viên"
    >
      <div className="space-y-6">
        {/* Header card */}
        <section className="rounded-2xl bg-card border border-border overflow-hidden shadow-card">
          <div className="h-24 bg-gradient-primary" />
          <div className="px-6 pb-6 -mt-12 flex flex-col md:flex-row md:items-end gap-4">
            <div className="h-24 w-24 rounded-2xl bg-card border-4 border-card shadow-elevated flex items-center justify-center font-display text-3xl font-bold text-primary overflow-hidden">
              {teacher.avatar_url ? (
                <img src={teacher.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials || "?"
              )}
            </div>
            <div className="flex-1 md:pb-2 min-w-0">
              <h2 className="font-display text-2xl font-bold truncate">{teacher.full_name || "Chưa có tên"}</h2>
              <div className="text-sm text-muted-foreground truncate">{teacher.email || "Chưa có email"}</div>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
                  <ShieldCheck className="h-3 w-3" />
                  {roleLabel}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-secondary text-secondary-foreground border border-border/50">
                  Trạng thái: {teacher.status ?? "—"}
                </span>
                {teacher.employment_status && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-secondary text-secondary-foreground border border-border/50">
                    {teacher.employment_status}
                  </span>
                )}
                {teacher.internal_employee_id && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-mono bg-muted text-muted-foreground">
                    #{teacher.internal_employee_id}
                  </span>
                )}
                {!teacher.linked_user_id && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-warning/10 text-warning border border-warning/30">
                    Chưa liên kết tài khoản đăng nhập
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof TABS[number]["value"])}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <TabOverview teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="profile" className="mt-4">
            <TabProfile teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="capabilities" className="mt-4">
            <TabCapabilities teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="certifications" className="mt-4">
            <TabCertifications teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="availability" className="mt-4">
            <TabAvailability teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="income" className="mt-4">
            <TabIncome teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="performance" className="mt-4">
            <TabPerformance teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="invitations" className="mt-4">
            <TabInvitations teacherId={teacherId} />
          </TabsContent>
        </Tabs>
      </div>
    </DetailPageLayout>
  );
}

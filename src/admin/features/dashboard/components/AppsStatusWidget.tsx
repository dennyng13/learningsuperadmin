/**
 * Dashboard widget "Trạng thái 2 app" — tổng quan IELTS Practice & Teacher's Hub.
 * Tất cả query cùng 1 Supabase DB nên không cần gọi sang app khác.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, BookOpenCheck, ExternalLink, Users, School, Activity, CalendarClock, FileText, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { cn } from "@shared/lib/utils";

const IELTS_URL = "https://ielts.learningplus.vn";
const TEACHER_URL = "https://teacher.learningplus.vn";

interface AppMetric {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint?: string;
}

function useAppsStatus() {
  return useQuery({
    queryKey: ["dashboard-apps-status"],
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date();
      const since24h = subDays(now, 1).toISOString();
      const since7d = subDays(now, 7).toISOString();
      const todayStr = format(now, "yyyy-MM-dd");

      const [
        // ── IELTS Practice ──
        { count: activeStudents },
        { count: testsRun24h },
        { count: practicesRun24h },
        { count: testsRun7d },
        // ── Teacher's Hub ──
        { count: activeTeachers },
        { count: activeClasses },
        { data: todayEntries },
      ] = await Promise.all([
        // active students = có linked_user_id (đã đăng nhập được app IELTS Practice)
        supabase.from("teachngo_students")
          .select("*", { count: "exact", head: true })
          .not("linked_user_id", "is", null),
        supabase.from("test_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since24h),
        supabase.from("practice_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since24h),
        supabase.from("test_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since7d),
        supabase.from("teachers")
          .select("*", { count: "exact", head: true }),
        supabase.from("teachngo_classes")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("study_plan_entries")
          .select("id")
          .eq("entry_date", todayStr),
      ]);

      return {
        ielts: {
          activeStudents: activeStudents ?? 0,
          testsRun24h: testsRun24h ?? 0,
          practicesRun24h: practicesRun24h ?? 0,
          testsRun7d: testsRun7d ?? 0,
        },
        teacher: {
          activeTeachers: activeTeachers ?? 0,
          activeClasses: activeClasses ?? 0,
          todaySessions: (todayEntries || []).length,
        },
      };
    },
  });
}

export default function AppsStatusWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useAppsStatus();

  const ielts = data?.ielts;
  const teacher = data?.teacher;

  const ieltsMetrics: AppMetric[] = [
    { icon: Users, label: "Học viên kết nối", value: ielts?.activeStudents ?? 0 },
    { icon: Activity, label: "Đang làm bài (24h)", value: (ielts?.testsRun24h ?? 0) + (ielts?.practicesRun24h ?? 0), hint: "test + practice" },
    { icon: FileText, label: "Bài thi 7 ngày", value: ielts?.testsRun7d ?? 0 },
  ];

  const teacherMetrics: AppMetric[] = [
    { icon: GraduationCap, label: "Giáo viên", value: teacher?.activeTeachers ?? 0 },
    { icon: School, label: "Lớp đang hoạt động", value: teacher?.activeClasses ?? 0 },
    { icon: CalendarClock, label: "Buổi học hôm nay", value: teacher?.todaySessions ?? 0 },
  ];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Trạng thái 2 app
        </h2>
        <span className="text-[11px] text-muted-foreground">Chung database · realtime ~1 phút</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AppCard
          title="IELTS Practice"
          subtitle="Ứng dụng học viên"
          icon={BookOpenCheck}
          accent="text-blue-600"
          bg="bg-blue-500/10"
          href={IELTS_URL}
          onManage={() => navigate("/users")}
          manageLabel="Quản lý học viên"
          metrics={ieltsMetrics}
          loading={isLoading}
        />
        <AppCard
          title="Teacher's Hub"
          subtitle="Ứng dụng giáo viên"
          icon={GraduationCap}
          accent="text-emerald-600"
          bg="bg-emerald-500/10"
          href={TEACHER_URL}
          onManage={() => navigate("/classes")}
          manageLabel="Quản lý lớp"
          metrics={teacherMetrics}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

function AppCard({
  title, subtitle, icon: Icon, accent, bg, href, onManage, manageLabel, metrics, loading,
}: {
  title: string;
  subtitle: string;
  icon: typeof Users;
  accent: string;
  bg: string;
  href: string;
  onManage: () => void;
  manageLabel: string;
  metrics: AppMetric[];
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background/50 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", bg)}>
            <Icon className={cn("h-5 w-5", accent)} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm truncate">{title}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          title={`Mở ${title}`}
        >
          Mở app <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-md bg-muted/40 p-2.5 flex flex-col gap-0.5">
            <m.icon className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
            <span className="text-lg font-bold font-display leading-none">
              {loading ? <span className="inline-block h-5 w-8 bg-muted rounded animate-pulse" /> : m.value}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">{m.label}</span>
            {m.hint && <span className="text-[9px] text-muted-foreground/70">{m.hint}</span>}
          </div>
        ))}
      </div>

      <button
        onClick={onManage}
        className="text-xs text-primary hover:underline text-left mt-auto"
      >
        → {manageLabel}
      </button>
    </div>
  );
}

/**
 * Lifetime Overview — Single source of truth via get_student_lifetime RPC.
 * Shows: target band, overall band, skill bands, score history, activity stats,
 * weak/strong question types, attention flags, forecast vs target exam date.
 */
import { useStudentLifetime } from "@shared/hooks/usePerformance";
import { ATTENTION_FLAG_LABELS, getForecast, getPerformanceLabel, bandToScore } from "@shared/utils/performance";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import ScoreRing from "@shared/components/ui/score-ring";
import { Loader2, Target, Calendar, AlertTriangle, TrendingUp, Activity, Award, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@shared/lib/utils";

export default function LifetimeOverview({ userId }: { userId: string }) {
  const { data, isLoading, error } = useStudentLifetime(userId);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (error || !data) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Chưa có dữ liệu lịch sử học tập.</div>;
  }

  const lifetimeScore = data.lifetime_score;
  const perf = getPerformanceLabel(lifetimeScore);
  const forecast = getForecast({
    currentBand: data.overall_band,
    targetBand: data.target_band,
    examDate: data.target_exam_date,
    recentTestCount: data.score_history.length,
  });

  const skills = ["reading", "listening", "writing", "speaking"] as const;
  const skillLabels: Record<string, string> = {
    reading: "Reading", listening: "Listening", writing: "Writing", speaking: "Speaking",
  };

  // Build chart data from score history (chronological)
  const chartData = [...data.score_history].reverse().map((h) => ({
    date: new Date(h.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    score: Number(h.score),
    skill: h.section_type,
    name: h.assessment_name,
  }));

  return (
    <div className="space-y-4">
      {/* Top: Target & Forecast */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-3">
              <ScoreRing score={data.overall_band} size={72} strokeWidth={6} />
              <div>
                <p className="text-xs text-muted-foreground">Band IELTS hiện tại (TB 3 bài gần nhất)</p>
                <p className="text-2xl font-extrabold">{data.overall_band ?? "—"}</p>
                <Badge variant="outline" className={cn("mt-1 text-[10px]", perf.color, perf.bg, "border-0")}>
                  {perf.label}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mục tiêu</p>
                <p className="text-2xl font-extrabold">{data.target_band ?? "Chưa đặt"}</p>
                {data.target_exam_date && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(data.target_exam_date).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                forecast.status === "on_track" ? "bg-emerald-100 text-emerald-600" :
                forecast.status === "needs_acceleration" ? "bg-amber-100 text-amber-600" :
                forecast.status === "unlikely" ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              )}>
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dự báo tiến độ</p>
                <p className="text-base font-bold leading-tight">{forecast.label}</p>
                {forecast.daysToExam != null && forecast.daysToExam > 0 && (
                  <p className="text-[11px] text-muted-foreground">Còn {forecast.daysToExam} ngày · cách mục tiêu {forecast.bandGap?.toFixed(1) ?? 0} band</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attention Flags */}
      {data.attention_flags.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-destructive mb-2">Cần chú ý</p>
                <div className="flex flex-wrap gap-2">
                  {data.attention_flags.map((flag) => {
                    const f = ATTENTION_FLAG_LABELS[flag];
                    return (
                      <Badge key={flag} variant="outline" className="bg-card border-destructive/40 text-destructive text-[11px]" title={f.description}>
                        {f.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Bands */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {skills.map((skill) => {
          const band = data.band_per_skill?.[skill] ?? null;
          return (
            <Card key={skill}>
              <CardContent className="p-4 flex items-center gap-3">
                <ScoreRing score={band} size={48} strokeWidth={4} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{skillLabels[skill]}</p>
                  <p className="text-lg font-extrabold">{band ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Score History Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Lịch sử điểm thi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity & Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Hoạt động học tập
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Tổng thời gian</span>
              <span className="font-bold">{Math.round(data.activity_stats.total_minutes / 60)}h {data.activity_stats.total_minutes % 60}p</span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t">
              {skills.map((skill) => (
                <div key={skill} className="text-center">
                  <p className="text-lg font-bold">{data.activity_stats[skill] ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{skill.slice(0, 4)}</p>
                </div>
              ))}
            </div>
            {data.activity_stats.last_activity_date && (
              <p className="text-[11px] text-muted-foreground pt-2 border-t">
                Hoạt động gần nhất: {new Date(data.activity_stats.last_activity_date).toLocaleDateString("vi-VN")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Điểm danh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold">
                {data.attendance_summary.rate != null ? `${Math.round(data.attendance_summary.rate * 100)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                ({data.attendance_summary.attended}/{data.attendance_summary.total_past} buổi)
              </p>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(data.attendance_summary.rate ?? 0) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill insights — weak & strong question types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-destructive">Dạng câu hay sai</CardTitle>
          </CardHeader>
          <CardContent>
            {data.skill_insights.weak_types.length > 0 ? (
              <div className="space-y-2">
                {data.skill_insights.weak_types.slice(0, 5).map((w) => (
                  <div key={w.type} className="flex justify-between text-sm">
                    <span className="truncate">{w.type}</span>
                    <span className="font-bold text-destructive">{Math.round(w.accuracy * 100)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa đủ dữ liệu (bài tập 14 ngày).</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-emerald-600">Dạng câu làm tốt</CardTitle>
          </CardHeader>
          <CardContent>
            {data.skill_insights.strong_types.length > 0 ? (
              <div className="space-y-2">
                {data.skill_insights.strong_types.slice(0, 5).map((s) => (
                  <div key={s.type} className="flex justify-between text-sm">
                    <span className="truncate">{s.type}</span>
                    <span className="font-bold text-emerald-600">{Math.round(s.accuracy * 100)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa đủ dữ liệu.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {lifetimeScore != null && (
        <p className="text-[11px] text-muted-foreground text-center">
          Điểm quy đổi 0–100: <span className="font-bold">{lifetimeScore}</span> ·
          Cập nhật từ 3 bài thi gần nhất + bài tập 14 ngày + hoạt động 30 ngày
        </p>
      )}
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, TrendingDown, AlertCircle, Layers, PieChart as PieIcon,
  ChevronRight, ChevronDown, Flame, Ghost,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Badge } from "@shared/components/ui/badge";
import { ALL_TYPE_LABELS_EN as ALL_QT_LABELS } from "@shared/utils/questionTypes";
import WidgetRetryState from "./WidgetRetryState";
import WidgetRefreshButton from "./WidgetRefreshButton";
import {
  type AnalyticsRange,
  DEFAULT_RANGE,
  AnalyticsRangeBadge,
} from "@shared/components/dashboard/analyticsRange";

const ALL_QUESTION_TYPES = Object.keys(ALL_QT_LABELS);

const SKILL_COLORS: Record<string, string> = {
  reading: "hsl(142 71% 45%)",
  listening: "hsl(217 91% 60%)",
  writing: "hsl(25 95% 53%)",
  speaking: "hsl(262 83% 58%)",
};

const PIE_COLORS = [
  "hsl(142 71% 45%)", "hsl(217 91% 60%)",
  "hsl(25 95% 53%)", "hsl(262 83% 58%)",
];

interface PopularExercise {
  exercise_id: string;
  title: string;
  skill: string;
  attempts: number;
}

interface UnusedExercise {
  id: string;
  title: string;
  skill: string;
  attempts: number;
}

export default function ContentAnalytics({
  range = DEFAULT_RANGE,
}: { range?: AnalyticsRange } = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [popular, setPopular] = useState<PopularExercise[]>([]);
  const [unused, setUnused] = useState<UnusedExercise[]>([]);
  const [skillCoverage, setSkillCoverage] = useState<{ name: string; value: number }[]>([]);
  const [missingTypes, setMissingTypes] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sinceIso = range.from.toISOString();
  const untilIso = range.to.toISOString();

  const load = async () => {
    setLoadError(null);
    const { data: prData, error: prError } = await supabase
      .from("practice_results")
      .select("exercise_id, exercise_title, skill")
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso)
      .order("created_at", { ascending: false })
      .limit(1000) as any;

    if (prError) throw prError;

    const attemptMap: Record<string, { title: string; skill: string; count: number }> = {};
    for (const r of prData || []) {
      if (!attemptMap[r.exercise_id]) {
        attemptMap[r.exercise_id] = { title: r.exercise_title, skill: r.skill, count: 0 };
      }
      attemptMap[r.exercise_id].count++;
    }

    const sorted = Object.entries(attemptMap)
      .map(([id, v]) => ({ exercise_id: id, title: v.title, skill: v.skill, attempts: v.count }))
      .sort((a, b) => b.attempts - a.attempts);

    setPopular(sorted.slice(0, 10));

    const { data: allExercises, error: exercisesError } = await supabase
      .from("practice_exercises")
      .select("id, title, skill, question_type, question_types")
      .eq("status", "published") as any;

    if (exercisesError) throw exercisesError;

    const unusedList = (allExercises || [])
      .map((e: any) => ({
        id: e.id,
        title: e.title,
        skill: e.skill,
        attempts: attemptMap[e.id]?.count || 0,
      }))
      .filter((e: any) => e.attempts < 3)
      .sort((a: any, b: any) => a.attempts - b.attempts)
      .slice(0, 10);
    setUnused(unusedList);

    const skillCount: Record<string, number> = { reading: 0, listening: 0, writing: 0, speaking: 0 };
    for (const e of allExercises || []) {
      if (skillCount[e.skill] !== undefined) skillCount[e.skill]++;
    }
    setSkillCoverage(
      Object.entries(skillCount)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    );

    const existingTypes = new Set<string>();
    for (const e of allExercises || []) {
      if (e.question_type) existingTypes.add(e.question_type);
      if (Array.isArray(e.question_types)) {
        for (const qt of e.question_types) existingTypes.add(qt);
      }
    }
    setMissingTypes(ALL_QUESTION_TYPES.filter(qt => !existingTypes.has(qt)));
    setLoaded(true);
  };

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    load().catch((error) => {
      console.error("[ContentAnalytics] Failed to load", error);
      setLoadError(error instanceof Error ? error.message : "Không tải được phân tích nội dung.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sinceIso, untilIso]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between rounded-pop-lg border-[2.5px] border-lp-ink bg-white shadow-pop-sm px-4 py-3 transition-all duration-150 ease-bounce hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop group">
          <span className="text-sm font-display font-extrabold text-lp-body uppercase tracking-[0.12em] flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Phân tích nội dung
            <AnalyticsRangeBadge range={range} className="ml-1 normal-case tracking-normal" />
          </span>
          <span className="flex items-center gap-1">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setLoaded(false);
                load().catch((err) => setLoadError(err instanceof Error ? err.message : "Không tải được phân tích nội dung."));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault(); e.stopPropagation();
                  setLoaded(false);
                  load().catch((err) => setLoadError(err instanceof Error ? err.message : "Không tải được phân tích nội dung."));
                }
              }}
              className="inline-flex"
            >
              <WidgetRefreshButton
                onClick={() => {
                  setLoaded(false);
                  load().catch((err) => setLoadError(err instanceof Error ? err.message : "Không tải được phân tích nội dung."));
                }}
                refreshing={!loaded && open}
                title="Tải lại phân tích nội dung"
              />
            </span>
            <ChevronDown className={cn("h-4 w-4 text-lp-ink transition-transform", open && "rotate-180")} />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-4">
          {loadError ? (
            <WidgetRetryState
              title="Chưa tải được phân tích nội dung"
              message={loadError}
              onRetry={() => {
                setLoaded(false);
                load().catch((error) => {
                  console.error("[ContentAnalytics] Retry failed", error);
                  setLoadError(error instanceof Error ? error.message : "Không tải được phân tích nội dung.");
                });
              }}
              compact
            />
          ) : !loaded ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Đang tải...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Popular exercises */}
                <InsightCard
                  icon={Flame}
                  title="Bài tập phổ biến nhất"
                  iconColor="text-orange-500"
                >
                  {popular.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
                  ) : (
                    <div className="space-y-1.5">
                      {popular.map((p, i) => (
                        <button
                          key={p.exercise_id}
                          className="w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-muted/50 text-left"
                          onClick={() => navigate(`/practice/${p.exercise_id}/stats`)}
                        >
                          <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}</span>
                          <span className="flex-1 truncate">{p.title}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {p.skill === "reading" ? "R" : p.skill === "listening" ? "L" : p.skill === "writing" ? "W" : "S"}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground shrink-0">{p.attempts} lượt</span>
                        </button>
                      ))}
                    </div>
                  )}
                </InsightCard>

                {/* Unused exercises */}
                <InsightCard
                  icon={Ghost}
                  title="Bài tập ít được làm"
                  iconColor="text-muted-foreground"
                  action={{ label: "Xem tất cả", onClick: () => navigate("/tests?type=exercise") }}
                >
                  {unused.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tất cả bài tập đều có {">"}3 lượt làm </p>
                  ) : (
                    <div className="space-y-1.5">
                      {unused.map(u => (
                        <button
                          key={u.id}
                          className="w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-muted/50 text-left"
                          onClick={() => navigate(`/practice/${u.id}`)}
                        >
                          <span className="flex-1 truncate">{u.title}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {u.skill === "reading" ? "R" : u.skill === "listening" ? "L" : u.skill === "writing" ? "W" : "S"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {u.attempts === 0 ? "0 lượt" : `${u.attempts} lượt`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </InsightCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Missing question types */}
                <InsightCard
                  icon={AlertCircle}
                  title="Question types thiếu content"
                  iconColor="text-amber-500"
                  action={missingTypes.length > 0 ? { label: "Tạo bài tập", onClick: () => navigate("/tests?type=exercise") } : undefined}
                >
                  {missingTypes.length === 0 ? (
                    <p className="text-sm text-emerald-600">Đã có bài tập cho tất cả question types </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {missingTypes.map(qt => (
                        <Badge key={qt} variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">
                          {ALL_QT_LABELS[qt] || qt.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </InsightCard>

                {/* Skill coverage pie */}
                <InsightCard
                  icon={PieIcon}
                  title="Skill coverage"
                  iconColor="text-primary"
                >
                  {skillCoverage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có bài tập</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie
                            data={skillCoverage}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            paddingAngle={2}
                          >
                            {skillCoverage.map((entry) => (
                              <Cell key={entry.name} fill={SKILL_COLORS[entry.name] || "hsl(var(--muted))"} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                            formatter={(value: number, name: string) => [`${value} bài tập`, name.charAt(0).toUpperCase() + name.slice(1)]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5">
                        {skillCoverage.map(s => {
                          const total = skillCoverage.reduce((a, b) => a + b.value, 0);
                          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                          return (
                            <div key={s.name} className="flex items-center gap-2 text-sm">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SKILL_COLORS[s.name] }} />
                              <span className="capitalize">{s.name}</span>
                              <span className="text-muted-foreground text-xs">{s.value} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </InsightCard>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function InsightCard({
  icon: Icon,
  title,
  iconColor,
  action,
  children,
}: {
  icon: any;
  title: string;
  iconColor: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-pop-lg border-[2.5px] border-lp-ink bg-white shadow-pop-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-display font-extrabold uppercase tracking-[0.1em] text-lp-body flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          {title}
        </h3>
        {action && (
          <button
            onClick={action.onClick}
            className="text-[11px] font-display font-bold text-lp-teal hover:text-lp-teal-deep hover:underline flex items-center gap-0.5"
          >
            {action.label} <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

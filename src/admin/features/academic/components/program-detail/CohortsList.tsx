/**
 * CohortsList — Danh sách các cohort lịch sử
 * Match mockup pages-program-detail.jsx "Cohorts tab"
 *
 * Features:
 * - Cohort cards với completion rate
 * - Status badges (graduated/active)
 * - Avg lift display
 */
import { Card } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";

interface Cohort {
  name: string;
  enrolled: number;
  completed: number | string;
  avgLift: number | string;
  status: "graduated" | "active";
}

interface CohortsListProps {
  cohorts: Cohort[];
}

export function CohortsList({ cohorts }: CohortsListProps) {
  const totalEnrolled = cohorts.reduce((a, c) => a + c.enrolled, 0);
  const completedCohorts = cohorts.filter((c) => c.status === "graduated");
  const avgCompletion =
    completedCohorts.length > 0
      ? Math.round(
          completedCohorts.reduce(
            (a, c) => a + ((typeof c.completed === "number" ? c.completed : 0) / c.enrolled),
            0
          ) / completedCohorts.length * 100
        )
      : 0;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Cohorts list */}
      <Card className="p-5 md:p-6 border-[2.5px] border-lp-ink shadow-pop bg-white">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-lp-ink text-white text-[10px] font-bold uppercase">
            Cohorts
          </span>
          <h2 className="font-display text-lg md:text-xl font-bold">
            Lịch sử <span className="text-rose-600">{cohorts.length} cohorts</span>
          </h2>
        </div>

        <div className="space-y-3">
          {cohorts.map((c) => {
            const isDone = c.status === "graduated";
            const fill =
              isDone && typeof c.completed === "number"
                ? Math.round((c.completed / c.enrolled) * 100)
                : 0;

            return (
              <div
                key={c.name}
                className={cn(
                  "rounded-xl border-[2px] border-lp-ink p-4 shadow-pop-xs",
                  isDone ? "bg-white" : "bg-rose-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-display text-base font-bold leading-tight">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-lp-body font-semibold">
                      {c.enrolled} HV enrolled ·{" "}
                      {isDone
                        ? `${c.completed} graduated`
                        : "đang học"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDone && typeof c.avgLift === "number" && (
                      <span className="font-display text-lg font-bold text-teal-600">
                        +{c.avgLift}
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                        isDone
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                          : "bg-rose-100 text-rose-700 border-rose-300"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {isDone ? "graduated" : "active"}
                    </span>
                  </div>
                </div>

                {/* Completion bar for graduated */}
                {isDone && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden border border-lp-ink/20">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold">{fill}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Summary card */}
      <Card className="p-5 md:p-6 border-[2.5px] border-lp-ink shadow-pop bg-white h-fit">
        <h3 className="font-display text-base font-bold mb-4">Tổng quan Cohorts</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dashed border-lp-ink/20">
            <span className="text-sm text-lp-body">Tổng HV đã enrolled</span>
            <span className="font-display text-xl font-bold">{totalEnrolled}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-dashed border-lp-ink/20">
            <span className="text-sm text-lp-body">Cohorts đã tốt nghiệp</span>
            <span className="font-display text-xl font-bold text-teal-600">
              {completedCohorts.length}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-dashed border-lp-ink/20">
            <span className="text-sm text-lp-body">Tỷ lệ hoàn thành TB</span>
            <span className="font-display text-xl font-bold">{avgCompletion}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-lp-body">Band lift trung bình</span>
            <span className="font-display text-xl font-bold text-rose-600">
              +
              {completedCohorts.length > 0 && typeof completedCohorts[0].avgLift === "number"
                ? (
                    completedCohorts.reduce((a, c) => a + (typeof c.avgLift === "number" ? c.avgLift : 0), 0) /
                    completedCohorts.length
                  ).toFixed(1)
                : "0.0"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

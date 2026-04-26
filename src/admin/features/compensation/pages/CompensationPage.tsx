import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Wallet, CalendarClock, Banknote } from "lucide-react";
import TimesheetPeriodsPage from "@admin/features/timesheet/pages/TimesheetPeriodsPage";
import PayrollListPage from "@admin/features/payroll/pages/PayrollListPage";

type TabKey = "timesheet" | "payroll";
const VALID: TabKey[] = ["timesheet", "payroll"];

/**
 * Module gộp Bảng công + Bảng lương dưới 1 entry "Lương / Thưởng".
 *
 * Tab state đồng bộ với URL (?tab=timesheet|payroll) để có thể bookmark /
 * deep-link và back-button hoạt động đúng. Detail routes
 * (/timesheet/:id, /payroll/batches/:id, /payroll/payslips/:id) giữ nguyên.
 */
export default function CompensationPage() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as TabKey) || "timesheet";
  const [tab, setTab] = useState<TabKey>(VALID.includes(initial) ? initial : "timesheet");

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (next.get("tab") !== tab) {
      next.set("tab", tab);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Hành chính
          </p>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Lương / Thưởng
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Quản lý bảng chấm công và bảng lương / thưởng giáo viên
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger
            value="timesheet"
            className="gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <CalendarClock className="h-4 w-4" /> Bảng công
          </TabsTrigger>
          <TabsTrigger
            value="payroll"
            className="gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Banknote className="h-4 w-4" /> Bảng lương
          </TabsTrigger>
        </TabsList>

        {/* Embed các page gốc — chúng đã có ListPageLayout/padding riêng,
            nên bọc trong wrapper âm margin để khớp khung Compensation. */}
        <TabsContent value="timesheet" className="mt-4 -mx-4 md:-mx-6">
          <TimesheetPeriodsPage />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4 -mx-4 md:-mx-6">
          <PayrollListPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
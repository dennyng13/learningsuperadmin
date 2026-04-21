import { lazy, Suspense, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, GraduationCap, Receipt, TrendingUp, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";

const TeachersTab = lazy(() => import("@admin/features/users/components/TeachersTab"));
const TeacherIncomeTab = lazy(() => import("@admin/features/users/components/TeacherIncomeTab"));
const AvailabilityDraftsTab = lazy(async () => {
  const mod = await import("@admin/features/schedule/pages/AdminSchedulePage");
  return { default: mod.AvailabilityDraftsTab };
});
const TeacherPerformanceContent = lazy(async () => {
  const mod = await import("@admin/features/performance/pages/TeacherPerformancePage");
  return { default: mod.TeacherPerformanceContent };
});

export default function TeacherManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(() => {
    if (location.pathname.startsWith("/teachers/availability")) return "availability";
    if (location.pathname.startsWith("/teachers/performance")) return "performance";
    if (location.pathname.startsWith("/teachers/income")) return "income";
    return "directory";
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      directory: "/teachers",
      availability: "/teachers/availability",
      performance: "/teachers/performance",
      income: "/teachers/income",
    };
    navigate(routeMap[value] || "/teachers");
  };

  const renderTabContent = (content: React.ReactNode) => (
    <Suspense fallback={<TabSkeleton />}>{content}</Suspense>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Quản lý giáo viên
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gom hồ sơ, lịch rảnh, hiệu suất và tính lương vào một module giáo viên thống nhất
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1 w-max md:w-auto">
            <TabsTrigger value="directory" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />Danh sách
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
              <Clock3 className="h-3.5 w-3.5 md:h-4 md:w-4" />Lịch rảnh
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />Hiệu suất
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
              <Receipt className="h-3.5 w-3.5 md:h-4 md:w-4" />Tính lương
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="directory" className="mt-0">
          {renderTabContent(<TeachersTab />)}
        </TabsContent>
        <TabsContent value="availability" className="mt-0">
          {renderTabContent(<AvailabilityDraftsTab />)}
        </TabsContent>
        <TabsContent value="performance" className="mt-0">
          {renderTabContent(<TeacherPerformanceContent />)}
        </TabsContent>
        <TabsContent value="income" className="mt-0">
          {renderTabContent(<TeacherIncomeTab />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
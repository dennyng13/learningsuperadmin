import { GraduationCap } from "lucide-react";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import TeachersTab from "@admin/features/users/components/TeachersTab";

export default function TeacherManagementPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Quản lý giáo viên
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý hồ sơ, liên kết tài khoản và điều phối lớp phụ trách của giáo viên
        </p>
      </div>

      <TabSkeleton>
        <TeachersTab />
      </TabSkeleton>
    </div>
  );
}
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import { Users, Shield } from "lucide-react";
import TeachngoTab from "@admin/features/users/components/TeachngoTab";

export default function UserManagementPage() {
  const [tab, setTab] = useState("students");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold">Quản lý người dùng</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý tài khoản học viên, quản trị viên và giáo viên
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1 w-max md:w-auto">
            <TabsTrigger value="students" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Học viên
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Shield className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Quản trị viên
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="students" className="mt-6">
          <TabSkeleton><TeachngoTab roleCategory="students" /></TabSkeleton>
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <TabSkeleton><TeachngoTab roleCategory="admins" /></TabSkeleton>
        </TabsContent>
      </Tabs>
    </div>
  );
}

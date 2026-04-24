import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Settings, Database, HardDrive, Globe, Bell, Mail, BookTemplate, Sparkles, BookOpen, ShieldCheck, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import AdminBackupTab from "@admin/features/settings/components/AdminBackupTab";
import AdminStorageTab from "@admin/features/settings/components/AdminStorageTab";
import AdminGeneralTab from "@admin/features/settings/components/AdminGeneralTab";
import AdminNotificationsTab from "@admin/features/settings/components/AdminNotificationsTab";
import AdminEmailTab from "@admin/features/settings/components/AdminEmailTab";
import AdminFeedbackTemplatesTab from "@admin/features/settings/components/AdminFeedbackTemplatesTab";
import AdminAIGradingTab from "@admin/features/settings/components/AdminAIGradingTab";
import AdminBandDescriptorsTab from "@admin/features/settings/components/AdminBandDescriptorsTab";
import AdminFieldAccessTab from "@admin/features/settings/components/AdminFieldAccessTab";
import AdminSyncTypesTab from "@admin/features/settings/components/AdminSyncTypesTab";
import { useAuth } from "@shared/hooks/useAuth";

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("email");
  const { isAdmin } = useAuth();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-6">
      <nav className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Cài đặt</span>
      </nav>

      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
          <Settings className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Cài đặt hệ thống
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Quản lý dữ liệu, cấu hình chung, email và thông báo
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1 w-max md:w-auto md:flex-wrap max-w-3xl">
            <TabsTrigger value="email" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Database className="h-3.5 w-3.5 md:h-4 md:w-4" /> Sao lưu
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <HardDrive className="h-3.5 w-3.5 md:h-4 md:w-4" /> Storage
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Globe className="h-3.5 w-3.5 md:h-4 md:w-4" /> Cấu hình
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Bell className="h-3.5 w-3.5 md:h-4 md:w-4" /> Thông báo
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <BookTemplate className="h-3.5 w-3.5 md:h-4 md:w-4" /> Mẫu nhận xét
            </TabsTrigger>
            <TabsTrigger value="ai-grading" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" /> AI Chấm bài
            </TabsTrigger>
            <TabsTrigger value="band-descriptors" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" /> Band Descriptor
            </TabsTrigger>
            <TabsTrigger value="field-access" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <ShieldCheck className="h-3.5 w-3.5 md:h-4 md:w-4" /> Phân quyền HV
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="sync-types" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4" /> Sync Types
              </TabsTrigger>
            )}
            </TabsList>
        </div>

        <TabsContent value="email" className="mt-6">
          <TabSkeleton><AdminEmailTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="backup" className="mt-6">
          <TabSkeleton><AdminBackupTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="storage" className="mt-6">
          <TabSkeleton><AdminStorageTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="general" className="mt-6">
          <TabSkeleton><AdminGeneralTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <TabSkeleton><AdminNotificationsTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TabSkeleton><AdminFeedbackTemplatesTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="ai-grading" className="mt-6">
          <TabSkeleton><AdminAIGradingTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="band-descriptors" className="mt-6">
          <TabSkeleton><AdminBandDescriptorsTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="field-access" className="mt-6">
          <TabSkeleton><AdminFieldAccessTab /></TabSkeleton>
        </TabsContent>
        {isAdmin && (
          <TabsContent value="sync-types" className="mt-6">
            <TabSkeleton><AdminSyncTypesTab /></TabSkeleton>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

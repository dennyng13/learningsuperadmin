import { useState, useMemo, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight, Settings, Database, HardDrive, Globe, Bell, Mail,
  BookTemplate, Sparkles, BookOpen, ShieldCheck, RefreshCw,
  Image as ImageIcon, Search, Menu, X,
} from "lucide-react";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import { Input } from "@shared/components/ui/input";
import { cn } from "@shared/lib/utils";
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
import AdminBrandAssetsTab from "@admin/features/settings/components/AdminBrandAssetsTab";
import { useAuth } from "@shared/hooks/useAuth";

type SettingsItem = {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType;
  superAdminOnly?: boolean;
  keywords?: string;
};

type SettingsGroup = {
  id: string;
  label: string;
  items: SettingsItem[];
};

const GROUPS: SettingsGroup[] = [
  {
    id: "organization",
    label: "Tổ chức",
    items: [
      { id: "general", label: "Cấu hình chung", description: "Tên tổ chức, thông tin pháp nhân, mặc định hệ thống", icon: Globe, component: AdminGeneralTab, keywords: "name org party" },
      { id: "brand-assets", label: "Brand Assets", description: "Logo, favicon đồng bộ 3 portal", icon: ImageIcon, component: AdminBrandAssetsTab, keywords: "logo favicon brand" },
      { id: "email", label: "Email", description: "SMTP, mẫu email giao dịch", icon: Mail, component: AdminEmailTab, keywords: "smtp mail" },
      { id: "notifications", label: "Thông báo", description: "Push, in-app và email notification rules", icon: Bell, component: AdminNotificationsTab, keywords: "push alert" },
    ],
  },
  {
    id: "academic",
    label: "Học thuật",
    items: [
      { id: "ai-grading", label: "AI Chấm bài", description: "Cấu hình mô hình AI chấm Writing / Speaking", icon: Sparkles, component: AdminAIGradingTab, keywords: "ai grading writing speaking" },
      { id: "band-descriptors", label: "Band Descriptor", description: "Tiêu chí band IELTS dùng cho chấm điểm", icon: BookOpen, component: AdminBandDescriptorsTab, keywords: "ielts band rubric" },
      { id: "templates", label: "Mẫu nhận xét", description: "Template nhận xét nhanh cho giáo viên", icon: BookTemplate, component: AdminFeedbackTemplatesTab, keywords: "feedback template" },
      { id: "field-access", label: "Phân quyền học viên", description: "Trường nào học viên được xem / chỉnh sửa", icon: ShieldCheck, component: AdminFieldAccessTab, keywords: "permission student field" },
    ],
  },
  {
    id: "operations",
    label: "Vận hành",
    items: [
      { id: "backup", label: "Sao lưu", description: "Backup database & exports", icon: Database, component: AdminBackupTab, keywords: "backup export" },
      { id: "storage", label: "Storage", description: "Quản lý dung lượng file & buckets", icon: HardDrive, component: AdminStorageTab, keywords: "storage bucket file" },
    ],
  },
  {
    id: "system",
    label: "Hệ thống",
    items: [
      { id: "sync-types", label: "Sync Types", description: "Cấu hình đồng bộ schema giữa các portal", icon: RefreshCw, component: AdminSyncTypesTab, superAdminOnly: true, keywords: "sync schema types" },
    ],
  },
];

export default function AdminSettingsPage() {
  const { isAdmin } = useAuth();
  const [activeId, setActiveId] = useState("general");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (it.superAdminOnly && !isAdmin) return false;
          if (!q) return true;
          return (
            it.label.toLowerCase().includes(q) ||
            it.description.toLowerCase().includes(q) ||
            (it.keywords ?? "").toLowerCase().includes(q)
          );
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [search, isAdmin]);

  const activeItem = useMemo(() => {
    for (const g of GROUPS) {
      const found = g.items.find((it) => it.id === activeId);
      if (found && (!found.superAdminOnly || isAdmin)) return found;
    }
    return GROUPS[0].items[0];
  }, [activeId, isAdmin]);

  const ActiveComponent = activeItem.component;
  const ActiveIcon = activeItem.icon;

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      <nav className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Cài đặt</span>
      </nav>

      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <Settings className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Cài đặt hệ thống
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Quản lý tổ chức, học thuật, vận hành và hệ thống
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen((v) => !v)}
          className="md:hidden inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-semibold"
          aria-label="Toggle settings menu"
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Danh mục
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 md:gap-6 items-start">
        {/* Sidebar */}
        <aside
          className={cn(
            "md:sticky md:top-4 rounded-xl border bg-card overflow-hidden",
            mobileNavOpen ? "block" : "hidden md:block",
          )}
        >
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm cài đặt…"
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <nav className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
            {visibleGroups.length === 0 ? (
              <p className="px-3 py-6 text-xs text-center text-muted-foreground">
                Không có mục nào khớp “{search}”.
              </p>
            ) : (
              visibleGroups.map((group) => (
                <div key={group.id} className="mb-3 last:mb-0">
                  <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.id === activeItem.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(item.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", isActive ? "" : "text-muted-foreground")} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </nav>
        </aside>

        {/* Content */}
        <section className="rounded-xl border bg-card min-w-0">
          <div className="px-5 md:px-6 py-4 border-b bg-muted/30">
            <h2 className="font-display text-base md:text-lg font-bold flex items-center gap-2">
              <ActiveIcon className="h-5 w-5 text-primary" />
              {activeItem.label}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {activeItem.description}
            </p>
          </div>
          <div className="p-4 md:p-6">
            <TabSkeleton>
              <ActiveComponent />
            </TabSkeleton>
          </div>
        </section>
      </div>
    </div>
  );
}

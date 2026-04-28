import { SidebarProvider, SidebarTrigger } from "@shared/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { GlobalBackButton } from "./GlobalBackButton";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { Bell, Search, BellOff } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function AdminLayout() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const greeting = useMemo(() => getGreeting(), []);
  const displayName = (user?.email?.split("@")[0] || "Admin").replace(/[._-]/g, " ");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!isMobile && <AdminSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center bg-card/95 backdrop-blur-sm px-4 md:px-6 gap-3 sticky top-0 z-30 border-b border-border/40 shadow-[0_1px_0_0_rgba(15,23,42,0.02)]">
            {!isMobile && (
              <SidebarTrigger className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/60 transition-colors" />
            )}

            {/* Welcome */}
            <div className="hidden md:block min-w-0">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold leading-none">
                {greeting}
              </p>
              <p className="font-display text-sm font-bold text-foreground capitalize truncate leading-tight mt-0.5">
                {displayName}!
              </p>
            </div>

            {/* Search bar */}
            <div className="hidden lg:flex items-center gap-2 ml-4 px-3.5 h-10 rounded-full bg-background border border-border/70 focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/15 transition-all w-[280px] xl:w-[360px]">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm học viên, lớp, đề thi…"
                className="bg-transparent outline-none border-0 text-sm flex-1 placeholder:text-muted-foreground/70"
              />
              <kbd className="hidden xl:inline-flex h-5 items-center px-1.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border/60">
                ⌘K
              </kbd>
            </div>

            {/* Spacer + breadcrumb on small/medium */}
            <div className="lg:hidden flex-1 min-w-0 flex items-center">
              <GlobalBackButton />
              <AdminBreadcrumb />
            </div>
            <div className="hidden lg:block ml-auto" />

            {/* Notification bell */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Thông báo"
                  className="relative h-10 w-10 rounded-full bg-secondary/60 hover:bg-secondary text-foreground/70 hover:text-primary flex items-center justify-center transition-colors"
                >
                  <Bell className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-80 p-0 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b bg-card/60">
                  <p className="font-display text-sm font-bold">Thông báo</p>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Sắp ra mắt
                  </span>
                </div>
                <div className="px-5 py-8 flex flex-col items-center text-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Chưa có thông báo mới
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Trung tâm thông báo đang được hoàn thiện. Các sự kiện về lớp,
                    duyệt lịch, payroll và đồng bộ sẽ hiển thị tại đây.
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {/* Avatar */}
            <button
              type="button"
              aria-label="Tài khoản"
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display font-bold text-sm flex items-center justify-center shadow-md shadow-primary/20 ring-2 ring-card hover:ring-primary/30 transition-all"
            >
              {initial}
            </button>
          </header>

          {/* Breadcrumb row (visible on lg+ where it's not in header) */}
          <div className="hidden lg:flex h-9 items-center px-6 border-b border-border/40 bg-card/40 backdrop-blur-sm">
            <GlobalBackButton />
            <AdminBreadcrumb />
          </div>

          <main className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <Outlet />
          </main>
        </div>
        {isMobile && <AdminBottomNav />}
      </div>
    </SidebarProvider>
  );
}

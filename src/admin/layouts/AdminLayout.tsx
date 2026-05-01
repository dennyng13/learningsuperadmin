import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { GlobalBackButton } from "./GlobalBackButton";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { Bell, Search, BellOff } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  return (
    <div className="min-h-screen flex w-full bg-lp-bg">
      {!isMobile && <AdminSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar — sticker-pop chrome */}
        <header className="h-16 flex items-center bg-lp-cream px-4 md:px-6 gap-3 sticky top-0 z-30 border-b-[2px] border-lp-ink">
          {/* Welcome */}
          <div className="hidden md:block min-w-0">
            <p className="text-[11px] uppercase tracking-[0.12em] text-lp-body font-semibold leading-none">
              {greeting}
            </p>
            <p className="font-display text-sm font-bold text-lp-ink capitalize truncate leading-tight mt-0.5">
              {displayName}!
            </p>
          </div>

          {/* Spacer + breadcrumb on small/medium */}
          <div className="lg:hidden flex-1 min-w-0 flex items-center">
            <GlobalBackButton />
            <AdminBreadcrumb />
          </div>
          <div className="hidden lg:block ml-auto" />

          {/* Search — collapsible icon → input on click */}
          {searchOpen ? (
            <div className="hidden lg:flex items-center gap-2 px-3.5 h-10 rounded-full bg-white border-[2px] border-lp-ink shadow-pop-xs transition-all w-[280px] xl:w-[360px]">
              <Search className="h-4 w-4 text-lp-body shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm học viên, lớp, đề thi…"
                className="bg-transparent outline-none border-0 text-sm flex-1 placeholder:text-lp-body/70 text-lp-ink"
                onBlur={() => setSearchOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
              />
              <kbd className="hidden xl:inline-flex h-5 items-center px-1.5 rounded bg-lp-cream text-[10px] font-mono text-lp-body border border-lp-ink/30">
                Esc
              </kbd>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Tìm kiếm"
              onClick={() => setSearchOpen(true)}
              className="hidden lg:flex h-10 w-10 rounded-pop bg-white border-[2px] border-lp-ink shadow-pop-xs hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none items-center justify-center transition-all duration-150 text-lp-ink"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </button>
          )}

          {/* Notification bell — sticker IconButton */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Thông báo"
                className="relative h-10 w-10 rounded-pop bg-white border-[2px] border-lp-ink shadow-pop-xs hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center transition-all duration-150 text-lp-ink"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={2.2} />
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-lp-coral border-2 border-lp-ink animate-pulse-dot"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="w-80 p-0 overflow-hidden border-2 border-lp-ink rounded-pop shadow-pop"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-lp-ink/15 bg-lp-cream">
                <p className="font-display text-sm font-bold text-lp-ink">Thông báo</p>
                <span className="text-[10px] uppercase tracking-wider text-lp-body font-semibold">
                  Sắp ra mắt
                </span>
              </div>
              <div className="px-5 py-8 flex flex-col items-center text-center gap-2 bg-white">
                <div className="h-10 w-10 rounded-full bg-lp-cream flex items-center justify-center border-[1.5px] border-lp-ink/20">
                  <BellOff className="h-5 w-5 text-lp-body" />
                </div>
                <p className="text-sm font-semibold text-lp-ink">
                  Chưa có thông báo mới
                </p>
                <p className="text-xs text-lp-body leading-relaxed">
                  Trung tâm thông báo đang được hoàn thiện. Các sự kiện về lớp,
                  duyệt lịch, payroll và đồng bộ sẽ hiển thị tại đây.
                </p>
              </div>
            </PopoverContent>
          </Popover>

          {/* Avatar — sticker ring */}
          <button
            type="button"
            aria-label="Tài khoản"
            className="h-10 w-10 rounded-full bg-gradient-to-br from-lp-teal to-lp-teal-deep text-white font-display font-bold text-sm flex items-center justify-center border-[2px] border-lp-ink shadow-pop-xs hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150"
          >
            {initial}
          </button>
        </header>

        {/* Breadcrumb row (visible on lg+ where it's not in header) */}
        <div className="hidden lg:flex h-9 items-center px-6 border-b-2 border-lp-ink/10 bg-lp-cream/40">
          <GlobalBackButton />
          <AdminBreadcrumb />
        </div>

        <main className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 bg-lp-bg">
          <Outlet />
        </main>
      </div>
      {isMobile && <AdminBottomNav />}
    </div>
  );
}

import { LayoutDashboard, FileText, Upload, Users, MoreHorizontal, School, Layers, Award, Settings, CalendarDays, BookOpen, ShieldCheck, ClipboardList } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { cn } from "@shared/lib/utils";
import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@shared/components/ui/sheet";

const primaryItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Đề thi", url: "/admin/tests", icon: FileText },
  { title: "Import", url: "/admin/import", icon: Upload },
  { title: "Người dùng", url: "/admin/users", icon: Users },
];

const moreItems = [
  { title: "Flashcard Sets", url: "/admin/flashcards", icon: BookOpen },
  { title: "Huy hiệu", url: "/admin/badges", icon: Award },
  { title: "Lớp học", url: "/admin/classes", icon: School },
  { title: "Study Plans", url: "/admin/study-plans", icon: ClipboardList },
  { title: "Điểm danh TnG", url: "/admin/teachngo-attendance", icon: CalendarDays },
];

const superAdminMoreItems = [
  { title: "Module Permissions", url: "/admin/modules", icon: ShieldCheck },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(8);
  }
}

export function AdminBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [tapped, setTapped] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isMoreActive = [...moreItems, ...superAdminMoreItems].some(i => isActive(i.url));
  const allMore = [...moreItems, ...(isSuperAdmin ? superAdminMoreItems : [])];

  const handleTap = useCallback((url: string) => {
    triggerHaptic();
    setTapped(url);
    setTimeout(() => setTapped(null), 200);
    navigate(url);
  }, [navigate]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-14 px-1">
        {primaryItems.map((item) => {
          const active = isActive(item.url);
          const isTapped = tapped === item.url;
          return (
            <button
              key={item.url}
              onClick={() => handleTap(item.url)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground",
                isTapped && "scale-90"
              )}
            >
              <div className={cn(
                "relative transition-transform duration-200",
                isTapped && "scale-110",
                active && "animate-in zoom-in-75 duration-200"
              )}>
                <item.icon className={cn("h-5 w-5 transition-all duration-200", active && "stroke-[2.5]")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-tight transition-all duration-200",
                active && "font-semibold"
              )}>{item.title}</span>
              {active && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full animate-in fade-in zoom-in-50 duration-300" />
              )}
            </button>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              onClick={() => triggerHaptic()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200 active:scale-90",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className={cn("h-5 w-5 transition-all duration-200", isMoreActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-tight">Thêm</span>
              {isMoreActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {allMore.map((item, i) => {
                const active = isActive(item.url);
                return (
                  <button
                    key={item.url}
                    onClick={() => { triggerHaptic(); navigate(item.url); setOpen(false); }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 active:scale-95 animate-in fade-in slide-in-from-bottom-2",
                      active ? "bg-primary/10 text-primary" : "bg-secondary/50 text-foreground hover:bg-secondary"
                    )}
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs font-medium text-center leading-tight">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

import { MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { cn } from "@shared/lib/utils";
import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@shared/components/ui/sheet";
import { adminNavItems } from "@shared/config/navigation";

// Primary 4 quick-access items on bottom bar (mobile).
// Day 7 IA overhaul: dashboard / classes / users / teachers (most-used per IA).
const PRIMARY_IDS = ["dashboard", "classes", "users", "teachers"];

const primaryItems = PRIMARY_IDS
  .map(id => adminNavItems.find(i => i.id === id)!)
  .filter(Boolean);

// "Thêm" sheet: tất cả item còn lại, giữ thứ tự theo group + order.
// Day 7 IA: 7 main groups + review (modules dư) + system (super_admin).
const NON_SYSTEM_GROUPS = [
  "hub", "people", "study", "center", "teaching", "financial", "documents",
] as const;
const moreMainItems = adminNavItems
  .filter(i => NON_SYSTEM_GROUPS.includes(i.group as typeof NON_SYSTEM_GROUPS[number]) && !PRIMARY_IDS.includes(i.id))
  .sort((a, b) => a.order - b.order);
// Modules dư — "Đang xem xét" muted ở cuối sheet.
const moreHrItems = adminNavItems.filter(i => i.group === "review").sort((a, b) => a.order - b.order);
const moreSystemItems = adminNavItems.filter(i => i.group === "system").sort((a, b) => a.order - b.order);

function triggerHaptic() {
  if (navigator.vibrate) navigator.vibrate(8);
}

export function AdminBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [tapped, setTapped] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const allMore = [...moreMainItems, ...moreHrItems, ...(isSuperAdmin ? moreSystemItems : [])];
  const isMoreActive = allMore.some(i => isActive(i.route));

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
          const active = isActive(item.route);
          const isTapped = tapped === item.route;
          return (
            <button
              key={item.route}
              onClick={() => handleTap(item.route)}
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
              )}>{item.label}</span>
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
                const active = isActive(item.route);
                return (
                  <button
                    key={item.route}
                    onClick={() => { triggerHaptic(); navigate(item.route); setOpen(false); }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 active:scale-95 animate-in fade-in slide-in-from-bottom-2",
                      active ? "bg-primary/10 text-primary" : "bg-secondary/50 text-foreground hover:bg-secondary"
                    )}
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
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

import { cn } from "@shared/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type Portal = "admin" | "teacher" | "student";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  badge?: number;
  group?: string;
}

export interface AccentSidebarProps {
  portal: Portal;
  appName?: string;
  userName?: string;
  userRole?: string;
  navItems: NavItem[];
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  footer?: ReactNode;
  className?: string;
}

interface PortalStyles {
  strip: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  activeBar: string;   // full-bar solid tone when active
  activeText: string;
}

const portalStyles: Record<Portal, PortalStyles> = {
  admin: {
    strip:      "bg-lp-teal",
    badgeBg:    "bg-lp-teal",
    badgeText:  "text-white",
    badgeLabel: "ADMIN",
    activeBar:  "bg-lp-teal",
    activeText: "text-white",
  },
  teacher: {
    strip:      "bg-lp-coral",
    badgeBg:    "bg-lp-coral",
    badgeText:  "text-white",
    badgeLabel: "TEACHER",
    activeBar:  "bg-lp-coral",
    activeText: "text-white",
  },
  student: {
    strip:      "bg-lp-yellow",
    badgeBg:    "bg-lp-yellow",
    badgeText:  "text-lp-ink",
    badgeLabel: "STUDENT",
    activeBar:  "bg-lp-yellow",
    activeText: "text-lp-ink",
  },
};

export function AccentSidebar({
  portal,
  appName = "Learning Plus",
  userName,
  userRole,
  navItems,
  activeRoute,
  onNavigate,
  footer,
  className,
}: AccentSidebarProps) {
  const styles = portalStyles[portal];

  return (
    <aside
      className={cn(
        "relative w-64 min-h-full flex flex-col bg-lp-ink text-white",
        className,
      )}
      data-portal={portal}
    >
      {/* Accent strip (4px left edge) */}
      <div aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", styles.strip)} />

      {/* Header */}
      <div className="relative pl-5 pr-3 py-4 border-b-2 border-white/10 flex items-start justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold text-white leading-tight">{appName}</h2>
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-2 py-0.5 border-[2px] border-white/90 rounded-full text-[10px] font-display font-bold tracking-wider",
            styles.badgeBg,
            styles.badgeText,
          )}
        >
          {styles.badgeLabel}
        </span>
      </div>

      {/* User info */}
      {(userName || userRole) && (
        <div className="pl-5 pr-3 py-3 border-b-2 border-white/10">
          {userName && <div className="text-sm font-semibold text-white leading-tight">{userName}</div>}
          {userRole && <div className="text-xs text-white/60 mt-0.5">{userRole}</div>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 pl-2 pr-2 space-y-1 overflow-y-auto" aria-label={`${styles.badgeLabel} navigation`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.route;
          return (
            <button
              key={item.id}
              type="button"
              onClick={onNavigate ? () => onNavigate(item.route) : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group w-full flex items-center gap-3 px-3 py-2 rounded-pop text-left text-sm font-body font-medium",
                "transition-all duration-200 ease-bounce",
                isActive
                  ? cn(styles.activeBar, styles.activeText, "shadow-pop-xs")
                  : cn("text-white/80", "hover:bg-white/10 hover:text-white hover:translate-x-1"),
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={2} />
              <span className="flex-1 truncate">{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full border-[1.5px]",
                    isActive
                      ? "bg-white text-lp-ink border-lp-ink/40"
                      : "bg-lp-coral text-white border-white/80",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && <div className="pl-5 pr-3 py-3 border-t-2 border-white/10 text-white/80">{footer}</div>}
    </aside>
  );
}

import { ExternalLink, LogOut } from "lucide-react";
import { NavLink } from "@shared/components/misc/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { cn } from "@shared/lib/utils";
import { adminNavItems } from "@shared/config/navigation";
import { usePendingDraftCount } from "@shared/hooks/useAvailabilityDrafts";
import { useBrandAsset } from "@shared/hooks/useBrandAsset";
import { useOrgShortName } from "@shared/hooks/useOrgShortName";

type GroupKey = "academic" | "classes" | "users" | "hr" | "system";

const GROUP_LABELS: Record<GroupKey, string> = {
  academic: "Học thuật",
  classes:  "Lớp & Lịch",
  users:    "Người dùng",
  hr:       "Hành chính",
  system:   "Hệ thống",
};

const GROUP_ORDER: GroupKey[] = ["academic", "classes", "users", "hr", "system"];

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, signOut } = useAuth();
  const pendingDrafts = usePendingDraftCount();
  const orgShortName = useOrgShortName();
  const { url: logoUrl } = useBrandAsset(["logo-app", "logo-main", "logoApp", "logoMain"]);

  // Path ownership map — multiple aliasPaths can map to one nav item.
  const pathOwnership = adminNavItems.flatMap((i) =>
    [i.route, ...(i.aliasPaths ?? [])].map((p) => ({ path: p, ownerRoute: i.route })),
  );
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    const matches = pathOwnership.filter(
      ({ path: p }) =>
        p !== "/" && (location.pathname === p || location.pathname.startsWith(p + "/")),
    );
    if (matches.length === 0) return false;
    const longest = matches.reduce((a, b) => (a.path.length >= b.path.length ? a : b));
    return path === longest.ownerRoute;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const visibleItems = adminNavItems.filter((i) => !i.superAdminOnly || isSuperAdmin);

  return (
    <aside
      className="relative w-64 min-h-screen flex flex-col bg-lp-ink text-white shrink-0"
      data-portal="admin"
    >
      {/* Teal accent strip — admin signature */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-lp-teal" />

      {/* Header */}
      <div className="relative pl-5 pr-3 py-4 border-b-2 border-white/10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-9 w-9 object-contain shrink-0" />
          ) : (
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-pop bg-white/10 font-display font-extrabold text-base leading-none tracking-tight shrink-0">
              <span className="text-lp-teal">L</span>
              <span className="text-lp-coral">+</span>
            </span>
          )}
          <h2 className="font-display text-base font-extrabold text-white leading-tight truncate">
            <BrandShortName name={orgShortName} />
          </h2>
        </div>
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 border-[2px] border-white/90 rounded-full text-[10px] font-display font-bold tracking-wider bg-lp-teal text-white">
          ADMIN
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto" aria-label="Admin navigation">
        {GROUP_ORDER.map((groupKey) => {
          if (groupKey === "system" && !isSuperAdmin) return null;
          const items = visibleItems.filter((i) => i.group === groupKey).sort(byOrder);
          if (items.length === 0) return null;

          return (
            <div key={groupKey} className="mb-4 last:mb-0">
              <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.1em] font-display font-bold text-white/50">
                {GROUP_LABELS[groupKey]}
              </div>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = isActive(item.route);
                  const badgeCount = item.id === "availability-drafts" ? pendingDrafts : 0;
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.route}
                        end={item.end}
                        className={cn(
                          "group w-full flex items-center gap-3 px-3 py-2 rounded-pop text-left text-sm font-body font-medium",
                          "transition-all duration-200 ease-bounce",
                          active
                            ? "bg-lp-teal text-white shadow-pop-xs"
                            : "text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1",
                        )}
                      >
                        <Icon className="size-[18px] shrink-0" strokeWidth={2} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badgeCount > 0 && (
                          <span
                            className={cn(
                              "shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full border-[1.5px]",
                              active
                                ? "bg-white text-lp-ink border-lp-ink/40"
                                : "bg-lp-coral text-white border-white/80",
                            )}
                          >
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer — external links + signout */}
      <div className="border-t-2 border-white/10 px-2 py-2 space-y-1">
        <a
          href="https://ielts.learningplus.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-pop text-sm font-body font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ExternalLink className="size-4 shrink-0" />
          <span className="flex-1 truncate">IELTS Practice</span>
        </a>
        <a
          href="https://teacher.learningplus.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-pop text-sm font-body font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ExternalLink className="size-4 shrink-0" />
          <span className="flex-1 truncate">Teacher's Hub</span>
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-pop text-sm font-body font-medium text-white/60 hover:bg-lp-coral/20 hover:text-lp-coral transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          <span className="flex-1 text-left">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

/**
 * Brand short name with subtle accent on the trailing "+" (e.g. "Learn+" → Learn (white) + (coral)).
 */
function BrandShortName({ name }: { name: string }) {
  const trimmed = name.trim();
  if (trimmed.endsWith("+") && trimmed.length > 1) {
    return (
      <>
        <span className="text-white">{trimmed.slice(0, -1)}</span>
        <span className="text-lp-coral">+</span>
      </>
    );
  }
  return <span className="text-white">{trimmed}</span>;
}

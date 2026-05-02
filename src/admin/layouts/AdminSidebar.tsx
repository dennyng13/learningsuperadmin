import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ExternalLink, LogOut } from "lucide-react";
import { NavLink } from "@shared/components/misc/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { cn } from "@shared/lib/utils";
import { adminNavItems, type NavItem } from "@shared/config/navigation";
import { usePendingDraftCount } from "@shared/hooks/useAvailabilityDrafts";
import { useBrandAsset } from "@shared/hooks/useBrandAsset";
import { useOrgShortName } from "@shared/hooks/useOrgShortName";

type GroupKey =
  | "hub"
  | "people"
  | "study"
  | "center"
  | "teaching"
  | "financial"
  | "documents"
  | "system"
  | "review";

const GROUP_LABELS: Record<GroupKey, string> = {
  hub:       "Trang chủ",
  people:    "Quản lý nhân sự",
  study:     "Quản lý học tập",
  center:    "Quản lý trung tâm",
  teaching:  "Quản lý giảng dạy",
  financial: "Quản lý tài chính",
  documents: "Tài liệu",
  system:    "Hệ thống",
  review:    "Đang xem xét",
};

const GROUP_ORDER: GroupKey[] = [
  "hub", "people", "study", "center", "teaching", "financial", "documents",
  "review", "system",
];

/** Groups always expanded (cannot collapse). hub thường chỉ có 1-2 items
 *  và là entry điểm nên luôn mở. */
const NON_COLLAPSIBLE: ReadonlySet<GroupKey> = new Set(["hub"]);

/** Default-collapsed groups khi user lần đầu vào portal. Mở dần theo nhu cầu. */
const DEFAULT_COLLAPSED: ReadonlySet<GroupKey> = new Set([
  "people", "study", "center", "teaching", "financial", "documents", "review", "system",
]);

const STORAGE_KEY = "admin-sidebar-collapsed-groups";

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, signOut } = useAuth();
  const pendingDrafts = usePendingDraftCount();
  const orgShortName = useOrgShortName();
  const { url: logoUrl } = useBrandAsset(["logo-app", "logo-main", "logoApp", "logoMain"]);

  /* ─── Collapse state per group, persisted in localStorage ─── */
  const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupKey>>(() => {
    if (typeof window === "undefined") return new Set(DEFAULT_COLLAPSED);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set(DEFAULT_COLLAPSED);
      const arr = JSON.parse(raw) as string[];
      return new Set(arr.filter((s): s is GroupKey =>
        GROUP_ORDER.includes(s as GroupKey),
      ));
    } catch {
      return new Set(DEFAULT_COLLAPSED);
    }
  });

  const persistCollapsed = (next: Set<GroupKey>) => {
    setCollapsedGroups(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch { /* ignore quota errors */ }
    }
  };

  const toggleGroup = (g: GroupKey) => {
    if (NON_COLLAPSIBLE.has(g)) return;
    const next = new Set(collapsedGroups);
    if (next.has(g)) next.delete(g); else next.add(g);
    persistCollapsed(next);
  };

  /* ─── Path → owner mapping (longest aliasPath wins) ─── */
  const pathOwnership = useMemo(() =>
    adminNavItems.flatMap((i) =>
      [i.route, ...(i.aliasPaths ?? [])].map((p) => ({ path: p, ownerRoute: i.route })),
    ), []);

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

  const visibleItems = adminNavItems.filter((i) => !i.superAdminOnly || isSuperAdmin);

  /** Group containing the currently-active item (force expanded). */
  const activeGroup = useMemo<GroupKey | null>(() => {
    const item = visibleItems.find((i) => isActive(i.route));
    return (item?.group as GroupKey) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, visibleItems.length]);

  /* Auto-uncollapse the active group if user navigates somewhere new while
     parent group was collapsed. Persisted state remains intact for next visit. */
  useEffect(() => {
    if (!activeGroup) return;
    if (NON_COLLAPSIBLE.has(activeGroup)) return;
    if (collapsedGroups.has(activeGroup)) {
      const next = new Set(collapsedGroups);
      next.delete(activeGroup);
      persistCollapsed(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  const isExpanded = (g: GroupKey) =>
    NON_COLLAPSIBLE.has(g) || !collapsedGroups.has(g);

  const itemsByGroup = (groupKey: GroupKey) =>
    visibleItems.filter((i) => i.group === groupKey).sort(byOrder);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderItem = (item: NavItem, opts?: { muted?: boolean }) => {
    const active = isActive(item.route);
    const badgeCount = item.id === "availability-drafts" ? pendingDrafts : 0;
    const Icon = item.icon;
    const muted = opts?.muted ?? false;
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
              : muted
                ? "text-white/45 hover:bg-white/5 hover:text-white/70"
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
  };

  return (
    <aside
      className="sticky top-0 self-start h-screen w-64 flex flex-col bg-lp-ink text-white shrink-0"
      data-portal="admin"
    >
      {/* Scrollbar style */}
      <style>{`
        .admin-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--lp-teal) transparent;
        }
        .admin-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .admin-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb {
          background: var(--lp-teal);
          border-radius: 2px;
        }
      `}</style>

      {/* Header */}
      <div className="relative pl-5 pr-3 py-4 border-b-2 border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-9 w-9 object-contain shrink-0" />
          ) : (
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-pop bg-white/10 font-display font-extrabold text-base leading-none tracking-tight shrink-0">
              <span className="text-lp-teal">L</span>
              <span className="text-lp-coral">+</span>
            </span>
          )}
          <div className="leading-tight min-w-0">
            <h2 className="font-display text-base font-extrabold text-white leading-tight truncate">
              <BrandShortName name={orgShortName} />
            </h2>
            <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
              Admin Portal
            </p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 border-[2px] border-lp-teal text-lp-teal bg-transparent rounded-full text-[10px] font-display font-bold tracking-wider">
          ADMIN
        </span>
      </div>

      {/* Nav groups */}
      <nav className="admin-sidebar-scroll flex-1 py-3 px-2 overflow-y-auto" aria-label="Admin navigation">
        {GROUP_ORDER.map((groupKey) => {
          if (groupKey === "system" && !isSuperAdmin) return null;
          const items = itemsByGroup(groupKey);
          if (items.length === 0) return null;

          const isReview = groupKey === "review";
          const expanded = isExpanded(groupKey);
          const collapsible = !NON_COLLAPSIBLE.has(groupKey);
          // Show item count in collapsed header để user biết group nào còn có gì.
          const itemCount = items.length;
          const hasActiveChild = items.some((i) => isActive(i.route));

          return (
            <div
              key={groupKey}
              className={cn(
                "mb-2 last:mb-0",
                isReview && "mt-4 pt-2 border-t-2 border-white/10",
              )}
            >
              {/* Group header — clickable when collapsible */}
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  aria-expanded={expanded}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-pop",
                    "text-[10px] uppercase tracking-[0.1em] font-display font-bold",
                    "transition-colors duration-150",
                    isReview ? "text-white/35 hover:text-white/60" : "text-white/55 hover:text-white/80",
                    "hover:bg-white/5",
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "size-3 shrink-0 transition-transform duration-200",
                      expanded && "rotate-90",
                    )}
                    strokeWidth={2.5}
                  />
                  <span className="flex-1 text-left truncate">
                    {GROUP_LABELS[groupKey]}
                  </span>
                  {!expanded && (
                    <span className={cn(
                      "shrink-0 text-[9px] font-mono font-normal tracking-normal",
                      hasActiveChild ? "text-lp-teal" : "text-white/40",
                    )}>
                      {hasActiveChild ? "● " : ""}{itemCount}
                    </span>
                  )}
                </button>
              ) : (
                <div className={cn(
                  "px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] font-display font-bold",
                  "text-white/55",
                )}>
                  {GROUP_LABELS[groupKey]}
                </div>
              )}

              {/* Items */}
              {expanded && (
                <ul className="space-y-1 mt-1">
                  {items.map((item) => renderItem(item, { muted: isReview }))}
                </ul>
              )}
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

import {
  LogOut, ExternalLink, ChevronRight,
} from "lucide-react";
import { NavLink } from "@shared/components/misc/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { cn } from "@shared/lib/utils";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator, useSidebar,
} from "@shared/components/ui/sidebar";
import { adminNavItems } from "@shared/config/navigation";
import { usePendingDraftCount } from "@shared/hooks/useAvailabilityDrafts";
import { useBrandAsset } from "@shared/hooks/useBrandAsset";
import { useOrgShortName } from "@shared/hooks/useOrgShortName";

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;
const academicItems = adminNavItems.filter(i => i.group === "academic").sort(byOrder);
const classesItems  = adminNavItems.filter(i => i.group === "classes").sort(byOrder);
const usersItems    = adminNavItems.filter(i => i.group === "users").sort(byOrder);
const hrItems       = adminNavItems.filter(i => i.group === "hr").sort(byOrder);
const superAdminItems = adminNavItems.filter(i => i.group === "system").sort(byOrder);

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSuperAdmin, signOut } = useAuth();
  const pendingDrafts = usePendingDraftCount();
  const orgShortName = useOrgShortName();
  // Resolve the app logo from the brand-assets registry.
  // DB convention is kebab-case (logo-app / logo-main); camelCase variants
  // kept as fallback for any historic uploads.
  const { url: logoUrl } = useBrandAsset(["logo-app", "logo-main", "logoApp", "logoMain"]);

  const allPaths = adminNavItems.map(i => i.route);
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    const matchingPaths = allPaths.filter(
      p => p !== "/" && (location.pathname === p || location.pathname.startsWith(p + "/"))
    );
    if (matchingPaths.length === 0) return false;
    const longestMatch = matchingPaths.reduce((a, b) => (a.length >= b.length ? a : b));
    return path === longestMatch;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderMenuItem = (item: typeof academicItems[0]) => {
    const active = isActive(item.route);
    const badgeCount = item.id === "availability-drafts" ? pendingDrafts : 0;
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          asChild
          isActive={active}
          size="sm"
          tooltip={item.label}
          className={cn(
            "rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors duration-150",
            active && "!bg-primary/10 !text-primary font-medium shadow-[inset_2px_0_0_hsl(var(--primary))]"
          )}
        >
          <NavLink to={item.route} end={item.end}>
            <item.icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-primary")} />
            <span>{item.label}</span>
            {badgeCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-semibold leading-none group-data-[collapsible=icon]:hidden">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
            {active && badgeCount === 0 && <ChevronRight className="ml-auto h-3 w-3 text-primary/40" />}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      {/* Header */}
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={cn(
            "flex items-center justify-center shrink-0 h-9 w-9",
            !logoUrl && "rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 shadow-sm"
          )}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-9 w-9 object-contain"
                loading="eager"
                decoding="async"
              />
            ) : (
              <span className="font-display font-extrabold text-base leading-none tracking-tight">
                <span className="text-primary">L</span>
                <span className="text-accent">+</span>
              </span>
            )}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-extrabold text-sidebar-foreground leading-tight truncate tracking-tight">
              <BrandShortName name={orgShortName} />
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight truncate mt-0.5">Admin Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Học thuật (kèm Dashboard ở đầu) */}
        <SidebarGroup className="py-1.5">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.1em] text-sidebar-foreground/40 font-semibold px-2 mb-0.5">
            Học thuật
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {academicItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lớp & Lịch */}
        {classesItems.length > 0 && (
          <>
            <SidebarSeparator className="mx-3" />
            <SidebarGroup className="py-1.5">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.1em] text-sidebar-foreground/40 font-semibold px-2 mb-0.5">
                Lớp & Lịch
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {classesItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Người dùng */}
        {usersItems.length > 0 && (
          <>
            <SidebarSeparator className="mx-3" />
            <SidebarGroup className="py-1.5">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.1em] text-sidebar-foreground/40 font-semibold px-2 mb-0.5">
                Người dùng
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {usersItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Hành chính */}
        {hrItems.length > 0 && (
          <>
            <SidebarSeparator className="mx-3" />
            <SidebarGroup className="py-1.5">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.1em] text-sidebar-foreground/40 font-semibold px-2 mb-0.5">
                Hành chính
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {hrItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Super Admin */}
        {isSuperAdmin && (
          <>
            <SidebarSeparator className="mx-3" />
            <SidebarGroup className="py-1.5">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.1em] text-sidebar-foreground/40 font-semibold px-2 mb-0.5">
                Hệ thống
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {superAdminItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer */}
      <SidebarFooter className="py-2">
        <SidebarMenu className="gap-px">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              asChild
              tooltip="IELTS Practice (Học viên)"
              className="rounded-md text-primary/70 hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors duration-150"
            >
              <a href="https://ielts.learningplus.vn" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span>IELTS Practice</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              asChild
              tooltip="Teacher's Hub (Giáo viên)"
              className="rounded-md text-primary/70 hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors duration-150"
            >
              <a href="https://teacher.learningplus.vn" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span>Teacher's Hub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              onClick={handleSignOut}
              tooltip="Đăng xuất"
              className="rounded-md text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/5 cursor-pointer transition-colors duration-150"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * Hiển thị tên viết tắt của tổ chức với nhấn nhá màu:
 * - Nếu tên kết thúc bằng dấu "+": phần trước = primary, "+" = accent
 *   (vd: "Learn+" → Learn(primary) + (accent))
 * - Ngược lại: toàn bộ dùng màu primary
 */
function BrandShortName({ name }: { name: string }) {
  const trimmed = name.trim();
  if (trimmed.endsWith("+") && trimmed.length > 1) {
    return (
      <>
        <span className="text-primary">{trimmed.slice(0, -1)}</span>
        <span className="text-accent">+</span>
      </>
    );
  }
  return <span className="text-sidebar-foreground">{trimmed}</span>;
}

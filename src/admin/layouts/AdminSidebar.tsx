import {
  LogOut, Shield, ExternalLink, ChevronRight,
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

const mainItems = adminNavItems.filter(i => i.group === "main").sort((a, b) => a.order - b.order);
const superAdminItems = adminNavItems.filter(i => i.group === "system").sort((a, b) => a.order - b.order);

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSuperAdmin, signOut } = useAuth();

  const allPaths = adminNavItems.map(i => i.route);
  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    const matchingPaths = allPaths.filter(
      p => p !== "/admin" && (location.pathname === p || location.pathname.startsWith(p + "/"))
    );
    if (matchingPaths.length === 0) return false;
    const longestMatch = matchingPaths.reduce((a, b) => (a.length >= b.length ? a : b));
    return path === longestMatch;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const renderMenuItem = (item: typeof mainItems[0]) => {
    const active = isActive(item.route);
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
            {active && <ChevronRight className="ml-auto h-3 w-3 text-primary/40" />}
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
          <div className="rounded-md bg-primary/10 flex items-center justify-center shrink-0 h-7 w-7">
            <Shield className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-bold text-sidebar-foreground leading-tight truncate">Admin</p>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight truncate">{user?.email}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup className="py-1.5">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.1em] text-sidebar-foreground/40 font-semibold px-2 mb-0.5">
            Quản lý
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {mainItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
              onClick={() => navigate("/")}
              tooltip="Trang học viên"
              className="rounded-md text-primary/70 hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors duration-150"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>Trang học viên</span>
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

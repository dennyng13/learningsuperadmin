import { SidebarProvider, SidebarTrigger } from "@shared/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@shared/hooks/use-mobile";

export default function AdminLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/30">
        {!isMobile && <AdminSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b border-border/40 bg-card/80 backdrop-blur-sm px-3 gap-2 sticky top-0 z-30">
            {!isMobile && <SidebarTrigger className="h-7 w-7 text-muted-foreground/60 hover:text-foreground transition-colors" />}
            <div className="h-4 w-px bg-border/50 hidden md:block" />
            <AdminBreadcrumb />
          </header>
          <main className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <Outlet />
          </main>
        </div>
        {isMobile && <AdminBottomNav />}
      </div>
    </SidebarProvider>
  );
}

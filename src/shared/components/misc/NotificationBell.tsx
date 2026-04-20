import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { Bell, Check, X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Drawer, DrawerContent, DrawerTrigger } from "@shared/components/ui/drawer";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

function NotificationList({ notifications, onRead, onNavigate }: {
  notifications: Notification[];
  onRead: (id: string) => void;
  onNavigate: (link: string) => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Không có thông báo mới
      </div>
    );
  }
  return (
    <div className="max-h-80 overflow-y-auto divide-y">
      {notifications.map(n => (
        <button
          key={n.id}
          onClick={() => {
            if (!n.read) onRead(n.id);
            if (n.link) onNavigate(n.link);
          }}
          className={cn(
            "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
            !n.read && "bg-primary/5"
          )}
        >
          <div className="flex items-start gap-2">
            {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium truncate", !n.read && "font-bold")}>{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data as Notification[]);
    };
    fetch();

    // Realtime subscription
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleNavigate = (link: string) => {
    setOpen(false);
    navigate(link);
  };

  if (!user) return null;

  const bellButton = (
    <button
      onClick={() => !isMobile && setOpen(!open)}
      className="relative p-2 rounded-xl hover:bg-muted/60 transition-all"
    >
      <Bell className="w-5 h-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{bellButton}</DrawerTrigger>
        <DrawerContent>
          <div className="p-4 pb-2">
            <h3 className="font-display font-bold text-base">Thông báo</h3>
          </div>
          <NotificationList notifications={notifications} onRead={markRead} onNavigate={handleNavigate} />
          <div className="h-6" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="relative">
      {bellButton}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/60 rounded-2xl shadow-xl z-50 animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-display font-bold text-sm">Thông báo</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <NotificationList notifications={notifications} onRead={markRead} onNavigate={handleNavigate} />
          </div>
        </>
      )}
    </div>
  );
}

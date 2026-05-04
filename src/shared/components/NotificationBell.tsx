import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Bell, X } from "lucide-react";
import { cn } from "@shared/lib/utils";
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
  source?: 'notifications' | 'teacher_notifications' | 'student_notifications';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      // Fetch from all 3 notification tables
      const [genericRes, teacherRes, studentRes] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("teacher_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("student_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      const allNotifications: Notification[] = [
        ...(genericRes.data || []).map((n: any) => ({ ...n, source: 'notifications' as const })),
        ...(teacherRes.data || []).map((n: any) => ({ ...n, body: n.message, read: n.is_read, source: 'teacher_notifications' as const })),
        ...(studentRes.data || []).map((n: any) => ({ ...n, body: n.message, read: n.is_read, source: 'student_notifications' as const })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      setNotifications(allNotifications);
    };

    fetchAll();

    // Realtime subscriptions for all 3 tables
    const channelName = `notifications-bell:${user.id}:${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [{ ...payload.new as Notification, source: 'notifications' }, ...prev].slice(0, 20));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "teacher_notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as any;
        setNotifications(prev => [{ ...n, body: n.message, read: n.is_read, source: 'teacher_notifications' }, ...prev].slice(0, 20));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "student_notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as any;
        setNotifications(prev => [{ ...n, body: n.message, read: n.is_read, source: 'student_notifications' }, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    // Find the notification to determine source
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    // Update in correct table
    if (notification.source === 'teacher_notifications') {
      await supabase.from("teacher_notifications").update({ is_read: true }).eq("id", id);
    } else if (notification.source === 'student_notifications') {
      await supabase.from("student_notifications").update({ is_read: true }).eq("id", id);
    } else {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleNavigate = (link: string) => {
    setOpen(false);
    navigate(link);
  };

  if (!user) return null;

  const bellButton = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Thông báo"
      className="relative h-10 w-10 rounded-pop bg-white border-[2px] border-lp-ink shadow-pop-xs hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center transition-all duration-150 text-lp-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={2.2} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-lp-coral text-white text-[10px] font-display font-bold rounded-full flex items-center justify-center border-[1.5px] border-lp-ink">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative">
      {bellButton}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/60 rounded-2xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

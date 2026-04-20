import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Pin } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  teacher_name?: string;
}

export default function ClassAnnouncementsPanel({ classId }: { classId: string }) {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: anns } = await supabase
          .from("class_announcements")
          .select("id, title, content, pinned, created_at, teacher_id")
          .eq("class_id", classId)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        const teacherIds = [...new Set((anns || []).map(a => a.teacher_id).filter(Boolean))];
        const teacherMap: Record<string, string> = {};
        if (teacherIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", teacherIds);
          (profs || []).forEach(p => { teacherMap[p.id] = p.full_name || "Giáo viên"; });
        }

        if (!cancelled) {
          setRows((anns || []).map(a => ({
            ...a,
            teacher_name: teacherMap[a.teacher_id] || "Giáo viên",
          })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  if (loading) return <div className="text-xs text-muted-foreground">Đang tải thông báo…</div>;
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Chưa có thông báo nào cho lớp.</p>;
  }

  return (
    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
      {rows.map(a => (
        <div
          key={a.id}
          className={cn(
            "rounded-xl border p-3 space-y-1.5",
            a.pinned ? "border-primary/40 bg-primary/5" : "bg-muted/30"
          )}
        >
          <div className="flex items-start gap-2">
            {a.pinned ? <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> : <Megaphone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-display font-bold text-sm leading-tight">{a.title}</p>
              {a.content && (
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{a.content}</p>
              )}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                <span>{a.teacher_name}</span>
                <span>{format(new Date(a.created_at), "dd/MM/yyyy", { locale: vi })}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

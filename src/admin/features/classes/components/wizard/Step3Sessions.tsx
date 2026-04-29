import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { X, RotateCcw } from "lucide-react";
import { AssignedTeacher, DraftSession, WEEKDAY_LABELS } from "./wizardTypes";

interface Props {
  sessions: DraftSession[];
  setSessions: (s: DraftSession[]) => void;
  teachers: AssignedTeacher[];
}

export default function Step3Sessions({ sessions, setSessions, teachers }: Props) {
  const allTeachersQ = useQuery({
    queryKey: ["all-teachers-for-substitute"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id, full_name").eq("status", "active").order("full_name");
      return data || [];
    },
  });

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/40 p-6 text-sm">
        Chưa có buổi học nào. Hãy quay lại Step 1 để chọn ngày & Step 2 để chọn khung giờ + giáo viên.
      </div>
    );
  }

  const updateSession = (id: string, patch: Partial<DraftSession>) => {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const activeCount = sessions.filter((s) => !s.cancelled).length;

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Tổng cộng: <span className="font-semibold text-foreground">{sessions.length}</span> buổi
        ({activeCount} active, {sessions.length - activeCount} cancelled)
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Ngày</th>
              <th className="text-left px-3 py-2">Thứ</th>
              <th className="text-left px-3 py-2">Giờ</th>
              <th className="text-left px-3 py-2">Mode</th>
              <th className="text-left px-3 py-2">Phòng</th>
              <th className="text-left px-3 py-2">Giáo viên</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => {
              const wdLabel = WEEKDAY_LABELS.find((w) => w.value === s.weekday)?.label ?? "—";
              return (
                <tr key={s.id} className={s.cancelled ? "opacity-50 line-through" : ""}>
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2">{s.session_date}</td>
                  <td className="px-3 py-2">{wdLabel}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{s.start_time}–{s.end_time}</td>
                  <td className="px-3 py-2">{s.mode}</td>
                  <td className="px-3 py-2">
                    <Input className="h-8 w-24" value={s.room} onChange={(e) => updateSession(s.id, { room: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <Select value={s.teacher_id} onValueChange={(v) => updateSession(s.id, { teacher_id: v })}>
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue placeholder="— Chọn giáo viên —" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.full_name} ({t.role})</SelectItem>
                        ))}
                        {(allTeachersQ.data || [])
                          .filter((t: any) => !teachers.find((x) => x.teacher_id === t.id))
                          .map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.full_name} (substitute)</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => updateSession(s.id, { cancelled: !s.cancelled })}
                      title={s.cancelled ? "Khôi phục" : "Hủy buổi"}
                    >
                      {s.cancelled ? <RotateCcw className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
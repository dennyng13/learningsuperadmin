import { School, User, Users, Clock, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";
import { getProgramPalette } from "@shared/utils/programColors";

interface ClassInfo {
  id: string;
  class_name: string;
  course_title?: string | null;
  teacher_name?: string | null;
  schedule?: string | null;
  level?: string | null;
  program?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  room?: string | null;
  default_start_time?: string | null;
  default_end_time?: string | null;
  class_type?: string | null;
  studentCount?: number;
}

export default function ClassInfoCard({ info }: { info: ClassInfo }) {
  const fmtDate = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy", { locale: vi }) : null);
  const startDate = fmtDate(info.start_date);
  const endDate = fmtDate(info.end_date);
  const palette = getProgramPalette(info.program);

  return (
    <div className={cn(
      "bg-gradient-to-br rounded-2xl border-2 p-5 space-y-4",
      palette.bannerGradient,
      palette.bannerBorder,
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", palette.iconBg)}>
            <School className={cn("h-6 w-6", palette.iconText)} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-xl leading-tight truncate">{info.class_name}</h1>
            {info.course_title && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{info.course_title}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {info.program && (
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                  palette.badge,
                )}>
                  {info.program}
                </span>
              )}
              {info.level && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">
                  {info.level}
                </span>
              )}
              {info.class_type && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {info.class_type}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-border/50">
        {info.teacher_name && (
          <InfoRow icon={User} label="Giáo viên" value={info.teacher_name} />
        )}
        {info.studentCount !== undefined && (
          <InfoRow icon={Users} label="Sĩ số" value={`${info.studentCount} học viên`} />
        )}
        {info.schedule && (
          <InfoRow icon={Calendar} label="Lịch" value={info.schedule} />
        )}
        {(info.default_start_time || info.default_end_time) && (
          <InfoRow
            icon={Clock}
            label="Giờ học"
            value={`${(info.default_start_time || "").slice(0, 5)}${info.default_end_time ? `–${info.default_end_time.slice(0, 5)}` : ""}`}
          />
        )}
        {info.room && (
          <InfoRow icon={MapPin} label="Phòng" value={info.room} />
        )}
        {(startDate || endDate) && (
          <InfoRow
            icon={Calendar}
            label="Khai giảng"
            value={`${startDate || "?"}${endDate ? ` → ${endDate}` : ""}`}
          />
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

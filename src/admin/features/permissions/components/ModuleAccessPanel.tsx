import { useState } from "react";
import { useModuleAccess } from "@shared/hooks/useModuleAccess";
import { Switch } from "@shared/components/ui/switch";
import {
  Loader2, BookOpen, Dumbbell, BookText, FileText, Layers,
  Gamepad2, ClipboardList, PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";

interface ModuleItem {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  parentKey?: string;
}

const MODULES: ModuleItem[] = [
  { key: "mock-test",        label: "Thi thử",            icon: BookOpen,       description: "Mock tests IELTS đầy đủ 4 kỹ năng" },
  { key: "practice",         label: "Luyện tập",          icon: Dumbbell,       description: "Luyện từng kỹ năng riêng lẻ" },
  { key: "vocabulary",       label: "Từ vựng",            icon: BookText,       description: "Học và ôn từ vựng theo chủ đề" },
  { key: "flashcard-create", label: "Tự tạo Flashcard",   icon: Layers,         description: "Học viên tạo flashcard cá nhân", parentKey: "vocabulary" },
  { key: "vocab-game",       label: "Chơi game từ vựng",  icon: Gamepad2,       description: "Mini-game ôn từ vựng",         parentKey: "vocabulary" },
  { key: "study-plan",       label: "Kế hoạch học tập",   icon: ClipboardList,  description: "Xem kế hoạch học tập được gán" },
  { key: "study-plan-create", label: "Tạo kế hoạch",      icon: PenLine,        description: "Tạo / chỉnh sửa kế hoạch học tập", parentKey: "study-plan" },
  { key: "resources",        label: "Tài liệu",           icon: FileText,       description: "Tips, strategies và tài liệu" },
];

const ROLES = [
  { key: "user",    label: "Học viên",  description: "Tài khoản học viên chính thức" },
  { key: "guest",   label: "Khách",     description: "Tài khoản dùng thử / khách" },
  { key: "teacher", label: "Giáo viên", description: "Tài khoản giáo viên" },
];

/**
 * Matrix bật/tắt module × role.
 * Lưu ý: row có parentKey hiển thị thụt lề + dashed border để diễn đạt
 * quan hệ cha/con (vd. "Tự tạo Flashcard" thuộc "Từ vựng").
 */
export default function ModuleAccessPanel() {
  const { access, loading, updateAccess } = useModuleAccess();
  const [updating, setUpdating] = useState<string | null>(null);

  const isEnabled = (role: string, moduleKey: string) =>
    access.find((a) => a.role === role && a.module_key === moduleKey)?.enabled ?? false;

  const handleToggle = async (role: string, moduleKey: string, current: boolean) => {
    const id = `${role}-${moduleKey}`;
    setUpdating(id);
    const { error } = await updateAccess(role, moduleKey, !current);
    if (error) {
      toast.error("Không thể cập nhật quyền");
    } else {
      const mod = MODULES.find((m) => m.key === moduleKey);
      const r = ROLES.find((x) => x.key === role);
      toast.success(`Đã ${!current ? "bật" : "tắt"} ${mod?.label} cho ${r?.label}`);
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 text-xs text-muted-foreground">
            <th className="text-left px-4 py-3 font-medium w-[260px]">Module</th>
            {ROLES.map((r) => (
              <th key={r.key} className="text-center px-4 py-3 font-medium min-w-[110px]">
                {r.label}
              </th>
            ))}
            <th className="text-center px-4 py-3 font-medium min-w-[110px]">Admin</th>
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isChild = !!mod.parentKey;
            return (
              <tr key={mod.key} className="border-t hover:bg-muted/10 transition-colors">
                <td className={cn("px-4 py-3", isChild && "pl-10 bg-muted/5")}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "rounded-md flex items-center justify-center shrink-0",
                        isChild ? "w-6 h-6 bg-accent/10" : "w-7 h-7 bg-primary/10",
                      )}
                    >
                      <Icon className={cn(isChild ? "h-3 w-3 text-accent" : "h-3.5 w-3.5 text-primary")} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{mod.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{mod.description}</p>
                    </div>
                  </div>
                </td>
                {ROLES.map((role) => {
                  const enabled = isEnabled(role.key, mod.key);
                  const isUpdating = updating === `${role.key}-${mod.key}`;
                  return (
                    <td key={role.key} className="px-2 py-3 text-center">
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                      ) : (
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => handleToggle(role.key, mod.key, enabled)}
                        />
                      )}
                    </td>
                  );
                })}
                {/* Admin/Super Admin always-on */}
                <td className="px-2 py-3 text-center">
                  <Switch checked disabled className="opacity-60" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
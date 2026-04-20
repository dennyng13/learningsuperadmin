import { useState } from "react";
import { useModuleAccess } from "@shared/hooks/useModuleAccess";
import { Switch } from "@shared/components/ui/switch";
import { Loader2, ShieldCheck, BookOpen, Dumbbell, BookText, FileText, Layers, Gamepad2, ClipboardList, PenLine } from "lucide-react";
import { toast } from "sonner";

interface ModuleItem {
  key: string;
  label: string;
  icon: any;
  description: string;
  children?: ModuleItem[];
}

const MODULES: ModuleItem[] = [
  { key: "mock-test", label: "Thi thử", icon: BookOpen, description: "Mock tests IELTS đầy đủ 4 kỹ năng" },
  { key: "practice", label: "Luyện tập", icon: Dumbbell, description: "Luyện từng kỹ năng riêng lẻ" },
  {
    key: "vocabulary", label: "Từ vựng", icon: BookText, description: "Học và ôn từ vựng theo chủ đề",
    children: [
      { key: "flashcard-create", label: "Tự tạo Flashcard", icon: Layers, description: "Cho phép học viên tạo flashcard cá nhân" },
      { key: "vocab-game", label: "Chơi game từ vựng", icon: Gamepad2, description: "Cho phép chơi mini-game ôn từ vựng" },
    ],
  },
  {
    key: "study-plan", label: "Kế hoạch học tập", icon: ClipboardList, description: "Xem kế hoạch học tập được gán",
    children: [
      { key: "study-plan-create", label: "Tạo kế hoạch", icon: PenLine, description: "Cho phép tạo / chỉnh sửa kế hoạch học tập" },
    ],
  },
  { key: "resources", label: "Tài liệu", icon: FileText, description: "Tips, strategies và tài liệu" },
];

const ROLES = [
  { key: "user", label: "Học viên", description: "Tài khoản học viên chính thức" },
  { key: "guest", label: "Khách", description: "Tài khoản dùng thử / khách" },
  { key: "teacher", label: "Giáo viên", description: "Tài khoản giáo viên" },
];

export default function ModulePermissionsPage() {
  const { access, loading, updateAccess } = useModuleAccess();
  const [updating, setUpdating] = useState<string | null>(null);

  const isEnabled = (role: string, moduleKey: string) => {
    return access.find((a) => a.role === role && a.module_key === moduleKey)?.enabled ?? false;
  };

  const handleToggle = async (role: string, moduleKey: string, current: boolean) => {
    const id = `${role}-${moduleKey}`;
    setUpdating(id);
    const { error } = await updateAccess(role, moduleKey, !current);
    const allMods = MODULES.flatMap(m => [m, ...(m.children ?? [])]);
    if (error) {
      toast.error("Không thể cập nhật quyền");
    } else {
      toast.success(`Đã ${!current ? "bật" : "tắt"} ${allMods.find(m => m.key === moduleKey)?.label} cho ${ROLES.find(r => r.key === role)?.label}`);
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Phân quyền Module
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cấu hình quyền truy cập module cho từng loại tài khoản
        </p>
      </div>

      <div className="space-y-6">
        {ROLES.map((role) => (
          <div key={role.key} className="bg-card border rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-muted/50 border-b">
              <h2 className="font-display text-base font-bold">{role.label}</h2>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </div>
            <div className="divide-y">
              {MODULES.map((mod) => {
                const enabled = isEnabled(role.key, mod.key);
                const isUpdating = updating === `${role.key}-${mod.key}`;
                const Icon = mod.icon;
                return (
                  <div key={mod.key}>
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{mod.label}</p>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      </div>
                      <div className="shrink-0">
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => handleToggle(role.key, mod.key, enabled)}
                          />
                        )}
                      </div>
                    </div>
                    {mod.children?.map((child) => {
                      const childEnabled = isEnabled(role.key, child.key);
                      const childUpdating = updating === `${role.key}-${child.key}`;
                      const ChildIcon = child.icon;
                      return (
                        <div
                          key={child.key}
                          className="flex items-center gap-4 pl-14 pr-5 py-3 hover:bg-muted/20 transition-colors border-t border-dashed"
                        >
                          <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                            <ChildIcon className="h-3.5 w-3.5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{child.label}</p>
                            <p className="text-xs text-muted-foreground">{child.description}</p>
                          </div>
                          <div className="shrink-0">
                            {childUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={childEnabled}
                                onCheckedChange={() => handleToggle(role.key, child.key, childEnabled)}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

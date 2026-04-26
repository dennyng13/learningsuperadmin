import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { ShieldCheck, LayoutGrid, UserCog } from "lucide-react";
import ModuleAccessPanel from "../components/ModuleAccessPanel";
import StudentFieldAccessPanel from "../components/StudentFieldAccessPanel";

type TabKey = "modules" | "student-fields";
const VALID: TabKey[] = ["modules", "student-fields"];

/**
 * Trang phân quyền tập trung — gộp 2 hệ phân quyền độc lập:
 * - Module: bật/tắt feature (mock-test, vocab…) cho từng role
 * - Dữ liệu học viên: cấp quyền Xem/Sửa từng nhóm field hồ sơ
 *
 * 2 hệ vẫn dùng bảng DB riêng (module_access, student_field_access) — không
 * merge schema, chỉ gộp UI để có 1 entry point duy nhất.
 */
export default function PermissionsPage() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as TabKey) || "modules";
  const [tab, setTab] = useState<TabKey>(VALID.includes(initial) ? initial : "modules");

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (next.get("tab") !== tab) {
      next.set("tab", tab);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Người dùng
        </p>
        <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Phân quyền
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Quản lý quyền truy cập module và quyền xem / sửa dữ liệu học viên
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger
            value="modules"
            className="gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <LayoutGrid className="h-4 w-4" /> Module
          </TabsTrigger>
          <TabsTrigger
            value="student-fields"
            className="gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <UserCog className="h-4 w-4" /> Dữ liệu học viên
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Bật/tắt từng module cho mỗi loại tài khoản. Admin và Super Admin luôn có quyền truy cập đầy đủ.
          </p>
          <ModuleAccessPanel />
        </TabsContent>

        <TabsContent value="student-fields" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Cấu hình quyền xem / sửa từng nhóm thông tin học viên cho mỗi vai trò. Tắt "Xem" sẽ tự tắt "Sửa".
          </p>
          <StudentFieldAccessPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
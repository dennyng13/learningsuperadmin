import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { RefreshCw, Loader2, Settings2, Link2, Tags, Plus, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SyncedClassesTab from "@admin/features/users/components/SyncedClassesTab";
import CourseLevelManager from "@admin/features/settings/components/CourseLevelManager";
import CreateClassDialog from "@admin/features/classes/components/CreateClassDialog";
import MigrateCustomizedPlansDialog from "@admin/features/study-plans/components/MigrateCustomizedPlansDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";

export default function ClassManagementPage() {
  const [syncing, setSyncing] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const navigate = useNavigate();

  const handleAutoAssignLevels = async () => {
    setAutoAssigning(true);
    const { data, error } = await supabase.rpc("auto_assign_class_levels" as any);
    if (error) {
      toast.error("Lỗi auto-assign");
    } else {
      const levels = (data as any)?.levels_assigned || 0;
      const programs = (data as any)?.programs_assigned || 0;
      if (levels > 0 || programs > 0) {
        const lines: string[] = [];
        if (levels > 0) lines.push(` Gán level cho ${levels} lớp`);
        if (programs > 0) lines.push(` Gán chương trình cho ${programs} lớp`);
        toast.success(lines.join("\n"));
        window.location.reload();
      } else {
        toast.info("Không có lớp nào cần gán level/chương trình");
      }
    }
    setAutoAssigning(false);
  };

  const syncClasses = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setSyncing(false); return; }
      const res = await supabase.functions.invoke("sync-teachngo-students", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) toast.error(`Lỗi đồng bộ: ${res.error.message}`);
      else {
        const d = res.data;
        const lines = [` Đồng bộ thành công! ${d.classes_synced || 0} lớp học`];
        if (d.levels_assigned) lines.push(` Gán level tự động cho ${d.levels_assigned} lớp`);
        if (d.programs_assigned) lines.push(` Gán program tự động cho ${d.programs_assigned} lớp`);
        if (d.teachers_linked) lines.push(` Liên kết ${d.teachers_linked} lớp với giáo viên`);
        if (d.students_linked) lines.push(` Liên kết ${d.students_linked} học viên với tài khoản`);
        toast.success(lines.join("\n"), { duration: 5000 });
        window.location.reload();
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setSyncing(false);
  };

  const handleAutoLinkTeachers = async () => {
    setLinking(true);
    const { data, error } = await supabase.rpc("auto_link_class_teachers" as any);
    if (error) {
      toast.error("Lỗi auto-link giáo viên");
    } else {
      const matched = (data as any)?.matched || 0;
      toast.success(`Đã liên kết ${matched} lớp với giáo viên`);
      window.location.reload();
    }
    setLinking(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold">Quản lý lớp học</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Teach'n Go</p>
        </div>
      <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1 shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setLevelsOpen(!levelsOpen)} size="icon" variant={levelsOpen ? "default" : "ghost"} className="h-8 w-8 rounded-md">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Quản lý Level</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleAutoAssignLevels} disabled={autoAssigning} size="icon" variant="ghost" className="h-8 w-8 rounded-md">
                  {autoAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Auto-assign Level & Program</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleAutoLinkTeachers} disabled={linking} size="icon" variant="ghost" className="h-8 w-8 rounded-md">
                  {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Auto-link giáo viên</TooltipContent>
            </Tooltip>
            <div className="w-px h-5 bg-border/50 mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setCreateOpen(true)} size="icon" variant="ghost" className="h-8 w-8 rounded-md">
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tạo nhanh (legacy)</TooltipContent>
            </Tooltip>
            <Button onClick={() => navigate("/classes/new")} size="sm" variant="primary" className="h-8 text-xs px-3 rounded-md gap-1">
              <Plus className="h-3.5 w-3.5" /> Tạo lớp mới
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setMigrateOpen(true)} size="icon" variant="ghost" className="h-8 w-8 rounded-md">
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chuyển đổi kế hoạch cá nhân → Lớp Private</TooltipContent>
            </Tooltip>
            <Button onClick={syncClasses} disabled={syncing} size="sm" variant="default" className="h-8 text-xs px-3 rounded-md">
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
            </Button>
          </div>
        </TooltipProvider>
      </div>

      {levelsOpen && (
        <div className="border rounded-xl bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base">Danh sách Level</h2>
              <p className="text-xs text-muted-foreground">Thêm, sửa, xóa level. Đồng bộ với bộ lọc trong Kho bài tập.</p>
            </div>
          </div>
          <CourseLevelManager />
        </div>
      )}

      <SyncedClassesTab />

      <CreateClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => window.location.reload()}
      />

      <MigrateCustomizedPlansDialog
        open={migrateOpen}
        onOpenChange={setMigrateOpen}
        onMigrated={() => window.location.reload()}
      />
    </div>
  );
}

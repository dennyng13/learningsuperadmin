import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  GraduationCap, Plus, Loader2, Trash2, EyeOff, Layers, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@shared/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { useCoursesAdmin, type CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import ProgramDetailTab from "@admin/features/academic/components/ProgramDetailTab";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

/**
 * Module Quản lý Khóa học.
 *
 * Cấu trúc tab:
 *   • [program.key] — 1 tab động cho MỖI program (IELTS / WRE / Customized…).
 *     Trong tab: hero + stats + mô tả + outcomes + CRUD cấp độ + lớp đang chạy.
 *
 * Cấp độ giờ được CRUD trực tiếp trong scope từng program (không còn tab chung
 * hay matrix gán). Schema vẫn many-to-many — 1 level vẫn có thể link nhiều
 * program nếu cần (qua import/migration), nhưng UI tập trung 1-program-1-tab.
 *
 * Tab active sync ?tab=<program.key>.
 */
export default function CoursesPage() {
  const { programs, loading, remove, refetch: refetchPrograms } = useCoursesAdmin();
  const { levels, refetch: refetchLevels } = useCourseLevels();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ─── Tab state synced với URL ─── */
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = useMemo(() => {
    if (tabFromUrl) return tabFromUrl;
    return programs[0]?.key ?? "";
  }, [tabFromUrl, programs]);

  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (loading) return;
    const valid = programs.some((p) => p.key === tab);
    if (!valid) setTab(programs[0]?.key ?? "");
  }, [loading, programs, tab]);

  const handleTabChange = (next: string) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const handleCreate = () => navigate("/courses/new");
  const handleEdit = (p: CourseProgram) => navigate(`/courses/${p.id}/edit`);

  /** Refetch cả programs lẫn levels — gọi từ ProgramLevelManager sau CRUD. */
  const handleProgramChanged = async () => {
    await Promise.all([refetchPrograms(), refetchLevels()]);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      toast.success("Đã xóa khóa học");
      if (programs.find((p) => p.id === deleteId)?.key === tab) {
        const remaining = programs.filter((p) => p.id !== deleteId);
        handleTabChange(remaining[0]?.key ?? "");
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* ─── Page header ─── */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Học thuật
          </p>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Quản lý Khóa học
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Mỗi chương trình (IELTS, WRE, Customized…) có tab riêng — bao gồm
            <strong> khóa học (cấp độ)</strong>, đầu ra, mô tả và lớp đang chạy.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
            <Link to="/courses/programs">
              <Settings2 className="h-3.5 w-3.5" /> Quản trị chương trình
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
            <Link to="/courses/levels">
              <Layers className="h-3.5 w-3.5" /> Khóa học (cấp độ)
            </Link>
          </Button>
          <Button onClick={handleCreate} size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Tạo chương trình
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
          <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Chưa có khóa học nào</p>
          <Button onClick={handleCreate} size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5 mr-1" /> Tạo khóa học đầu tiên
          </Button>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          {/* ─── Tab triggers (scrollable) ─── */}
          <ScrollArea className="w-full">
            <TabsList className="h-auto p-1 inline-flex flex-nowrap gap-1 bg-muted/60">
              {programs.map((p) => {
                const Icon = getProgramIcon(p.key);
                const palette = getProgramPalette(p.key);
                const inactive = p.status === "inactive";
                return (
                  <TabsTrigger
                    key={p.id}
                    value={p.key}
                    className={cn(
                      "h-8 px-2.5 gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm",
                      inactive && "opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded flex items-center justify-center shrink-0",
                        palette.iconBg,
                      )}
                    >
                      <Icon className={cn("h-3 w-3", palette.iconText)} />
                    </span>
                    <span className="font-semibold">{p.name}</span>
                    {inactive && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* ─── Per-program tabs ─── */}
          {programs.map((p) => (
            <TabsContent key={p.id} value={p.key} className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(p.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Xóa khóa học này
                </Button>
              </div>
              <ProgramDetailTab
                program={p}
                levels={levels}
                onEdit={() => handleEdit(p)}
                onChanged={handleProgramChanged}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khóa học này?</AlertDialogTitle>
            <AlertDialogDescription>
              Liên kết level sẽ bị xóa theo. Lớp/bài tập đã gán khóa này sẽ giữ
              lại giá trị cũ nhưng có thể không hiển thị màu/tên đúng nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
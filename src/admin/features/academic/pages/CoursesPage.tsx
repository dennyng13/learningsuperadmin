import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  GraduationCap, Plus, Loader2, LayoutGrid, Layers, Trash2, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@shared/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { useCoursesAdmin, type CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import CourseLevelManager from "@admin/features/settings/components/CourseLevelManager";
import ProgramLevelsMatrix from "@admin/features/academic/components/ProgramLevelsMatrix";
import ProgramDetailTab from "@admin/features/academic/components/ProgramDetailTab";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

/**
 * Module Quản lý Khóa học.
 *
 * Cấu trúc tab:
 *   • [program.key] — 1 tab động cho MỖI program (IELTS / WRE / Customized…).
 *     Trong tab: hero + stats + mô tả + outcomes + cấp độ + lớp đang chạy.
 *   • "matrix"     — gán nhanh program ↔ level dạng bảng (bulk edit).
 *   • "levels"     — CRUD `course_levels` (list global level).
 *
 * Tab active sync ?tab=<program.key|matrix|levels>.
 */

const SPECIAL_TABS = { matrix: "matrix", levels: "levels" } as const;

export default function CoursesPage() {
  const { programs, loading, remove, setProgramLevels } = useCoursesAdmin();
  const { levels } = useCourseLevels();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ─── Tab state synced với URL ─── */
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = useMemo(() => {
    if (tabFromUrl) return tabFromUrl;
    return programs[0]?.key ?? SPECIAL_TABS.matrix;
  }, [tabFromUrl, programs]);

  const [tab, setTab] = useState(defaultTab);

  // Khi programs load xong lần đầu mà chưa có tab nào hợp lệ → chọn tab đầu tiên
  useEffect(() => {
    if (loading) return;
    const valid =
      tab === SPECIAL_TABS.matrix ||
      tab === SPECIAL_TABS.levels ||
      programs.some((p) => p.key === tab);
    if (!valid) setTab(programs[0]?.key ?? SPECIAL_TABS.matrix);
  }, [loading, programs, tab]);

  const handleTabChange = (next: string) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const handleCreate = () => navigate("/courses/new");
  const handleEdit = (p: CourseProgram) => navigate(`/courses/${p.id}/edit`);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      toast.success("Đã xóa khóa học");
      // Nếu tab đang xem là program vừa xóa → chuyển về tab đầu hoặc matrix
      if (programs.find((p) => p.id === deleteId)?.key === tab) {
        const remaining = programs.filter((p) => p.id !== deleteId);
        handleTabChange(remaining[0]?.key ?? SPECIAL_TABS.matrix);
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
            Mỗi chương trình (IELTS, WRE, Customized…) có tab riêng — bao gồm cấp độ,
            đầu ra, mô tả và lớp đang chạy.
          </p>
        </div>
        <Button onClick={handleCreate} size="sm" className="h-8 gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Tạo khóa học
        </Button>
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

              {/* Divider */}
              <span className="self-stretch w-px bg-border/60 mx-1" aria-hidden />

              <TabsTrigger value={SPECIAL_TABS.matrix} className="h-8 px-2.5 gap-1.5 text-xs">
                <LayoutGrid className="h-3.5 w-3.5" /> Gán cấp độ
              </TabsTrigger>
              <TabsTrigger value={SPECIAL_TABS.levels} className="h-8 px-2.5 gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" /> Cấp độ
                <span className="ml-1 px-1.5 rounded bg-muted text-[10px] font-mono">
                  {levels.length}
                </span>
              </TabsTrigger>
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
              />
            </TabsContent>
          ))}

          {/* ─── Tab Gán cấp độ ─── */}
          <TabsContent value={SPECIAL_TABS.matrix} className="mt-4">
            <ProgramLevelsMatrix
              programs={programs}
              levels={levels}
              onSave={setProgramLevels}
            />
          </TabsContent>

          {/* ─── Tab Cấp độ ─── */}
          <TabsContent value={SPECIAL_TABS.levels} className="mt-4">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div>
                <h2 className="font-display font-bold text-base">Danh sách cấp độ</h2>
                <p className="text-xs text-muted-foreground">
                  Thêm/sửa/xóa cấp độ. Đồng bộ với bộ lọc trong Lớp học, Kho bài tập và Khóa học.
                </p>
              </div>
              <CourseLevelManager />
            </div>
          </TabsContent>
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
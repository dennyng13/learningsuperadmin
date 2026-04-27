import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, EyeOff, Eye, ArrowUp, ArrowDown, Loader2,
  Layers, GraduationCap, Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { useCoursesAdmin, type CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

/**
 * /courses/programs — Trang quản trị danh sách CHƯƠNG TRÌNH (program).
 *
 * Khác với /courses (xem chi tiết theo tab + Add/Sort khóa con), trang này
 * dành cho việc quản lý chương trình ở cấp metadata: đổi thứ tự hiển thị,
 * ẩn/hiện, và mở editor để chỉnh sửa.
 *
 * Cấp độ (= "khóa học") không sửa ở đây — chuyển sang /courses/levels.
 */
export default function ProgramsListPage() {
  const navigate = useNavigate();
  const { programs, loading, update, refetch } = useCoursesAdmin();
  const { levels } = useCourseLevels();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const programsByLevelCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of programs) m.set(p.id, p.level_ids.length);
    return m;
  }, [programs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [programs, query]);

  /** Đổi thứ tự bằng cách đổi sort_order với program kế bên. */
  const swapOrder = async (idx: number, dir: -1 | 1) => {
    const a = programs[idx];
    const b = programs[idx + dir];
    if (!a || !b) return;
    setBusy(a.id);
    try {
      await update(a.id, toInput(a, { sort_order: b.sort_order }));
      await update(b.id, toInput(b, { sort_order: a.sort_order }));
      await refetch();
    } catch (err: any) {
      toast.error(`Lỗi đổi thứ tự: ${err.message ?? "Unknown"}`);
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (p: CourseProgram) => {
    setBusy(p.id);
    try {
      await update(p.id, toInput(p, { status: p.status === "active" ? "inactive" : "active" }));
      toast.success(p.status === "active" ? `Đã ẩn "${p.name}"` : `Đã hiện "${p.name}"`);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Unknown"}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs -ml-2 mb-2 text-muted-foreground">
            <Link to="/courses">
              <ArrowLeft className="h-3 w-3 mr-1" /> Quay lại danh sách khóa
            </Link>
          </Button>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Quản trị Chương trình
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Đổi thứ tự, ẩn/hiện, chỉnh sửa metadata các chương trình (IELTS, WRE, Customized…).
            Mỗi chương trình chứa nhiều <strong>khóa học (cấp độ)</strong> bên trong.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
            <Link to="/courses/levels">
              <Layers className="h-3.5 w-3.5" /> Khóa học (cấp độ)
            </Link>
          </Button>
          <Button onClick={() => navigate("/courses/new")} size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Tạo chương trình
          </Button>
        </div>
      </header>

      <div className="relative max-w-sm">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm chương trình…"
          className="h-9 text-sm pl-8"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
          <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {query ? "Không có chương trình khớp." : "Chưa có chương trình nào."}
          </p>
          {!query && (
            <Button onClick={() => navigate("/courses/new")} size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" /> Tạo chương trình đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="font-display font-bold text-sm">
              Tất cả chương trình ({filtered.length}/{programs.length})
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Tổng số khóa con: {levels.length}
            </span>
          </div>
          <div className="divide-y">
            {filtered.map((p) => {
              const Icon = getProgramIcon(p.key);
              const palette = getProgramPalette(p.key);
              const inactive = p.status === "inactive";
              const idxInFull = programs.findIndex((x) => x.id === p.id);
              const canUp = idxInFull > 0 && !query;
              const canDown = idxInFull < programs.length - 1 && !query;
              const isBusy = busy === p.id;
              const childCount = programsByLevelCount.get(p.id) ?? 0;

              return (
                <div
                  key={p.id}
                  className={cn(
                    "px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors",
                    inactive && "opacity-60",
                  )}
                >
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", palette.iconBg)}>
                    <Icon className={cn("h-4 w-4", palette.iconText)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm truncate">{p.name}</span>
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {p.key}
                      </code>
                      {inactive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-flex items-center gap-1">
                          <EyeOff className="h-2.5 w-2.5" /> Ẩn
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-3 w-3" /> {childCount} khóa con
                      </span>
                      {p.outcomes.length > 0 && (
                        <span>{p.outcomes.length} đầu ra</span>
                      )}
                      <span>Sort: {p.sort_order}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Lên 1 bậc"
                      disabled={!canUp || isBusy}
                      onClick={() => swapOrder(idxInFull, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Xuống 1 bậc"
                      disabled={!canDown || isBusy}
                      onClick={() => swapOrder(idxInFull, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={inactive ? "Hiện chương trình" : "Ẩn chương trình"}
                      disabled={isBusy}
                      onClick={() => toggleStatus(p)}
                    >
                      {inactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={() => navigate(`/courses/${p.id}/edit`)}
                    >
                      <Pencil className="h-3 w-3" /> Sửa
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/** Helper: build CourseProgramInput từ row hiện tại + override. */
function toInput(p: CourseProgram, override: Partial<CourseProgram>) {
  return {
    key: p.key,
    name: p.name,
    description: p.description,
    long_description: p.long_description,
    outcomes: p.outcomes,
    color_key: p.color_key,
    icon_key: p.icon_key,
    sort_order: p.sort_order,
    status: p.status,
    level_ids: p.level_ids,
    ...override,
  };
}
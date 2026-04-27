/**
 * BulkCourseAssignDialog — chọn 1 hay nhiều Course rồi áp dụng vào N resource
 * cùng lúc với 3 mode:
 *
 *   - Add     : chèn các (resource, course) chưa có. Giữ nguyên các cặp cũ.
 *   - Replace : xoá toàn bộ assignments hiện tại của các resource này, rồi
 *               chèn lại đúng các course đã chọn.
 *   - Remove  : xoá các cặp (resource, course) khớp với các course đã chọn.
 *
 * Tất cả thao tác đi qua bảng pivot `resource_courses` để RLS + audit thống
 * nhất; KHÔNG ghi vào cột `program` cũ trên resource.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";
import { GraduationCap, Loader2, Search, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { useCourses } from "@/admin/features/academic/hooks/useCourses";
import { usePrograms } from "@shared/hooks/usePrograms";
import { useQueryClient } from "@tanstack/react-query";
import type { ResourceKind } from "@shared/hooks/useResourceCourses";

type Mode = "add" | "replace" | "remove";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ResourceKind;
  resourceIds: string[];
  /** Friendly noun shown in the dialog header (vd: "bài tập", "đề thi"). */
  resourceLabel?: string;
  onDone?: () => void;
}

export function BulkCourseAssignDialog({
  open, onOpenChange, kind, resourceIds, resourceLabel = "tài nguyên", onDone,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { programs } = usePrograms();
  const { courses } = useCourses({ withStats: false });

  const [mode, setMode] = useState<Mode>("add");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [running, setRunning] = useState(false);

  const programNameById = useMemo(
    () => new Map(programs.map((p) => [p.id, p.name])),
    [programs],
  );

  const pickable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => c.status === "active")
      .filter((c) => programFilter === "all" || c.program_id === programFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [courses, query, programFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof pickable>();
    pickable.forEach((c) => {
      const arr = m.get(c.program_id) || [];
      arr.push(c);
      m.set(c.program_id, arr);
    });
    return Array.from(m.entries());
  }, [pickable]);

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setPicked(new Set());
    setQuery("");
    setProgramFilter("all");
    setMode("add");
  };

  const close = () => {
    if (running) return;
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const apply = async () => {
    if (picked.size === 0) {
      toast.error("Hãy chọn ít nhất 1 khoá học");
      return;
    }
    if (resourceIds.length === 0) {
      toast.error("Không có tài nguyên nào được chọn");
      return;
    }
    setRunning(true);
    try {
      const courseList = Array.from(picked);

      if (mode === "replace") {
        // 1) xoá toàn bộ liên kết hiện tại của các resource này
        const { error: delErr } = await (supabase as any)
          .from("resource_courses")
          .delete()
          .eq("resource_type", kind)
          .in("resource_id", resourceIds);
        if (delErr) throw delErr;
        // 2) insert lại
        const rows = resourceIds.flatMap((rid) =>
          courseList.map((cid) => ({
            resource_type: kind,
            resource_id: rid,
            course_id: cid,
            created_by: user?.id ?? null,
          })),
        );
        if (rows.length > 0) {
          const { error } = await (supabase as any)
            .from("resource_courses")
            .insert(rows);
          if (error) throw error;
        }
        toast.success(`Đã thay thế ${resourceIds.length} ${resourceLabel} với ${courseList.length} khoá học`);
      } else if (mode === "remove") {
        const { error } = await (supabase as any)
          .from("resource_courses")
          .delete()
          .eq("resource_type", kind)
          .in("resource_id", resourceIds)
          .in("course_id", courseList);
        if (error) throw error;
        toast.success(`Đã gỡ ${courseList.length} khoá học khỏi ${resourceIds.length} ${resourceLabel}`);
      } else {
        // ADD — upsert kiểu best-effort (UNIQUE constraint sẽ chặn duplicate)
        const rows = resourceIds.flatMap((rid) =>
          courseList.map((cid) => ({
            resource_type: kind,
            resource_id: rid,
            course_id: cid,
            created_by: user?.id ?? null,
          })),
        );
        const { error } = await (supabase as any)
          .from("resource_courses")
          .upsert(rows, {
            onConflict: "resource_type,resource_id,course_id",
            ignoreDuplicates: true,
          });
        if (error) throw error;
        toast.success(`Đã gán ${courseList.length} khoá học vào ${resourceIds.length} ${resourceLabel}`);
      }

      // Refresh tất cả query liên quan
      qc.invalidateQueries({ queryKey: ["resource-courses"] });
      onDone?.();
      close();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Không thể cập nhật");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            Gán khoá học hàng loạt
          </DialogTitle>
          <DialogDescription className="text-xs">
            Áp dụng cho <b>{resourceIds.length}</b> {resourceLabel} đã chọn.
          </DialogDescription>
        </DialogHeader>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "add", label: "Thêm", desc: "Giữ khoá cũ, thêm khoá mới" },
              { v: "replace", label: "Thay thế", desc: "Xoá khoá cũ, gán lại" },
              { v: "remove", label: "Gỡ", desc: "Bỏ các khoá đã chọn" },
            ] as { v: Mode; label: string; desc: string }[]
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setMode(opt.v)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-md border p-2 text-xs text-left transition-colors",
                mode === opt.v
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span className="font-semibold">{opt.label}</span>
              <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>

        {mode === "replace" && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Tất cả khoá học đang gắn với {resourceIds.length} {resourceLabel} sẽ bị xoá trước khi gán lại.
          </div>
        )}

        {/* Course picker */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              autoFocus
              className="h-8 text-xs pl-7"
              placeholder="Tìm khoá học..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setProgramFilter("all")}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border",
                programFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border",
              )}
            >
              Tất cả CT
            </button>
            {programs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProgramFilter(p.id)}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border",
                  programFilter === p.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="max-h-[260px] overflow-y-auto border border-border rounded-md p-1 bg-muted/20">
            {grouped.length === 0 ? (
              <p className="text-center text-[11px] text-muted-foreground py-6">
                Không có khoá học phù hợp
              </p>
            ) : (
              grouped.map(([progId, list]) => (
                <div key={progId} className="mb-1">
                  <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                    {programNameById.get(progId) || "—"}
                  </div>
                  {list.map((c) => {
                    const selected = picked.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => togglePick(c.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 hover:bg-muted transition-colors",
                          selected && "bg-primary/5",
                        )}
                      >
                        <div
                          className={cn(
                            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0",
                            selected
                              ? "bg-primary border-primary"
                              : "border-border",
                          )}
                        >
                          {selected && (
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          )}
                        </div>
                        <span className="flex-1 truncate font-medium">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {picked.size > 0 && (
            <div className="flex flex-wrap gap-1">
              {Array.from(picked).map((id) => {
                const c = courses.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-[10px] gap-1"
                  >
                    <GraduationCap className="w-2.5 h-2.5" />
                    {c.name}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close} disabled={running} size="sm">
            Huỷ
          </Button>
          <Button
            onClick={apply}
            disabled={running || picked.size === 0}
            size="sm"
            className={cn(
              mode === "remove" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
            )}
          >
            {running && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
            {mode === "add" && `Thêm ${picked.size} khoá`}
            {mode === "replace" && `Thay thế bằng ${picked.size} khoá`}
            {mode === "remove" && `Gỡ ${picked.size} khoá`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
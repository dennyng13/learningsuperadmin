import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserX, Loader2, Check, X } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@shared/components/ui/dialog";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Badge } from "@shared/components/ui/badge";

/* Validation: lý do trim, 10–500 ký tự. RPC server-side cũng check NOT NULL,
   nhưng client-side check trước cho UX nhanh. */
const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, { message: "Lý do tối thiểu 10 ký tự" })
    .max(500, { message: "Lý do tối đa 500 ký tự" }),
});

interface Teacher {
  id: string;
  full_name: string;
  email: string | null;
  specialization: string | null;
}

interface Props {
  classId: string;
  className: string;
}

/**
 * Header action: gọi RPC `request_replacement_teacher` để gỡ GV hiện tại,
 * rút lời mời pending, chuyển status → `recruiting_replacement`, và (tuỳ chọn)
 * mời thêm các GV được chọn. Sau khi RPC OK mới gọi edge function
 * `send-class-invitations` để gửi email — RPC không tự gửi.
 */
export default function RequestReplacementTeacherButton({ classId, className }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["active-teachers-for-replacement"],
    enabled: open,
    queryFn: async (): Promise<Teacher[]> => {
      const { data, error } = await (supabase as any)
        .from("teachers")
        .select("id, full_name, email, specialization")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Teacher[];
    },
  });

  const filtered = teachers.filter((t) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      t.full_name.toLowerCase().includes(term) ||
      (t.email?.toLowerCase().includes(term) ?? false)
    );
  });

  const mutation = useMutation({
    mutationFn: async (vars: { reason: string; teacherIds: string[] }) => {
      const { data, error } = await (supabase as any).rpc("request_replacement_teacher", {
        p_class_id: classId,
        p_reason: vars.reason,
        p_teacher_ids: vars.teacherIds.length ? vars.teacherIds : null,
      });
      if (error) throw error;

      // Gửi email mời nếu có teacher_ids — RPC OK nhưng email lỗi chỉ warn
      if (vars.teacherIds.length > 0) {
        const { error: emailErr } = await supabase.functions.invoke(
          "send-class-invitations",
          { body: { class_id: classId, teacher_ids: vars.teacherIds } },
        );
        if (emailErr) {
          // eslint-disable-next-line no-console
          console.warn("Email send failed:", emailErr);
          toast.warning("Đã chuyển trạng thái nhưng không gửi được email mời");
        }
      }
      return data as { invitations_created?: number };
    },
    onSuccess: (data) => {
      const n = data?.invitations_created ?? 0;
      toast.success(
        n > 0
          ? `Đã chuyển sang "Tìm giáo viên mới" và tạo ${n} lời mời`
          : `Đã chuyển sang "Tìm giáo viên mới"`,
      );
      qc.invalidateQueries({ queryKey: ["admin-class-detail", classId] });
      qc.invalidateQueries({ queryKey: ["admin-classes-list"] });
      qc.invalidateQueries({ queryKey: ["admin-classes-counts"] });
      qc.invalidateQueries({ queryKey: ["class-status-history", classId] });
      qc.invalidateQueries({ queryKey: ["class-invitations", classId] });
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(`Lỗi: ${err.message}`);
    },
  });

  const handleClose = () => {
    if (mutation.isPending) return;
    setOpen(false);
    setReason("");
    setReasonError(null);
    setSearch("");
    setSelectedIds(new Set());
  };

  const handleSubmit = () => {
    const parsed = schema.safeParse({ reason });
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message ?? "Lý do không hợp lệ");
      return;
    }
    mutation.mutate({ reason: parsed.data.reason, teacherIds: Array.from(selectedIds) });
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 h-9"
      >
        <UserX className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Tìm giáo viên mới</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tìm giáo viên mới cho lớp</DialogTitle>
            <DialogDescription>
              Hành động này sẽ rút lại lời mời pending, gỡ giáo viên hiện tại khỏi
              lớp <span className="font-semibold text-foreground">{className}</span> và
              chuyển sang trạng thái <span className="font-semibold">Tìm giáo viên mới</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="replacement-reason" className="text-xs">
                Lý do <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="replacement-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                maxLength={500}
                rows={3}
                placeholder="VD: GV xin nghỉ vì lý do sức khoẻ"
                aria-invalid={!!reasonError}
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className={reasonError ? "text-destructive" : "text-muted-foreground"}>
                  {reasonError ?? "Tối thiểu 10 ký tự"}
                </span>
                <span className="text-muted-foreground">{reason.trim().length}/500</span>
              </div>
            </div>

            {/* Teacher picker (optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mời giáo viên (tuỳ chọn)</Label>
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedIds.size} đã chọn
                  </Badge>
                )}
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên / email"
                className="h-9"
              />
              <ScrollArea className="h-48 rounded-md border">
                {loadingTeachers ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-6">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-6">
                    Không tìm thấy giáo viên
                  </div>
                ) : (
                  <div className="divide-y">
                    {filtered.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggle(t.id)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox checked={selectedIds.has(t.id)} className="pointer-events-none" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{t.full_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {t.email ?? "—"}
                            {t.specialization && <span className="ml-2">• {t.specialization}</span>}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <p className="text-[11px] text-muted-foreground">
                Bỏ trống nếu chưa muốn gửi lời mời. Có thể mời sau từ tab Cấu hình.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={mutation.isPending}>
              <X className="h-4 w-4 mr-1" /> Đóng
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

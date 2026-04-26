import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserX, Loader2, Check, X, AlertTriangle, RotateCw, MailX } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@shared/components/ui/alert";

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

/** Per-teacher delivery result returned by `send-class-invitations` edge fn. */
interface DeliveryResult {
  teacher_id: string;
  ok: boolean;
  email?: string | null;
  full_name?: string | null;
  error?: string;
}

interface SendInvitesResponse {
  ok: boolean;
  stub?: boolean;
  queued: number;
  sent: number;
  failed: number;
  results: DeliveryResult[];
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
 *
 * Email failure handling: edge function trả per-teacher result. Nếu có GV
 * fail, dialog KHÔNG tự đóng — hiển thị banner liệt kê tên/lỗi và cho admin
 * retry chỉ cho subset thất bại.
 */
export default function RequestReplacementTeacherButton({ classId, className }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** Subset GV email gửi thất bại — set khi response của edge fn có failed > 0. */
  const [failedDeliveries, setFailedDeliveries] = useState<DeliveryResult[]>([]);
  const [retryingEmail, setRetryingEmail] = useState(false);

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

      // Gửi email mời nếu có teacher_ids — KHÔNG rollback nếu email fail.
      let emailResult: SendInvitesResponse | null = null;
      let emailTransportError: string | null = null;
      if (vars.teacherIds.length > 0) {
        const { data: emailData, error: emailErr } = await supabase.functions.invoke(
          "send-class-invitations",
          { body: { class_id: classId, teacher_ids: vars.teacherIds } },
        );
        if (emailErr) {
          // Lỗi transport (network / 5xx) — coi như TẤT CẢ fail.
          emailTransportError = emailErr.message ?? "Gọi edge function thất bại";
        } else {
          emailResult = emailData as SendInvitesResponse;
        }
      }
      return {
        rpc: data as { invitations_created?: number },
        email: emailResult,
        emailTransportError,
        attemptedTeacherIds: vars.teacherIds,
      };
    },
    onSuccess: ({ rpc, email, emailTransportError, attemptedTeacherIds }) => {
      const n = rpc?.invitations_created ?? 0;

      // Luôn invalidate vì RPC đã thành công (DB đã đổi).
      qc.invalidateQueries({ queryKey: ["admin-class-detail", classId] });
      qc.invalidateQueries({ queryKey: ["admin-classes-list"] });
      qc.invalidateQueries({ queryKey: ["admin-classes-counts"] });
      qc.invalidateQueries({ queryKey: ["class-status-history", classId] });
      qc.invalidateQueries({ queryKey: ["class-invitations", classId] });

      // ─── Trường hợp 1: không mời GV nào → chỉ thông báo đổi status ───
      if (attemptedTeacherIds.length === 0) {
        toast.success(`Đã chuyển sang "Tìm giáo viên mới"`);
        handleClose();
        return;
      }

      // ─── Trường hợp 2: edge function lỗi transport (toàn bộ fail) ───
      if (emailTransportError) {
        // Tạo synthetic failed list từ teacher data đã load.
        const synth: DeliveryResult[] = attemptedTeacherIds.map((tid) => {
          const t = teachers.find((x) => x.id === tid);
          return {
            teacher_id: tid,
            ok: false,
            full_name: t?.full_name ?? null,
            email: t?.email ?? null,
            error: emailTransportError!,
          };
        });
        setFailedDeliveries(synth);
        toast.error(
          `Đã tạo ${n} lời mời nhưng KHÔNG gửi được email — gọi lại từ banner trong dialog`,
          { duration: 8000 },
        );
        return;
      }

      // ─── Trường hợp 3: edge function trả per-teacher result ───
      const failed = email?.results.filter((r) => !r.ok) ?? [];
      const sent = email?.sent ?? 0;

      if (failed.length === 0) {
        toast.success(
          `Đã chuyển sang "Tìm giáo viên mới", tạo ${n} lời mời và gửi ${sent} email${
            email?.stub ? " (stub)" : ""
          }`,
        );
        handleClose();
        return;
      }

      // Có GV fail → giữ dialog mở, hiển thị banner.
      setFailedDeliveries(failed);
      const names = failed
        .map((f) => f.full_name ?? f.teacher_id.slice(0, 8))
        .slice(0, 3)
        .join(", ");
      const more = failed.length > 3 ? ` và ${failed.length - 3} GV khác` : "";
      toast.warning(
        `Đã tạo ${n} lời mời. Gửi email: ${sent} thành công, ${failed.length} thất bại (${names}${more})`,
        { duration: 9000 },
      );
    },
    onError: (err: Error) => {
      toast.error(`Lỗi: ${err.message}`);
    },
  });

  /** Gọi lại edge function chỉ cho subset GV thất bại. */
  const handleRetryFailed = async () => {
    if (failedDeliveries.length === 0) return;
    setRetryingEmail(true);
    try {
      const teacherIds = failedDeliveries.map((f) => f.teacher_id);
      const { data, error } = await supabase.functions.invoke(
        "send-class-invitations",
        { body: { class_id: classId, teacher_ids: teacherIds } },
      );
      if (error) {
        toast.error(`Gửi lại thất bại: ${error.message}`);
        return;
      }
      const res = data as SendInvitesResponse;
      const stillFailed = res.results.filter((r) => !r.ok);
      setFailedDeliveries(stillFailed);
      if (stillFailed.length === 0) {
        toast.success(`Đã gửi lại email cho ${res.sent} GV`);
        // Sau khi clear hết → đóng dialog.
        setTimeout(() => handleClose(), 500);
      } else {
        toast.warning(
          `Gửi lại: ${res.sent} thành công, vẫn còn ${stillFailed.length} GV thất bại`,
        );
      }
    } finally {
      setRetryingEmail(false);
    }
  };

  const handleClose = () => {
    if (mutation.isPending || retryingEmail) return;
    setOpen(false);
    setReason("");
    setReasonError(null);
    setSearch("");
    setSelectedIds(new Set());
    setFailedDeliveries([]);
  };

  const handleSubmit = () => {
    // Đang xem banner thất bại — chặn submit lại để admin dùng nút "Gửi lại".
    if (failedDeliveries.length > 0) return;
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
            {/* ─── Failed delivery banner (RPC đã OK, email fail) ─── */}
            {failedDeliveries.length > 0 && (
              <Alert variant="destructive" className="border-destructive/40">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  Email không gửi được cho {failedDeliveries.length} giáo viên
                  <Badge variant="outline" className="text-[10px] border-destructive/40">
                    RPC đã chuyển status
                  </Badge>
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p className="text-xs">
                    Lời mời <strong>đã được tạo trong DB</strong>, chỉ phần email
                    chưa gửi. Bạn có thể gửi lại hoặc đóng và liên hệ thủ công.
                  </p>
                  <ScrollArea className="max-h-32 rounded border border-destructive/30 bg-destructive/5">
                    <ul className="divide-y divide-destructive/20">
                      {failedDeliveries.map((f) => (
                        <li
                          key={f.teacher_id}
                          className="flex items-start gap-2 px-2 py-1.5 text-[11px]"
                        >
                          <MailX className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {f.full_name ?? f.teacher_id.slice(0, 8)}
                              {f.email && (
                                <span className="ml-1.5 font-normal text-muted-foreground">
                                  ({f.email})
                                </span>
                              )}
                            </p>
                            <p className="text-destructive/80 truncate">
                              {f.error ?? "Không rõ lỗi"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRetryFailed}
                    disabled={retryingEmail}
                    className="h-7 gap-1.5 text-[11px]"
                  >
                    {retryingEmail ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCw className="h-3 w-3" />
                    )}
                    Gửi lại email cho {failedDeliveries.length} GV
                  </Button>
                </AlertDescription>
              </Alert>
            )}

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
                disabled={mutation.isPending || failedDeliveries.length > 0}
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className={reasonError ? "text-destructive" : "text-muted-foreground"}>
                  {reasonError ?? "Tối thiểu 10 ký tự"}
                </span>
                <span className="text-muted-foreground">{reason.trim().length}/500</span>
              </div>
            </div>

            {/* Teacher picker (optional) */}
            <div className="space-y-2" aria-disabled={failedDeliveries.length > 0}>
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
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={mutation.isPending || retryingEmail}
            >
              <X className="h-4 w-4 mr-1" />
              {failedDeliveries.length > 0 ? "Đóng (bỏ qua email lỗi)" : "Đóng"}
            </Button>
            {failedDeliveries.length === 0 && (
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Xác nhận
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

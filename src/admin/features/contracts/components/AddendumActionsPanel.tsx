import { useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@shared/components/ui/dialog";
import {
  FileDown, FileSignature, RefreshCw, Send, XCircle, Edit3, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminSignAddendum, renderAddendumPdf, requestAddendumRevision,
  sendAddendumToTeacher, terminateAddendum,
} from "../hooks/useAddendums";
import { getStorageSignedUrl, uploadSignatureImage } from "./../hooks/useContracts";
import SignatureCanvas from "./SignatureCanvas";
import type { AddendumWithDetails } from "../types";

interface Props {
  addendum: AddendumWithDetails;
  onMutated: () => void;
}

export default function AddendumActionsPanel({ addendum, onMutated }: Props) {
  const [busy, setBusy] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [terminateReason, setTerminateReason] = useState("");
  const [signOpen, setSignOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState("");

  const status = addendum.status;
  const canSendToTeacher = status === "draft" || status === "revision_requested";
  const canRequestRevision = status === "awaiting_teacher" || status === "awaiting_admin";
  const canAdminSign = status === "awaiting_admin";
  const canTerminate = status !== "terminated" && status !== "superseded";

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setBusy(false);
    }
  };

  const onSend = async () => {
    if (addendum.pay_rates.length === 0) {
      toast.error("Phải có ít nhất 1 dòng thù lao trước khi gửi");
      return;
    }
    await wrap("Đã gửi phụ lục cho giáo viên", () =>
      sendAddendumToTeacher(addendum.id, sendMessage || undefined),
    );
    setSendMessage("");
  };

  const onRequestRevision = () =>
    wrap("Đã chuyển sang trạng thái yêu cầu sửa", () =>
      requestAddendumRevision(addendum.id, revisionMessage || "Vui lòng kiểm tra lại"),
    );

  const onTerminate = () =>
    wrap("Phụ lục đã được chấm dứt", () =>
      terminateAddendum(addendum.id, terminateReason || "Chấm dứt"),
    );

  const onAdminSign = async () => {
    if (!signatureDataUrl) {
      toast.error("Chưa có chữ ký");
      return;
    }
    const base64 = signatureDataUrl.split(",")[1];
    setBusy(true);
    try {
      const { path } = await uploadSignatureImage(base64, "self");
      await adminSignAddendum(addendum.id, path);
      toast.success("Đã ký — phụ lục có hiệu lực");
      setSignOpen(false);
      setSignatureDataUrl(null);
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi ký");
    } finally {
      setBusy(false);
    }
  };

  const onRenderPdf = async () => {
    setBusy(true);
    try {
      const res = await renderAddendumPdf(addendum.id);
      toast.success("Đã render PDF");
      if (res.signed_url) window.open(res.signed_url, "_blank");
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Render PDF lỗi");
    } finally {
      setBusy(false);
    }
  };

  const onDownloadPdf = async () => {
    if (!addendum.pdf_storage_path) {
      toast.error("Chưa có PDF — bấm Render PDF trước");
      return;
    }
    const url = await getStorageSignedUrl(addendum.pdf_storage_path, 600);
    if (!url) {
      toast.error("Không tạo được link tải");
      return;
    }
    window.open(url, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hành động</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {canSendToTeacher && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full justify-start" variant="default" disabled={busy}>
                <Send className="h-4 w-4 mr-2" /> Gửi cho giáo viên
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gửi phụ lục cho giáo viên</DialogTitle>
                <DialogDescription>
                  Phụ lục sẽ chuyển sang trạng thái Chờ giáo viên ký. Email thông báo sẽ được gửi.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Lời nhắn cho giáo viên (tùy chọn)…"
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
              />
              <DialogFooter>
                <Button onClick={onSend} disabled={busy}>
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Xác nhận gửi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canAdminSign && (
          <Dialog open={signOpen} onOpenChange={setSignOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start" variant="default" disabled={busy}>
                <FileSignature className="h-4 w-4 mr-2" /> Ký phụ lục (Bên A)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ký phụ lục</DialogTitle>
                <DialogDescription>
                  Vẽ chữ ký bên dưới hoặc dùng chữ ký đã lưu trong cài đặt.
                  Sau khi ký, phụ lục sẽ chuyển sang Đang hiệu lực.
                  {addendum.auto_archive_on_activate ? (
                    <span className="block mt-2 text-orange-700">
                      Lưu ý: Cờ "Tự thay thế phụ lục cũ" đang bật — các phụ lục đang hiệu lực khác
                      của hợp đồng sẽ tự động chuyển sang Đã thay thế.
                    </span>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              <SignatureCanvas onChange={setSignatureDataUrl} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setSignOpen(false)}>Hủy</Button>
                <Button onClick={onAdminSign} disabled={busy || !signatureDataUrl}>
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Xác nhận ký
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canRequestRevision && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start" disabled={busy}>
                <Edit3 className="h-4 w-4 mr-2" /> Yêu cầu sửa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Yêu cầu sửa phụ lục</AlertDialogTitle>
                <AlertDialogDescription>
                  Phụ lục sẽ chuyển sang trạng thái Đang sửa. Các chữ ký đã có sẽ được lưu trữ
                  và cần ký lại sau khi cập nhật.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                placeholder="Ghi chú yêu cầu sửa…"
                value={revisionMessage}
                onChange={(e) => setRevisionMessage(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={onRequestRevision}>Xác nhận</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <div className="pt-2 space-y-2 border-t border-border/40">
          <Button variant="outline" className="w-full justify-start" onClick={onRenderPdf} disabled={busy}>
            <RefreshCw className="h-4 w-4 mr-2" /> Render PDF
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onDownloadPdf}
            disabled={!addendum.pdf_storage_path}
          >
            <FileDown className="h-4 w-4 mr-2" /> Tải PDF đã ký
          </Button>
        </div>

        {canTerminate && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={busy}
              >
                <XCircle className="h-4 w-4 mr-2" /> Chấm dứt phụ lục
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Chấm dứt phụ lục</AlertDialogTitle>
                <AlertDialogDescription>
                  Phụ lục sẽ chuyển sang Đã chấm dứt và không thể chỉnh sửa thêm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                placeholder="Lý do chấm dứt…"
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={onTerminate}>Xác nhận chấm dứt</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}

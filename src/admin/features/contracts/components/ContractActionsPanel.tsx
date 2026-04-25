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
  FileDown, FileSignature, RefreshCw, Send, XCircle, Edit3, Loader2, FilePenLine,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminSignContract, getStorageSignedUrl, renderContractPdf,
  requestResign, requestRevision, sendContractToTeacher, terminateContract,
  uploadSignatureImage,
} from "../hooks/useContracts";
import SignatureCanvas from "./SignatureCanvas";
import { type ContractRow } from "../types";

interface Props {
  contract: ContractRow;
  onMutated: () => void;
}

export default function ContractActionsPanel({ contract, onMutated }: Props) {
  const [busy, setBusy] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [terminateReason, setTerminateReason] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  const status = contract.status;
  const canSendToTeacher = status === "draft" || status === "revision_requested";
  const canRequestRevision = status === "awaiting_teacher" || status === "awaiting_admin";
  const canRequestResign = status === "revision_requested" || status === "awaiting_admin";
  const canAdminSign = status === "awaiting_admin";
  const canTerminate = status !== "terminated" && status !== "expired";

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

  const onSend = () => wrap("Đã gửi hợp đồng cho giáo viên", () => sendContractToTeacher(contract.id));
  const onRequestRevision = () =>
    wrap("Đã chuyển sang trạng thái yêu cầu sửa", () =>
      requestRevision(contract.id, revisionMessage || "Vui lòng kiểm tra lại"),
    );
  const onRequestResign = () =>
    wrap("Đã yêu cầu giáo viên ký lại", () =>
      requestResign(contract.id),
    );
  const onTerminate = () =>
    wrap("Hợp đồng đã được chấm dứt", () =>
      terminateContract(contract.id, terminateReason || "Chấm dứt"),
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
      await adminSignContract(contract.id, path);
      toast.success("Đã ký — hợp đồng chuyển sang Đang hoạt động");
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
      const res = await renderContractPdf(contract.id);
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
    if (!contract.pdf_storage_path) {
      toast.error("Chưa có PDF — bấm Render PDF trước");
      return;
    }
    const url = await getStorageSignedUrl(contract.pdf_storage_path, 600);
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
          <Button className="w-full justify-start" variant="default" onClick={onSend} disabled={busy}>
            <Send className="h-4 w-4 mr-2" />
            Gửi cho giáo viên
          </Button>
        )}

        {canAdminSign && (
          <Dialog open={signOpen} onOpenChange={setSignOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start" variant="default" disabled={busy}>
                <FileSignature className="h-4 w-4 mr-2" />
                Ký hợp đồng (Bên A)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ký hợp đồng</DialogTitle>
                <DialogDescription>
                  Vẽ chữ ký bên dưới hoặc dùng chữ ký đã lưu trong cài đặt của bạn.
                  Sau khi ký, hợp đồng sẽ chuyển sang trạng thái Đang hoạt động.
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
                <Edit3 className="h-4 w-4 mr-2" />
                Yêu cầu sửa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Yêu cầu sửa hợp đồng</AlertDialogTitle>
                <AlertDialogDescription>
                  Hợp đồng sẽ chuyển sang trạng thái Đang sửa. Giáo viên sẽ nhận thông báo.
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

        {canRequestResign && (
          <Button variant="outline" className="w-full justify-start" onClick={onRequestResign} disabled={busy}>
            <FilePenLine className="h-4 w-4 mr-2" />
            Yêu cầu giáo viên ký lại
          </Button>
        )}

        <div className="pt-2 space-y-2 border-t border-border/40">
          <Button variant="outline" className="w-full justify-start" onClick={onRenderPdf} disabled={busy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Render PDF
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={onDownloadPdf} disabled={!contract.pdf_storage_path}>
            <FileDown className="h-4 w-4 mr-2" />
            Tải PDF đã ký
          </Button>
        </div>

        {canTerminate && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy}>
                <XCircle className="h-4 w-4 mr-2" />
                Chấm dứt hợp đồng
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Chấm dứt hợp đồng</AlertDialogTitle>
                <AlertDialogDescription>
                  Hợp đồng sẽ chuyển sang trạng thái Đã chấm dứt và không thể chỉnh sửa thêm.
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

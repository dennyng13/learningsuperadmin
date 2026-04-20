import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

/**
 * Cảnh báo trước khi học sinh làm lại bài đã hoàn thành.
 * Chỉ dùng khi bài cho phép làm lại (allow_retake = true).
 */
export default function RetakeWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Bạn muốn làm lại bài này?",
  description = "Kết quả lần làm lại này sẽ thay thế kết quả cũ trong bảng Performance (chỉ giữ điểm CAO NHẤT). Lịch sử các lần làm vẫn được lưu để xem lại.",
  confirmLabel = "Làm lại",
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

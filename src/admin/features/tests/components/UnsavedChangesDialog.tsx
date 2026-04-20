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
import { Save, Trash2, ArrowLeft } from "lucide-react";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndExit: () => void;
  onDiscard: () => void;
  saving?: boolean;
}

export default function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSaveAndExit,
  onDiscard,
  saving,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Thay đổi chưa lưu</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Lưu nháp trước khi thoát?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2 w-full">
            <AlertDialogAction
              onClick={onDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 text-xs h-9 flex-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Bỏ
            </AlertDialogAction>
            <AlertDialogAction
              onClick={onSaveAndExit}
              disabled={saving}
              className="gap-1.5 text-xs h-9 flex-1"
            >
              <Save className="h-3.5 w-3.5" /> Lưu & Thoát
            </AlertDialogAction>
          </div>
          <AlertDialogCancel className="gap-1.5 text-xs h-9 w-full mt-0">
            <ArrowLeft className="h-3.5 w-3.5" /> Tiếp tục sửa
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

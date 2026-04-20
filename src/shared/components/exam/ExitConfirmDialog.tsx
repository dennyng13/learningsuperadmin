import { Button } from "@shared/components/ui/button";
import { LogOut } from "lucide-react";
import { useIsMobile } from "@shared/hooks/use-mobile";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@shared/components/ui/drawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@shared/components/ui/dialog";

interface ExitConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExitConfirmDialog({ open, onClose, onConfirm }: ExitConfirmDialogProps) {
  const isMobile = useIsMobile();

  const content = (
    <>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
          <LogOut className="h-5 w-5 text-accent" />
        </div>
        <span className="font-display text-lg font-bold">Thoát bài thi?</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Bạn có chắc muốn thoát? Toàn bộ tiến trình làm bài sẽ bị mất và không thể khôi phục.
      </p>
    </>
  );

  const actions = (
    <div className="flex gap-3 w-full">
      <Button variant="outline" className="flex-1 text-sm" onClick={onClose}>
        Tiếp tục làm bài
      </Button>
      <Button variant="destructive" className="flex-1 text-sm" onClick={onConfirm}>
        Thoát
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="sr-only">Thoát bài thi</DrawerTitle>
            <DrawerDescription className="sr-only">Xác nhận thoát bài thi</DrawerDescription>
            {content}
          </DrawerHeader>
          <DrawerFooter>
            {actions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Thoát bài thi</DialogTitle>
          <DialogDescription className="sr-only">Xác nhận thoát bài thi</DialogDescription>
          {content}
        </DialogHeader>
        <DialogFooter>
          {actions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

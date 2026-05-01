import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";

/**
 * DialogPop — sticker-pop variant of shadcn Dialog.
 *
 * Inherits Radix Dialog behavior (overlay, focus trap, animation, Escape key).
 * Adds sticker-pop styling: 2.5px ink border, rounded-pop-lg, shadow-pop-lg.
 *
 * Usage:
 *   <DialogPop open={open} onOpenChange={setOpen}>
 *     <DialogPopContent size="md" tone="destructive">
 *       <DialogPopHeader>
 *         <DialogPopTitle>Lưu trữ?</DialogPopTitle>
 *         <DialogPopDescription>Lớp sẽ ẩn khỏi danh sách...</DialogPopDescription>
 *       </DialogPopHeader>
 *       <DialogPopFooter>
 *         <PopButton tone="white">Hủy</PopButton>
 *         <PopButton tone="coral">Lưu trữ</PopButton>
 *       </DialogPopFooter>
 *     </DialogPopContent>
 *   </DialogPop>
 */

const DialogPop = DialogPrimitive.Root;
const DialogPopTrigger = DialogPrimitive.Trigger;
const DialogPopPortal = DialogPrimitive.Portal;
const DialogPopClose = DialogPrimitive.Close;

const DialogPopOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-lp-ink/40 backdrop-blur-[1px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogPopOverlay.displayName = "DialogPopOverlay";

const dialogPopContentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-3 bg-white p-6 duration-200 " +
    "rounded-pop-lg shadow-pop-lg " +
    "data-[state=open]:animate-in data-[state=closed]:animate-out " +
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 " +
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] " +
    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-lg",
        lg: "max-w-2xl",
      },
      tone: {
        default:     "border-[2.5px] border-lp-ink",
        destructive: "border-[2.5px] border-lp-coral",
        success:     "border-[2.5px] border-[var(--lp-mint)]",
      },
    },
    defaultVariants: { size: "md", tone: "default" },
  },
);

export interface DialogPopContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogPopContentVariants> {
  /** Hide the X close button in top-right */
  hideClose?: boolean;
}

const DialogPopContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogPopContentProps
>(({ className, size, tone, hideClose, children, ...props }, ref) => (
  <DialogPopPortal>
    <DialogPopOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogPopContentVariants({ size, tone }), className)}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            "absolute right-3 top-3 inline-flex items-center justify-center h-8 w-8 rounded-pop",
            "border-[1.5px] border-lp-ink/30 bg-white text-lp-ink",
            "transition-all duration-150",
            "hover:bg-lp-yellow/30 hover:border-lp-ink",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-lp-coral focus-visible:ring-offset-2",
            "disabled:pointer-events-none",
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPopPortal>
));
DialogPopContent.displayName = "DialogPopContent";

const DialogPopHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-1.5 text-left pr-8", className)}
    {...props}
  />
);
DialogPopHeader.displayName = "DialogPopHeader";

const DialogPopFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 mt-2 pt-3 border-t-[2px] border-lp-ink/15",
      className,
    )}
    {...props}
  />
);
DialogPopFooter.displayName = "DialogPopFooter";

const DialogPopTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-display text-lg font-extrabold leading-tight tracking-tight text-lp-ink",
      className,
    )}
    {...props}
  />
));
DialogPopTitle.displayName = "DialogPopTitle";

const DialogPopDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-lp-body font-body", className)}
    {...props}
  />
));
DialogPopDescription.displayName = "DialogPopDescription";

export {
  DialogPop,
  DialogPopTrigger,
  DialogPopPortal,
  DialogPopClose,
  DialogPopOverlay,
  DialogPopContent,
  DialogPopHeader,
  DialogPopFooter,
  DialogPopTitle,
  DialogPopDescription,
};

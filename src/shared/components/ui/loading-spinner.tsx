import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@shared/lib/utils";

const MESSAGES = [
  "Đang tải nè, chờ xíu nha!",
  "Max đang chạy lấy dữ liệu cho bạn...",
  "Kiên nhẫn là chìa khóa thành công!",
  "Đừng bỏ cuộc, sắp xong rồi!",
  "Loading xong là chiến tiếp nha!",
  "Mỗi ngày một bước, band cao không xa!",
  "Cố lên, Max tin bạn làm được!",
  "Đang chuẩn bị bài học thú vị cho bạn...",
  "Bạn giỏi lắm, tiếp tục nha!",
  "Chờ tí, Max đang pha trà cho bạn...",
  "Ôn bài mỗi ngày, IELTS sẽ okay!",
  "Bạn đã rất nỗ lực rồi đó!",
  "Max tự hào về bạn lắm!",
  "Thành công đến từ sự kiên trì!",
  "Học tí, nghỉ tí, nhưng đừng bỏ nha!",
];

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showMessage?: boolean;
}

export default function LoadingSpinner({
  className,
  size = "md",
  showMessage = true,
}: LoadingSpinnerProps) {
  const message = useMemo(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    []
  );

  const iconSize = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-7 w-7";

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}>
      <Loader2 className={cn(iconSize, "animate-spin text-primary")} />
      {showMessage && (
        <p className="text-xs text-muted-foreground font-medium animate-pulse text-center max-w-[220px]">
          {message}
        </p>
      )}
    </div>
  );
}

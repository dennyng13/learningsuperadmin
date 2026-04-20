import { useEffect, useState, useRef } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { toast } from "@shared/hooks/use-toast";

const OfflineFallback = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const wasOffline = useRef(false);

  useEffect(() => {
    const goOffline = () => { setIsOffline(true); wasOffline.current = true; };
    const goOnline = () => {
      setIsOffline(false);
      if (wasOffline.current) {
        toast({ title: "Đã kết nối lại", description: "Kết nối mạng đã được khôi phục." });
        wasOffline.current = false;
      }
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Không có kết nối mạng</h2>
        <p className="text-sm text-muted-foreground">
          Vui lòng kiểm tra kết nối Internet của bạn rồi thử lại.
        </p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </Button>
      </div>
    </div>
  );
};

export default OfflineFallback;

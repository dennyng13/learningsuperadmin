import { useState, useEffect, useCallback } from "react";
import { Trophy, Flame, Target, Crown, Zap, X } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";
import mascotCheer from "@/assets/mascot-cheer.png";

const MOTIVATIONAL_MESSAGES = [
  { title:"Sẵn sàng chinh phục!", body:"Hãy chơi thật tốt để leo lên bảng xếp hạng! Vị trí Top 3 đang chờ bạn!", icon: Trophy, accent:"from-amber-500 to-yellow-500"},
  { title:"Đua top nào!", body:"Mỗi điểm đều quan trọng! Chiến thắng liên tiếp để nhân đôi combo và vượt mặt đối thủ!", icon: Flame, accent:"from-orange-500 to-red-500"},
  { title:"Chinh phục đỉnh cao!", body:"Bạn có thể giành vị trí số 1! Tập trung, gõ nhanh và chính xác để ghi điểm tối đa!", icon: Target, accent:"from-primary to-accent"},
  { title:"Vương miện đang chờ!", body:"Top 3 sẽ nhận huy hiệu đặc biệt! Hãy luyện tập và giành lấy vị trí xứng đáng!", icon: Crown, accent:"from-violet-500 to-purple-500"},
  { title:"Bứt phá thứ hạng!", body:"Combo càng cao, điểm càng nhiều! Giữ nhịp và đánh bại kỷ lục cá nhân ngay hôm nay!", icon: Zap, accent:"from-blue-500 to-cyan-500"},
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GameMotivationPopup({ open, onClose }: Props) {
  const [msg] = useState(() => MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  if (!open) return null;

  const Icon = msg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      {/* backdrop */}
      <div className={cn(
        "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
        animateIn ? "opacity-100" : "opacity-0"
      )} />

      {/* card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative bg-card border rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transition-all duration-300",
          animateIn ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-4"
        )}
      >
        {/* close btn */}
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* gradient header */}
        <div className={cn("bg-gradient-to-br p-6 pb-10 text-white text-center relative", msg.accent)}>
          {/* decorative circles */}
          <div className="absolute top-2 left-4 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute bottom-2 right-6 w-10 h-10 rounded-full bg-white/10" />
          <div className="absolute top-1/2 right-1/4 w-6 h-6 rounded-full bg-white/5" />

          <div className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-3 transition-transform",
            animateIn && "animate-bounce"
          )}>
            <Icon className="h-8 w-8 text-white drop-shadow" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight drop-shadow">{msg.title}</h2>
        </div>

        {/* body */}
        <div className="px-6 -mt-4 relative">
          <div className="bg-card border rounded-2xl p-4 shadow-sm flex gap-3 items-start">
            <img src={mascotCheer} alt="" className="w-12 h-12 flex-shrink-0 animate-float" />
            <p className="text-sm text-foreground leading-relaxed font-medium">{msg.body}</p>
          </div>
        </div>

        {/* tips */}
        <div className="px-6 pt-3 pb-2">
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-1 rounded-full"> Combo = x2 điểm</span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-1 rounded-full"> Nhanh = thêm điểm</span>
            <span className="text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2.5 py-1 rounded-full"> Top 3 = huy hiệu</span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-3">
          <Button onClick={handleClose} className="w-full h-12 text-base font-bold rounded-xl gap-2 shadow-md">
            <Flame className="h-5 w-5" />
            Chiến thôi!
          </Button>
        </div>
      </div>
    </div>
  );
}

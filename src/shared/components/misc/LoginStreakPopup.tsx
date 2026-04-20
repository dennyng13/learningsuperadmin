import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fireConfetti } from "@shared/utils/confetti";
import { Flame, X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import mascotHero from "@/assets/mascot-hero.png";
import mascotHappy from "@/assets/mascot-happy.png";
import mascotCheer from "@/assets/mascot-cheer.png";
import mascotThumbsup from "@/assets/mascot-thumbsup.png";

const STREAK_SHOWN_KEY = "streak_popup_date";

const MASCOTS = [mascotHero, mascotHappy, mascotCheer, mascotThumbsup];

const MESSAGES = [
  "Tuyệt vời! Hãy tiếp tục phát huy nhé!",
  "Bạn thật kiên trì! Cứ tiếp tục thôi!",
  "Mỗi ngày một bước, bạn sẽ đạt mục tiêu!",
  "Cố lên! Consistency is the key!",
  "Xuất sắc! Đừng dừng lại nhé!",
  "Hôm nay bạn lại giỏi hơn hôm qua rồi!",
  "Chăm chỉ hôm nay, thành công ngày mai!",
  "Bạn đang trên con đường chinh phục IELTS!",
  "Không ai thành công mà không kiên trì!",
  "Hãy tự hào vì bạn không bỏ cuộc!",
  "Practice makes perfect! Bạn làm tốt lắm!",
  "Đầu tư cho bản thân là khoản đầu tư sinh lời nhất!",
  "Mỗi phút luyện tập đều đưa bạn gần hơn band mong muốn!",
  "Thành công là tổng của những nỗ lực nhỏ mỗi ngày!",
  "Bạn đã chọn con đường đúng — hãy tiếp bước!",
  "Người thành công không bao giờ bỏ cuộc!",
  "Một ngày không học là một ngày lãng phí! ⏳",
  "Hãy biến ước mơ IELTS thành hiện thực!",
  "Bạn mạnh mẽ hơn bạn nghĩ! Keep going!",
  "Kỷ luật hôm nay, tự do ngày mai!",
  "Ngày mới, cơ hội mới, quyết tâm mới!",
  "Học mỗi ngày một chút — tích tiểu thành đại!",
  "Bạn không đơn độc — cả đội đang cổ vũ bạn!",
  "Hành trình vạn dặm bắt đầu từ một bước chân!",
  "Đừng so sánh với người khác, hãy giỏi hơn chính mình hôm qua!",
  "Success is built one day at a time!",
  "Bạn xứng đáng với điểm số mơ ước!",
  "Nỗ lực không bao giờ phản bội bạn!",
  "Keep calm and study IELTS!",
  "Bạn đang tạo nên phiên bản tốt nhất của chính mình!",
  "Đỉnh núi nào cũng chinh phục được nếu bạn kiên trì!",
];

function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let check = new Date(today);
  const todayStr = check.toISOString().split("T")[0];
  if (!sorted.includes(todayStr)) check.setDate(check.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const ds = check.toISOString().split("T")[0];
    if (sorted.includes(ds)) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

export default function LoginStreakPopup() {
  const [show, setShow] = useState(false);
  const [streak, setStreak] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (sessionStorage.getItem(STREAK_SHOWN_KEY) === todayStr) return;

    const tryShow = async () => {
      // Wait for onboarding / spotlight tutorials to finish
      const onboardingDone = localStorage.getItem("onboarding_completed");
      const spotlightActive = document.querySelector('[data-spotlight-overlay]');
      if (!onboardingDone || spotlightActive) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("activity_log").upsert(
        { user_id: user.id, activity_date: todayStr, time_minutes: 0 },
        { onConflict: "user_id,activity_date" }
      );

      const { data } = await supabase
        .from("activity_log")
        .select("activity_date")
        .eq("user_id", user.id)
        .order("activity_date", { ascending: false })
        .limit(400);

      if (!data) return;
      const s = getStreak(data.map(d => d.activity_date));
      if (s < 1) return;

      setStreak(s);
      setShow(true);
      sessionStorage.setItem(STREAK_SHOWN_KEY, todayStr);
      if (s >= 3) fireConfetti(3000);
    };

    // Try immediately, and also retry when a tutorial is dismissed
    tryShow();
    const onDismiss = () => setTimeout(tryShow, 500);
    window.addEventListener("tutorial-dismissed", onDismiss);
    return () => window.removeEventListener("tutorial-dismissed", onDismiss);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  const message = MESSAGES[streak % MESSAGES.length];
  const mascot = MASCOTS[streak % MASCOTS.length];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          "relative bg-card border rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center z-10",
          closing ? "animate-scale-out" : "animate-enter"
        )}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Mascot image */}
        <img
          src={mascot}
          alt="Max mascot"
          className="w-28 h-28 object-contain mx-auto -mt-2 mb-2 drop-shadow-md"
        />

        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Flame className="h-5 w-5 text-orange-500" />
          <h2 className="font-display text-xl font-extrabold">
            Chúc mừng!
          </h2>
          <Flame className="h-5 w-5 text-orange-500" />
        </div>
        <p className="text-3xl font-black text-primary mb-2">
          {streak} ngày liên tục
        </p>
        <p className="text-sm text-muted-foreground mb-5">
          {message}
        </p>

        <button
          onClick={handleClose}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Tiếp tục học! 
        </button>
      </div>
    </div>
  );
}

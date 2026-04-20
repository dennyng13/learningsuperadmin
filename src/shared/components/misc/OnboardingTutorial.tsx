import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import mascotHero from "@/assets/mascot-hero.png";
import mascotReading from "@/assets/mascot-reading.png";
import mascotThumbsup from "@/assets/mascot-thumbsup.png";
import mascotCheer from "@/assets/mascot-cheer.png";
import mascotStudy from "@/assets/mascot-study.png";
import mascotShy from "@/assets/mascot-shy.png";

const ONBOARDING_KEY = "onboarding_completed";

interface Step {
  title: string;
  description: string;
  mascot: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    title:"Chào mừng đến Learning Plus!",
    description:
      "Mình là Max — mascot của Learning Plus! Mình sẽ đồng hành cùng bạn trong hành trình chinh phục IELTS nhé. Hãy để mình giới thiệu nhanh nền tảng này cho bạn!",
    mascot: mascotHero,
    accent: "from-primary/15 via-accent/5",
  },
  {
    title:"Hub — Trung tâm của bạn",
    description:
      "Đây là trang chủ của bạn! Tại đây bạn có thể xem tiến trình học, streak hàng ngày, lịch ôn tập và thiết lập mục tiêu IELTS. Hãy ghé thăm mỗi ngày để duy trì chuỗi ngày học nhé!",
    mascot: mascotReading,
    accent: "from-blue-500/10 via-blue-300/5",
  },
  {
    title:"Mock Tests — Luyện đề thực chiến",
    description:
      "Ôn luyện với các đề thi IELTS đầy đủ 4 kỹ năng: Reading, Listening, Writing và Speaking. Làm bài giống như thi thật để quen với áp lực thời gian!",
    mascot: mascotStudy,
    accent: "from-amber-500/10 via-orange-300/5",
  },
  {
    title:"Practice — Luyện tập theo dạng bài",
    description:
      "Luyện tập chuyên sâu từng dạng câu hỏi: True/False/Not Given, Matching, Summary Completion... Hệ thống sẽ chấm điểm và giải thích đáp án chi tiết cho bạn!",
    mascot: mascotShy,
    accent: "from-emerald-500/10 via-green-300/5",
  },
  {
    title:"Vocabulary — Mở rộng từ vựng",
    description:
      "Học từ vựng bằng flashcard thông minh với hệ thống lặp lại giãn cách (Spaced Repetition). Bạn cũng có thể chơi mini-game từ vựng để ghi nhớ tốt hơn!",
    mascot: mascotCheer,
    accent: "from-purple-500/10 via-violet-300/5",
  },
  {
    title:"Sẵn sàng chinh phục IELTS!",
    description:
      "Bạn đã sẵn sàng rồi! Hãy bắt đầu bằng việc thiết lập mục tiêu band điểm tại Hub. Nhớ học mỗi ngày để giữ streak nhé — mỗi ngày một chút, tích tiểu thành đại!",
    mascot: mascotThumbsup,
    accent: "from-primary/15 via-accent/10",
  },
];

export default function OnboardingTutorial() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    const timer = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard support
  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, step]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setShow(false);
      localStorage.setItem(ONBOARDING_KEY, "true");
      window.dispatchEvent(new Event("tutorial-dismissed"));
    }, 300);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setDirection("next");
      setStep(step + 1);
    } else handleClose();
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection("prev");
      setStep(step - 1);
    }
  };

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div
        className={cn(
          "relative bg-card border rounded-2xl shadow-2xl max-w-sm w-full z-10 overflow-hidden",
          closing ? "animate-scale-out" : "animate-enter"
        )}
      >
        {/* Skip button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground z-10"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header gradient with mascot */}
        <div className={cn("bg-gradient-to-br to-transparent pt-8 pb-4 px-6 flex flex-col items-center", current.accent)}>
          <div className="relative">
            <img
              src={current.mascot}
              alt="Max mascot"
              className={cn(
                "w-28 h-28 object-contain drop-shadow-lg",
                direction === "next"
                  ? "animate-in fade-in slide-in-from-right-4 duration-400"
                  : "animate-in fade-in slide-in-from-left-4 duration-400"
              )}
              key={step}
            />
            {/* Step number badge */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
              {step + 1}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-5 pt-3 text-center">
          <h2
            key={`title-${step}`}
            className={cn(
              "font-display text-lg font-extrabold mb-2",
              direction === "next"
                ? "animate-in fade-in slide-in-from-right-2 duration-300"
                : "animate-in fade-in slide-in-from-left-2 duration-300"
            )}
          >
            {current.title}
          </h2>
          <p
            key={`desc-${step}`}
            className={cn(
              "text-sm text-muted-foreground leading-relaxed mb-5",
              direction === "next"
                ? "animate-in fade-in slide-in-from-right-2 duration-300 delay-75"
                : "animate-in fade-in slide-in-from-left-2 duration-300 delay-75"
            )}
          >
            {current.description}
          </p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > step ? "next" : "prev");
                  setStep(i);
                }}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 h-2 bg-primary"
                    : i < step
                      ? "w-2 h-2 bg-primary/40 hover:bg-primary/60"
                      : "w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev} className="rounded-xl">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className="rounded-xl flex-1"
            >
              {isLast ?"Bắt đầu học!":"Tiếp theo"}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>

          {step === 0 && (
            <button
              onClick={handleClose}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Bỏ qua hướng dẫn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@shared/lib/utils";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";

export interface SpotlightStep {
  target: string;
  title: string;
  description: string;
  mascot?: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface SpotlightTutorialProps {
  storageKey: string;
  steps: SpotlightStep[];
  delay?: number;
}

export default function SpotlightTutorial({ storageKey, steps, delay = 800 }: SpotlightTutorialProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [animRect, setAnimRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(storageKey));

  // Auto-show on first visit
  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const check = () => !!localStorage.getItem("onboarding_completed");
    if (!check()) {
      const interval = setInterval(() => {
        if (check()) {
          clearInterval(interval);
          setTimeout(() => setShow(true), delay);
        }
      }, 500);
      return () => clearInterval(interval);
    }
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [storageKey, delay]);

  const measureTarget = useCallback(() => {
    if (!show || step >= steps.length) return;
    const el = document.querySelector(steps[step].target);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "instant" });
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      });
    } else {
      setRect(null);
    }
  }, [show, step, steps]);

  // Prevent background scroll
  useEffect(() => {
    if (!show) return;
    const preventScroll = (e: TouchEvent) => {
      const overlay = document.querySelector('[data-spotlight-overlay]');
      if (overlay && overlay.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [show]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    return () => window.removeEventListener("resize", measureTarget);
  }, [measureTarget]);

  // Animate rect
  useEffect(() => {
    if (!rect) { setAnimRect(null); return; }
    const target = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    if (!animRect) { setAnimRect(target); return; }
    setTransitioning(true);
    setAnimRect(target);
    const timer = setTimeout(() => setTransitioning(false), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect]);

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

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setShow(false);
      setClosing(false);
      setDismissed(true);
      localStorage.setItem(storageKey, "true");
      window.dispatchEvent(new Event("tutorial-dismissed"));
    }, 350);
  }, [storageKey]);

  const handleReplay = useCallback(() => {
    setStep(0);
    setAnimRect(null);
    setClosing(false);
    setShow(true);
  }, []);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setTransitioning(true);
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setTransitioning(true);
      setStep(step - 1);
    }
  };

  // Floating replay button when tutorial was dismissed
  if (!show && dismissed && steps.length > 0) {
    return (
      <button
        onClick={handleReplay}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-lg backdrop-blur-sm transition-all hover:scale-110 animate-in fade-in zoom-in-75 duration-300"
        aria-label="Xem lại hướng dẫn"
        title="Xem lại hướng dẫn"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    );
  }

  if (!show || steps.length === 0) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const pad = 8;
  const ar = animRect;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!ar) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", position: "fixed" };
    const placement = current.placement || "bottom";
    const margin = 16;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const base: React.CSSProperties = {
      maxWidth: "min(360px, 90vw)",
      position: "fixed" as const,
      transition: "top 0.4s cubic-bezier(.4,0,.2,1), bottom 0.4s cubic-bezier(.4,0,.2,1), left 0.4s cubic-bezier(.4,0,.2,1)",
    };

    const targetBottom = ar.top + ar.height + pad * 2 + margin;
    const spaceAbove = ar.top - pad - margin;
    const isMobile = vw < 640;
    const centerX = Math.max(margin, Math.min(vw - margin, ar.left + ar.width / 2));

    if (isMobile) {
      if (placement === "top" && spaceAbove > 200) {
        return { ...base, bottom: vh - ar.top + pad + margin, left: vw / 2, transform: "translateX(-50%)" };
      }
      const spaceBelow = vh - targetBottom;
      if (spaceBelow < 160) {
        return { ...base, bottom: margin, left: vw / 2, transform: "translateX(-50%)" };
      }
      return { ...base, top: targetBottom, left: vw / 2, transform: "translateX(-50%)" };
    }

    switch (placement) {
      case "bottom":
        return { ...base, top: targetBottom, left: centerX, transform: "translateX(-50%)" };
      case "top":
        return { ...base, bottom: vh - ar.top + pad + margin, left: centerX, transform: "translateX(-50%)" };
      case "right":
        return { ...base, top: ar.top + ar.height / 2, left: ar.left + ar.width + pad * 2 + margin, transform: "translateY(-50%)" };
      case "left":
        return { ...base, top: ar.top + ar.height / 2, right: vw - ar.left + pad + margin, transform: "translateY(-50%)" };
      default:
        return { ...base, top: targetBottom, left: centerX, transform: "translateX(-50%)" };
    }
  };

  return (
    <div data-spotlight-overlay className={cn("fixed inset-0 z-[120]", closing && "pointer-events-none")}>
      {/* Overlay with animated cutout */}
      <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id={`spotlight-mask-${storageKey}`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {ar && (
              <rect
                x={ar.left - pad}
                y={ar.top - pad}
                width={ar.width + pad * 2}
                height={ar.height + pad * 2}
                rx="14"
                fill="black"
                style={{ transition: "x 0.4s cubic-bezier(.4,0,.2,1), y 0.4s cubic-bezier(.4,0,.2,1), width 0.4s cubic-bezier(.4,0,.2,1), height 0.4s cubic-bezier(.4,0,.2,1)" }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.7)"
          mask={`url(#spotlight-mask-${storageKey})`}
          style={{ pointerEvents: "auto", transition: "opacity 0.3s" }}
          className={closing ? "opacity-0" : "opacity-100"}
          onClick={handleClose}
        />
      </svg>

      {/* Spotlight border glow */}
      {ar && (
        <div
          className="fixed rounded-2xl pointer-events-none"
          style={{
            top: ar.top - pad,
            left: ar.left - pad,
            width: ar.width + pad * 2,
            height: ar.height + pad * 2,
            border: "2px solid hsl(var(--primary) / 0.6)",
            boxShadow: "0 0 0 4px hsl(var(--primary) / 0.1), 0 0 24px 4px hsl(var(--primary) / 0.12)",
            transition: "top 0.4s cubic-bezier(.4,0,.2,1), left 0.4s cubic-bezier(.4,0,.2,1), width 0.4s cubic-bezier(.4,0,.2,1), height 0.4s cubic-bezier(.4,0,.2,1), opacity 0.3s",
            opacity: closing ? 0 : 1,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="fixed z-10"
        style={{
          ...getTooltipStyle(),
          opacity: closing ? 0 : 1,
          transition: [
            getTooltipStyle().transition as string,
            "opacity 0.3s ease",
          ].filter(Boolean).join(", "),
        }}
      >
        <div
          key={step}
          className="relative bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground z-10"
            aria-label="Đóng hướng dẫn"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Content with mascot */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-start gap-3">
              {/* Mascot */}
              {current.mascot && (
                <img
                  src={current.mascot}
                  alt="Max"
                  className="w-12 h-12 object-contain shrink-0 drop-shadow-md animate-in zoom-in-75 duration-300"
                />
              )}
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-display text-sm font-bold text-foreground leading-snug">{current.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{current.description}</p>
              </div>
            </div>
          </div>

          {/* Footer: dots + navigation */}
          <div className="px-4 pb-3.5 pt-2 flex items-center justify-between gap-2">
            {/* Step dots */}
            <div className="flex items-center gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === step ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/25"
                  )}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Trước
                </button>
              )}
              <button
                onClick={handleNext}
                className={cn(
                  "flex items-center gap-0.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors",
                  isLast
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {isLast ?"Hoàn tất!":"Tiếp"}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

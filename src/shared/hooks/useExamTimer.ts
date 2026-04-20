import { useState, useEffect, useCallback, useRef } from "react";

export function useExamTimer(durationSeconds: number, isActive: boolean) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [timeSpent, setTimeSpent] = useState(0);
  const initializedRef = useRef(false);

  // Sync timeRemaining when durationSeconds changes (e.g. assessment loads async)
  useEffect(() => {
    if (durationSeconds > 0 && (!initializedRef.current || timeRemaining === 0)) {
      setTimeRemaining(durationSeconds);
      initializedRef.current = true;
    }
  }, [durationSeconds]);

  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    timeRemaining,
    timeSpent,
    formattedTime: formatTime(timeRemaining),
    isExpired: timeRemaining <= 0 && initializedRef.current,
    isWarning: timeRemaining <= 300 && timeRemaining > 60,
    isCritical: timeRemaining <= 60,
  };
}

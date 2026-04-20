import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Skill = "reading" | "listening" | "writing" | "speaking" | "general";

const FLUSH_INTERVAL_MS = 60_000; // flush every 60s
const IDLE_TIMEOUT_MS = 120_000;  // pause after 2min idle

/**
 * Tracks real interaction time on a page and periodically upserts
 * accumulated minutes into the `activity_log` table.
 *
 * Pauses counting when the tab is hidden or user is idle (no mouse/key/touch
 * for 2 minutes). Flushes remaining seconds on unmount.
 */
export function useActivityTracker(skill: Skill = "general") {
  const activeSecondsRef = useRef(0);
  const lastTickRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isActiveRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const userIdRef = useRef<string | null>(null);

  // Resolve user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
    });
  }, []);

  const flush = useCallback(async () => {
    const uid = userIdRef.current;
    const secs = activeSecondsRef.current;
    if (!uid || secs < 10) return; // don't bother for <10s

    const minutes = Math.round(secs / 60);
    if (minutes < 1) return;

    activeSecondsRef.current = activeSecondsRef.current - minutes * 60; // keep remainder

    const today = new Date().toISOString().split("T")[0];

    // Build the increment object
    const skillCol = skill !== "general" ? skill : null;

    await supabase.rpc("increment_activity", {
      p_user_id: uid,
      p_date: today,
      p_minutes: minutes,
      p_skill: skillCol,
    } as any);
  }, [skill]);

  // Tick: count active seconds
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (isActiveRef.current && !document.hidden) {
        const delta = Math.min((now - lastTickRef.current) / 1000, 5); // cap at 5s to avoid drift
        activeSecondsRef.current += delta;
      }
      lastTickRef.current = now;
    };

    const tickInterval = setInterval(tick, 1000);

    // Flush periodically
    intervalRef.current = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      clearInterval(tickInterval);
      clearInterval(intervalRef.current);
    };
  }, [flush]);

  // Idle detection
  useEffect(() => {
    const resetIdle = () => {
      isActiveRef.current = true;
      lastTickRef.current = Date.now();
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        isActiveRef.current = false;
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Visibility change — pause when hidden
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        isActiveRef.current = false;
      } else {
        isActiveRef.current = true;
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  // Flush on unmount + beforeunload
  useEffect(() => {
    const onBeforeUnload = () => { flush(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      flush(); // flush on unmount
    };
  }, [flush]);
}

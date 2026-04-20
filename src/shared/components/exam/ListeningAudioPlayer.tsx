import { useRef, useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Loader2, PlayCircle } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface ListeningAudioPlayerProps {
  audioUrl: string;
  partTitle: string;
  onAudioEnd?: () => void;
  disabled?: boolean;
  autoPlay?: boolean;
}

export function ListeningAudioPlayer({
  audioUrl,
  partTitle,
  onAudioEnd,
  disabled,
  autoPlay = false,
}: ListeningAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<"waiting" | "playing" | "ended">("waiting");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Reset state when audioUrl changes (new part)
  useEffect(() => {
    setStatus("waiting");
    setHasStarted(false);
    setCurrentTime(0);
    setDuration(0);
    setIsMuted(false);
  }, [audioUrl]);

  const startAudio = useCallback(() => {
    if (audioRef.current && !disabled) {
      audioRef.current.play().then(() => {
        setStatus("playing");
        setHasStarted(true);
      }).catch(() => {
        // Browser may block autoplay, user needs to click
      });
    }
  }, [disabled]);

  // Auto-play when autoPlay is true and audio hasn't started yet
  useEffect(() => {
    if (autoPlay && !hasStarted && !disabled) {
      // Small delay to let new audio source load
      const timer = setTimeout(() => startAudio(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, hasStarted, disabled, startAudio, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setStatus("ended");
      onAudioEnd?.();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [onAudioEnd]);

  // Prevent seeking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const preventSeek = () => {
      if (Math.abs(audio.currentTime - currentTime) > 1) {
        audio.currentTime = currentTime;
      }
    };

    audio.addEventListener("seeking", preventSeek);
    return () => audio.removeEventListener("seeking", preventSeek);
  }, [currentTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-exam-header text-exam-header-foreground rounded-lg p-4 space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 opacity-80" />
          <span className="text-sm font-medium">{partTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "playing" && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-3 bg-accent rounded-full animate-pulse" />
              <span className="w-1.5 h-4 bg-accent rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-2.5 bg-accent rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
          )}
          {status === "ended" && (
            <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Progress bar (non-interactive) */}
      <div className="space-y-1">
        <div className="h-1.5 bg-exam-header-foreground/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
        </div>
      </div>

      {/* Start button (only before first play) */}
      {!hasStarted && !disabled && (
        <button
          onClick={startAudio}
          className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          <PlayCircle className="h-4 w-4" />
          Start Listening
        </button>
      )}

      {/* Mute toggle during playback */}
      {status === "playing" && (
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }
          }}
          className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1 transition-opacity"
        >
          {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          {isMuted ? "Unmute" : "Mute"}
        </button>
      )}

      <p className="text-[10px] opacity-50 text-center">
        Audio cannot be paused or replayed — just like the real IELTS exam
      </p>
    </div>
  );
}

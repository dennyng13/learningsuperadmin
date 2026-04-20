import { useState, useRef, useEffect } from "react";
import { Input } from "@shared/components/ui/input";
import { cn } from "@shared/lib/utils";
import { Bold, Italic, Underline, Link, Upload, Volume2, Mic, Loader2 } from "lucide-react";
import { uploadToWorkDrive } from "@shared/utils/workdriveSync";
import { toast } from "sonner";

/* ═══ MINI RICH TEXT EDITOR ═══ */
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const execCmd = (cmd: string) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-ring">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30">
        <button type="button" onClick={() => execCmd("bold")} className="p-1.5 rounded hover:bg-muted transition-colors" title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => execCmd("italic")} className="p-1.5 rounded hover:bg-muted transition-colors" title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => execCmd("underline")} className="p-1.5 rounded hover:bg-muted transition-colors" title="Underline">
          <Underline className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[60px] px-3 py-2 text-sm outline-none [&_b]:font-bold [&_i]:italic [&_u]:underline"
        data-placeholder={placeholder}
        style={{ minHeight: 60 }}
      />
    </div>
  );
}

/* ═══ AUDIO URL INPUT + UPLOAD ═══ */
export function AudioInput({ value, onChange, cardFront }: { value: string; onChange: (url: string) => void; cardFront?: string }) {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">("url");

  const handleFileUpload = async (file: File) => {
    if (!file || !file.type.startsWith("audio/")) {
      toast.error("Chỉ chấp nhận file audio (MP3, WAV...)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 10MB)");
      return;
    }
    setUploading(true);
    try {
      const fileName = `Words_${(cardFront || "audio").replace(/[^a-zA-Z0-9]/g, "_")}.${file.name.split(".").pop()}`;
      const result = await uploadToWorkDrive({
        file,
        fileName,
        category: "flashcards" as any,
        skill: "listening",
        itemName: "Flashcards",
      });
      if (result) {
        const downloadUrl = `https://workdrive.zohoexternal.com/file/${result.file_id}`;
        onChange(downloadUrl);
        toast.success("Upload thành công!");
      } else {
        toast.error("Upload thất bại");
      }
    } catch (e) {
      console.error("Audio upload error:", e);
      toast.error("Lỗi upload audio");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn("text-xs font-bold px-2 py-1 rounded-lg transition-colors", mode === "url" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
        >
          <Link className="h-3 w-3 inline mr-1" />URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn("text-xs font-bold px-2 py-1 rounded-lg transition-colors", mode === "upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
        >
          <Upload className="h-3 w-3 inline mr-1" />Upload
        </button>
      </div>
      {mode === "url" ? (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://workdrive.zohoexternal.com/file/..."
          className="text-xs"
        />
      ) : (
        <label className="flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{uploading ? "Đang upload..." : "Chọn file audio (MP3, WAV...)"}</span>
          <input type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} disabled={uploading} />
        </label>
      )}
      {value && (
        <div className="flex items-center gap-2">
          <audio src={value} controls className="h-8 flex-1" style={{ maxWidth: 200 }} />
          <button type="button" onClick={() => onChange("")} className="text-xs text-destructive hover:underline">Xóa</button>
        </div>
      )}
    </div>
  );
}

/* ═══ INLINE AUDIO PLAY BUTTON ═══ */
export function AudioPlayButton({ url, text }: { url?: string | null; text?: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      if (!audioRef.current || audioRef.current.src !== url) {
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setPlaying(false);
      }
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play().catch(() => setPlaying(false)); setPlaying(true); }
      return;
    }
    if (!text) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  };

  const isTTS = !url && !!text;

  return (
    <button onClick={toggle} className={cn("p-1.5 rounded-full transition-all", playing ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20")} title={isTTS ? "Phát âm (TTS)" : "Phát âm"}>
      {isTTS ? <Mic className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}

import { useState, useRef, DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Progress } from "@shared/components/ui/progress";
import { Headphones, Upload, Loader2, Trash2, Cloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { uploadToWorkDrive, deleteFromWorkDrive } from "@shared/utils/workdriveSync";

interface AudioUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** "bai_thi" or "bai_tap" — determines WorkDrive folder */
  workdriveCategory?: "bai_thi" | "bai_tap";
  /** Assessment or exercise name — used as subfolder name in WorkDrive */
  workdriveItemName?: string;
  /** Zoho WorkDrive file ID for deletion sync */
  workdriveFileId?: string;
  /** Callback when WorkDrive file ID changes */
  onWorkdriveFileIdChange?: (fileId: string) => void;
  /** Entity type for sync tracking: "assessment_part" or "practice_exercise" */
  entityType?: string;
  /** Entity ID (part ID or exercise ID) for sync tracking */
  entityId?: string;
  /** Skill type for WorkDrive folder organization */
  workdriveSkill?: "listening" | "speaking";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AudioUploader({
  value,
  onChange,
  label = "Audio",
  workdriveCategory,
  workdriveItemName,
  workdriveFileId,
  onWorkdriveFileIdChange,
  entityType,
  entityId,
  workdriveSkill = "listening",
}: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [syncingWorkDrive, setSyncingWorkDrive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const shouldSyncWorkDrive = !!(workdriveCategory && workdriveItemName);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Vui lòng chọn file audio (mp3, wav, m4a...)");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 50MB)");
      return;
    }

    setUploading(true);
    setProgress(0);
    setFileName(file.name);
    setFileSize(file.size);

    const ext = file.name.split(".").pop() || "mp3";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `${supabaseUrl}/storage/v1/object/exercise-audio/${path}`;

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", async () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data: urlData } = supabase.storage.from("exercise-audio").getPublicUrl(path);
        onChange(urlData.publicUrl);
        toast.success("Đã upload audio");

        // Sync to WorkDrive
        if (shouldSyncWorkDrive) {
          setSyncingWorkDrive(true);
          const wdFileName = `${workdriveItemName}.${ext}`;
          const result = await uploadToWorkDrive({
            file,
            fileName: wdFileName,
            category: workdriveCategory!,
            skill: workdriveSkill,
            itemName: workdriveItemName!,
            entityType,
            entityId,
            audioUrl: urlData.publicUrl,
          });
          setSyncingWorkDrive(false);
          if (result) {
            onWorkdriveFileIdChange?.(result.file_id);
            toast.success("Đã đồng bộ lên WorkDrive", {
              icon: <Cloud className="h-4 w-4 text-primary" />,
            });
          } else {
            toast.warning("Upload thành công nhưng đồng bộ WorkDrive thất bại");
          }
        }
      } else {
        toast.error("Lỗi upload: " + xhr.statusText);
      }
      setUploading(false);
      setProgress(0);
    });

    xhr.addEventListener("error", () => {
      xhrRef.current = null;
      toast.error("Lỗi kết nối khi upload");
      setUploading(false);
      setProgress(0);
    });

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session?.access_token}`);
    xhr.setRequestHeader("apikey", supabaseKey);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploading(false);
    setProgress(0);
    toast.info("Đã hủy upload");
  };

  const handleDelete = async () => {
    // Delete from WorkDrive if synced
    if (workdriveFileId) {
      setSyncingWorkDrive(true);
      const deleted = await deleteFromWorkDrive(workdriveFileId);
      setSyncingWorkDrive(false);
      if (deleted) {
        onWorkdriveFileIdChange?.("");
        toast.success("Đã xoá trên WorkDrive");
      } else {
        toast.warning("Xoá local thành công nhưng WorkDrive thất bại");
      }
    }
    onChange("");
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div
      className={`rounded-xl p-4 border space-y-3 transition-colors ${
        dragging
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "bg-muted/30"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2">
        <Headphones className="h-4 w-4 text-primary" />
        <label className="text-sm font-bold">{label}</label>
        {shouldSyncWorkDrive && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Cloud className="h-3 w-3" />
            {syncingWorkDrive ? "Đang đồng bộ..." : workdriveFileId ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" /> WorkDrive
              </span>
            ) : "WorkDrive"}
          </span>
        )}
      </div>

      {/* Drop zone hint */}
      {!value && !uploading && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Kéo thả file audio vào đây hoặc <span className="text-primary font-medium">bấm để chọn</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">MP3, WAV, M4A — tối đa 50MB</p>
        </div>
      )}

      {/* Progress bar while uploading */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[60%]">{fileName}</span>
            <span className="text-muted-foreground">{formatSize(fileSize)} · {progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <Button type="button" size="sm" variant="ghost" onClick={cancelUpload} className="text-xs text-muted-foreground h-6 px-2">
            Hủy upload
          </Button>
        </div>
      )}

      {syncingWorkDrive && !uploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Đang đồng bộ WorkDrive...
        </div>
      )}

      <div className="flex gap-2">
        {value && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading || syncingWorkDrive}
            onClick={() => inputRef.current?.click()}
            className="gap-1 shrink-0"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Đổi file
          </Button>
        )}
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Hoặc dán URL audio (mp3)..."
          className="text-sm flex-1"
          disabled={uploading}
        />
        {value && !uploading && !syncingWorkDrive && (
          <Button type="button" size="sm" variant="ghost" onClick={handleDelete} className="text-muted-foreground hover:text-destructive shrink-0 px-2">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && !uploading && (
        <audio controls src={value} className="w-full h-10" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

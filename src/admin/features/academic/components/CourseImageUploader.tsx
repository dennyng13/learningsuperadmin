/**
 * CourseImageUploader — upload / đổi / xoá ảnh minh hoạ cho khoá học.
 *
 * Storage bucket: `course-images` (public, 2MB, png/jpg/jpeg/webp).
 * Path convention: `{courseId}/{timestamp}.{ext}` để tránh trùng và dễ dọn dẹp.
 *
 * Component KHÔNG tự update DB: parent nhận `onChange(publicUrl | null)` và
 * tự lưu vào `courses.image_url` khi save form. Trường hợp `courseId` chưa có
 * (tạo mới khoá học), uploader sẽ disabled với hint nhắc lưu trước.
 */
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";

const BUCKET = "course-images";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ACCEPT_ATTR = ".png,.jpg,.jpeg,.webp";

interface Props {
  courseId: string | null;
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}

/** Trích storage path tương đối từ public URL. Trả null nếu URL không thuộc bucket. */
function extractPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return url.substring(i + marker.length).split("?")[0];
}

export default function CourseImageUploader({ courseId, imageUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup object URL khi unmount / đổi preview.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const displayUrl = previewUrl ?? imageUrl;
  const canUpload = !!courseId;

  const validate = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) {
      return "Chỉ chấp nhận PNG, JPG hoặc WEBP";
    }
    if (file.size > MAX_BYTES) {
      return "Ảnh vượt quá 2MB";
    }
    return null;
  };

  const checkDimensions = (file: File): Promise<{ w: number; h: number } | null> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dims = { w: img.naturalWidth, h: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(dims);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });

  const handleFile = async (file: File) => {
    if (!courseId) {
      toast.error("Vui lòng lưu khoá học trước khi upload ảnh.");
      return;
    }
    const err = validate(file);
    if (err) {
      toast.error(err);
      return;
    }

    // Optimistic preview ngay lập tức.
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreviewUrl(localUrl);

    // Cảnh báo (không block) nếu chiều rộng nhỏ hơn 800px.
    const dims = await checkDimensions(file);
    if (dims && dims.w < 800) {
      toast.warning(`Ảnh hơi nhỏ (${dims.w}×${dims.h}px). Khuyến nghị ≥ 1200×800px.`);
    }

    setBusy(true);
    try {
      // Xoá ảnh cũ nếu có (best-effort, không block flow).
      const oldPath = extractPath(imageUrl);
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => undefined);
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${courseId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Đã cập nhật ảnh khoá học.");
    } catch (e: any) {
      toast.error(`Upload thất bại: ${e?.message ?? "không rõ"}`);
      // Rollback preview về URL cũ.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(null);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl && !previewUrl) return;
    setBusy(true);
    try {
      const oldPath = extractPath(imageUrl);
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => undefined);
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(null);
      onChange(null);
      toast.success("Đã xoá ảnh khoá học.");
    } catch (e: any) {
      toast.error(`Xoá thất bại: ${e?.message ?? "không rõ"}`);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const triggerPick = () => inputRef.current?.click();

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset để chọn lại cùng 1 file vẫn fire onChange.
          e.target.value = "";
        }}
      />

      {displayUrl ? (
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border bg-muted group">
          <img
            src={displayUrl}
            alt="Ảnh minh hoạ khoá học"
            className="h-full w-full object-cover"
          />
          {/* Overlay actions */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-sm transition-opacity",
              busy ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={triggerPick}
                  disabled={busy || !canUpload}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Đổi ảnh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={busy}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xoá
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={canUpload ? triggerPick : undefined}
          onDragOver={(e) => {
            if (!canUpload) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={canUpload ? onDrop : undefined}
          disabled={!canUpload || busy}
          className={cn(
            "relative flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 p-4 text-center transition-colors",
            canUpload && !busy && "hover:bg-muted/50 hover:border-foreground/30 cursor-pointer",
            dragOver && "border-primary bg-primary/5",
            !canUpload && "opacity-60 cursor-not-allowed",
          )}
        >
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="h-11 w-11 rounded-full bg-background border flex items-center justify-center">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Kéo ảnh vào đây hoặc click để chọn
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG / JPG / WEBP · tối đa 2MB · khuyến nghị 1200×800px (3:2)
                </p>
              </div>
            </>
          )}
        </button>
      )}

      {!canUpload && (
        <div className="flex items-start gap-1.5 rounded-md border border-dashed bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Hãy lưu khoá học trước, sau đó mở lại để upload ảnh minh hoạ.</span>
        </div>
      )}
    </div>
  );
}
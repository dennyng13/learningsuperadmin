import { useRef, useState } from "react";
import { Copy, Replace, Pencil, Eye, EyeOff, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { cacheBustedUrl } from "@admin/lib/brandAssets";
import type { BrandAsset } from "@admin/features/brand-assets/types";

interface Props {
  asset: BrandAsset;
  onPreview: (asset: BrandAsset) => void;
  onReplace: (asset: BrandAsset, file: File) => Promise<void>;
  onEdit: (asset: BrandAsset) => void;
  onToggleActive: (asset: BrandAsset) => Promise<void>;
  onDelete: (asset: BrandAsset) => Promise<void>;
  /** Visual size: hero (logo/favicon big), default (mascot), compact (shape grid). */
  size?: "hero" | "default" | "compact";
}

export default function AssetCard({
  asset, onPreview, onReplace, onEdit, onToggleActive, onDelete, size = "default",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!confirm(`Thay thế "${asset.display_name}"?\nFile mới sẽ ảnh hưởng đến mọi portal đang dùng asset này.`)) return;
    setBusy(true);
    try {
      await onReplace(asset, file);
      toast.success("Đã thay thế asset", {
        action: { label: "Mở public URL", onClick: () => window.open(cacheBustedUrl(asset), "_blank") },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Không thể thay thế asset");
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(asset.public_url);
    toast.success("Đã copy public URL");
  };

  const previewSrc = cacheBustedUrl(asset);
  const isHero = size === "hero";
  const isCompact = size === "compact";

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl bg-card p-3 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all flex flex-col gap-2",
        dragging && "ring-2 ring-primary ring-offset-2",
        !asset.is_active && "opacity-60",
      )}
    >
      {/* Preview */}
      <button
        onClick={() => onPreview(asset)}
        className={cn(
          "relative w-full rounded-xl bg-muted/40 overflow-hidden flex items-center justify-center group",
          isHero ? "aspect-[16/9]" : isCompact ? "aspect-square" : "aspect-square",
        )}
      >
        <img
          src={previewSrc}
          alt={asset.display_name}
          className={cn("max-h-full max-w-full object-contain transition-transform group-hover:scale-105", isCompact && "p-2")}
          loading="lazy"
        />
        {busy && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {!asset.is_active && (
          <Badge variant="outline" className="absolute top-2 left-2 text-[9px] gap-1">
            <EyeOff className="h-2.5 w-2.5" /> Ẩn
          </Badge>
        )}
        <Badge variant="secondary" className="absolute top-2 right-2 text-[9px]">
          v{asset.version}
        </Badge>
      </button>

      {/* Meta */}
      <div className="min-w-0">
        <p className={cn("font-display font-semibold text-foreground truncate", isCompact ? "text-xs" : "text-sm")}>
          {asset.display_name}
        </p>
        <p className="text-[10px] text-muted-foreground font-mono truncate">{asset.asset_key}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Cập nhật {formatDistanceToNow(new Date(asset.updated_at), { locale: vi, addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/50">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Replace className="h-3 w-3" /> {isCompact ? "" : "Thay"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1" onClick={copyUrl}>
          <Copy className="h-3 w-3" /> {isCompact ? "" : "URL"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(asset)} title="Sửa metadata">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onToggleActive(asset)} title={asset.is_active ? "Ẩn" : "Hiện"}>
          {asset.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 ml-auto"
          onClick={() => window.open(cacheBustedUrl(asset), "_blank")}
          title="Mở public URL"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={async () => {
            if (!confirm(`Xóa "${asset.display_name}"? Thao tác không thể hoàn tác.`)) return;
            try {
              await onDelete(asset);
              toast.success("Đã xóa asset");
            } catch (e: any) {
              toast.error(e?.message ?? "Không thể xóa");
            }
          }}
          title="Xóa"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={onPickFile}
      />
    </div>
  );
}
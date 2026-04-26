import { useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Copy, Eye, EyeOff, Pencil, Replace, Loader2, ExternalLink,
  MoreVertical, Trash2,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Switch } from "@shared/components/ui/switch";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@shared/components/ui/dropdown-menu";
import {
  cacheBustedUrl,
  replaceBrandAsset,
  updateBrandAssetMetadata,
  deleteBrandAsset,
} from "@admin/lib/brandAssets";
import type { BrandAsset } from "@admin/features/brand-assets/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_MIME = [
  "image/png", "image/jpeg", "image/webp", "image/svg+xml",
  "image/x-icon", "image/vnd.microsoft.icon",
];

const metadataSchema = z.object({
  display_name: z.string().trim().min(1, "Tên hiển thị bắt buộc").max(120, "Tối đa 120 ký tự"),
  description: z.string().trim().max(500, "Tối đa 500 ký tự").optional().nullable(),
  sort_order: z.number().int().min(0).max(9999),
});

interface Props {
  asset: BrandAsset;
  /** Notify parent to refetch list after any mutation. */
  onChanged?: () => void;
  /** Visual size: hero (logo/favicon big), default (mascot), compact (shape grid). */
  size?: "hero" | "default" | "compact";
}

/**
 * Self-contained card displaying one brand asset with full management controls:
 * preview, copy URL, edit metadata, toggle active, replace file (with confirm), delete.
 * All mutations call `@admin/lib/brandAssets` helpers and bump version automatically
 * so every portal picks up the new file via cache-busted URL.
 */
export function BrandAssetCard({ asset, onChanged, size = "default" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [dragging, setDragging] = useState(false);

  const isHero = size === "hero";
  const isCompact = size === "compact";
  const displayUrl = cacheBustedUrl(asset);

  /* ─── Actions ─── */

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(asset.public_url);
      toast.success("Đã copy public URL");
    } catch {
      toast.error("Không thể copy");
    }
  };

  const toggleActive = async () => {
    setWorking(true);
    try {
      await updateBrandAssetMetadata(asset.id, { is_active: !asset.is_active });
      toast.success(asset.is_active ? "Đã ẩn asset" : "Đã hiển thị asset");
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Không cập nhật được");
    } finally {
      setWorking(false);
    }
  };

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File quá lớn (tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      toast.error(`Định dạng không hỗ trợ: ${file.type || "unknown"}`);
      return;
    }
    setPendingFile(file);
    setReplaceConfirmOpen(true);
  };

  const doReplace = async () => {
    if (!pendingFile) return;
    setWorking(true);
    try {
      await replaceBrandAsset(asset.storage_path, pendingFile);
      toast.success("Đã thay thế asset — mọi portal sẽ dùng file mới", {
        action: {
          label: "Mở public URL",
          onClick: () => window.open(asset.public_url, "_blank"),
        },
      });
      setReplaceConfirmOpen(false);
      setPendingFile(null);
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Replace thất bại");
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const doDelete = async () => {
    setWorking(true);
    try {
      await deleteBrandAsset(asset);
      toast.success("Đã xóa asset");
      setDeleteConfirmOpen(false);
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Không xóa được");
    } finally {
      setWorking(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
  };

  /* ─── Render ─── */

  return (
    <>
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
        {/* Thumbnail (click to preview) */}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className={cn(
            "relative w-full rounded-xl bg-muted/40 overflow-hidden flex items-center justify-center group",
            isHero ? "aspect-[16/9]" : "aspect-square",
          )}
        >
          <img
            src={displayUrl}
            alt={asset.display_name}
            loading="lazy"
            className={cn(
              "max-h-full max-w-full object-contain transition-transform group-hover:scale-105",
              isCompact && "p-2",
            )}
          />
          {working && (
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

        {/* Meta + dropdown */}
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-display font-semibold text-foreground truncate",
              isCompact ? "text-xs" : "text-sm",
            )}>
              {asset.display_name}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">{asset.asset_key}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Cập nhật {formatDistanceToNow(new Date(asset.updated_at), { locale: vi, addSuffix: true })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
                <Eye className="h-3.5 w-3.5 mr-2" /> Xem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyUrl}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(displayUrl, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Mở trong tab mới
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Sửa metadata
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                <Replace className="h-3.5 w-3.5 mr-2" /> Replace file
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active toggle footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            {asset.is_active ? "Đang dùng" : "Đã ẩn"}
          </span>
          <Switch
            checked={asset.is_active}
            onCheckedChange={toggleActive}
            disabled={working}
            aria-label={asset.is_active ? "Ẩn asset" : "Hiển thị asset"}
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{asset.display_name}</DialogTitle>
            <DialogDescription className="font-mono text-xs break-all">
              {asset.storage_path}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/40 p-4 flex items-center justify-center min-h-[280px]">
            <img
              src={displayUrl}
              alt={asset.display_name}
              className="max-h-[60vh] max-w-full object-contain"
            />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {asset.description && <p>{asset.description}</p>}
            <p>{asset.mime_type ?? "—"} · v{asset.version}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyUrl}>
              <Copy className="h-3.5 w-3.5 mr-2" /> Copy URL
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Replace className="h-3.5 w-3.5 mr-2" /> Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit metadata dialog */}
      <EditMetadataDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) onChanged?.();
        }}
        asset={asset}
      />

      {/* Replace confirm */}
      <AlertDialog
        open={replaceConfirmOpen}
        onOpenChange={(o) => {
          if (!working) {
            setReplaceConfirmOpen(o);
            if (!o) setPendingFile(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thay thế asset này?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  File mới sẽ ghi đè <code className="font-mono text-xs">{asset.storage_path}</code> và
                  <strong className="text-foreground"> ảnh hưởng đến mọi portal đang sử dụng</strong> asset
                  <strong className="text-foreground"> {asset.display_name}</strong>.
                  Hành động này không thể hoàn tác.
                </p>
                {pendingFile && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs font-mono text-foreground">
                    📎 {pendingFile.name} · {(pendingFile.size / 1024).toFixed(1)} KB · {pendingFile.type}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working} onClick={() => setPendingFile(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction onClick={doReplace} disabled={working}>
              {working ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang thay…</>
              ) : (
                <><Replace className="mr-2 h-4 w-4" />Xác nhận thay</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(o) => { if (!working) setDeleteConfirmOpen(o); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa asset này?</AlertDialogTitle>
            <AlertDialogDescription>
              Sẽ xóa cả file storage và record metadata. Mọi portal đang dùng sẽ bị broken image.
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              disabled={working}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {working ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xóa…</> : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Edit metadata sub-dialog (zod validated)
 * ───────────────────────────────────────────────────────────── */

function EditMetadataDialog({
  open, onOpenChange, asset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  asset: BrandAsset;
}) {
  const [displayName, setDisplayName] = useState(asset.display_name);
  const [description, setDescription] = useState(asset.description ?? "");
  const [sortOrder, setSortOrder] = useState(asset.sort_order);
  const [isActive, setIsActive] = useState(asset.is_active);
  const [saving, setSaving] = useState(false);

  // Reset form whenever the dialog re-opens (asset may have been mutated outside).
  const handleOpenChange = (o: boolean) => {
    if (saving) return;
    if (o) {
      setDisplayName(asset.display_name);
      setDescription(asset.description ?? "");
      setSortOrder(asset.sort_order);
      setIsActive(asset.is_active);
    }
    onOpenChange(o);
  };

  const save = async () => {
    const parsed = metadataSchema.safeParse({
      display_name: displayName,
      description: description.trim() ? description : null,
      sort_order: Number(sortOrder),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }
    setSaving(true);
    try {
      await updateBrandAssetMetadata(asset.id, {
        display_name: parsed.data.display_name,
        description: parsed.data.description ?? null,
        sort_order: parsed.data.sort_order,
        is_active: isActive,
      });
      toast.success("Đã lưu metadata");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa metadata</DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">
            {asset.asset_key}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tên hiển thị</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mô tả</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Thứ tự hiển thị</Label>
            <Input
              type="number"
              min={0}
              max={9999}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <Label htmlFor="active-edit" className="text-xs">Đang dùng (hiển thị trong UI)</Label>
            <Switch id="active-edit" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu…</> : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BrandAssetCard;
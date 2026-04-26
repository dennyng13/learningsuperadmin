import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileImage } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Button } from "@shared/components/ui/button";
import { suggestStoragePath, fileExt, createBrandAsset } from "@admin/lib/brandAssets";
import { BRAND_ASSET_TYPE_LABELS, type BrandAsset, type BrandAssetType } from "@admin/features/brand-assets/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (asset: BrandAsset) => void;
  /**
   * Preset values applied when the dialog opens. Useful for "fast paths"
   * like the Logo Slots panel where asset_type/asset_key are predetermined.
   * Fields not provided keep their normal default behaviour.
   */
  preset?: {
    asset_type?: BrandAssetType;
    asset_key?: string;
    display_name?: string;
    /** When true, hide asset_type + asset_key inputs (locked by preset). */
    lockIdentity?: boolean;
  };
}

export default function UploadAssetDialog({ open, onClose, onCreated, preset }: Props) {
  const [type, setType] = useState<BrandAssetType>(preset?.asset_type ?? "mascot");
  const [assetKey, setAssetKey] = useState(preset?.asset_key ?? "");
  const [displayName, setDisplayName] = useState(preset?.display_name ?? "");
  const [description, setDescription] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [storagePathTouched, setStoragePathTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const locked = !!preset?.lockIdentity;

  // Re-apply preset whenever the dialog opens (so reopening for a different
  // slot shows the right defaults).
  useEffect(() => {
    if (!open) return;
    if (preset?.asset_type) setType(preset.asset_type);
    if (preset?.asset_key) setAssetKey(preset.asset_key);
    if (preset?.display_name) setDisplayName(preset.display_name);
  }, [open, preset?.asset_type, preset?.asset_key, preset?.display_name]);

  // Auto-suggest storage path when type/key/file changes (unless user edited it).
  const suggested = useMemo(() => {
    if (!assetKey.trim()) return "";
    const ext = file ? fileExt(file) : "png";
    return suggestStoragePath(type, assetKey.trim(), ext);
  }, [type, assetKey, file]);

  useEffect(() => {
    if (!storagePathTouched) setStoragePath(suggested);
  }, [suggested, storagePathTouched]);

  const reset = () => {
    setType(preset?.asset_type ?? "mascot");
    setAssetKey(preset?.asset_key ?? "");
    setDisplayName(preset?.display_name ?? "");
    setDescription("");
    setStoragePath("");
    setStoragePathTouched(false);
    setFile(null);
  };

  const submit = async () => {
    if (!file) { toast.error("Chọn file để upload"); return; }
    if (!assetKey.trim()) { toast.error("Nhập asset_key"); return; }
    if (!displayName.trim()) { toast.error("Nhập tên hiển thị"); return; }
    if (!storagePath.trim()) { toast.error("Nhập storage_path"); return; }
    setBusy(true);
    try {
      const asset = await createBrandAsset({
        asset_key: assetKey.trim(),
        display_name: displayName.trim(),
        asset_type: type,
        storage_path: storagePath.trim(),
        description: description.trim() || null,
        file,
      });
      toast.success("Đã tạo asset mới");
      onCreated(asset);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Không tạo được asset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload asset mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!locked && (
            <div className="space-y-1.5">
              <Label className="text-xs">Loại asset</Label>
              <Select value={type} onValueChange={(v) => setType(v as BrandAssetType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BRAND_ASSET_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={locked ? "space-y-1.5" : "grid grid-cols-2 gap-3"}>
            {!locked && (
              <div className="space-y-1.5">
                <Label className="text-xs">asset_key</Label>
                <Input
                  placeholder="vd: mascotHero"
                  value={assetKey}
                  onChange={(e) => setAssetKey(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Tên hiển thị</Label>
              <Input
                placeholder={locked ? assetKey : "Mascot — Hero"}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          {locked && (
            <p className="text-[11px] text-muted-foreground -mt-1">
              Đang upload vào slot cố định:{" "}
              <code className="font-mono text-foreground">{assetKey}</code>
              {" "}({BRAND_ASSET_TYPE_LABELS[type]})
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>storage_path</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {storagePathTouched ? "đã sửa thủ công" : "tự sinh theo convention"}
              </span>
            </Label>
            <Input
              value={storagePath}
              onChange={(e) => { setStoragePath(e.target.value); setStoragePathTouched(true); }}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mô tả</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">File</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/20 px-4 py-6 flex flex-col items-center gap-2 transition-colors"
            >
              {file ? (
                <>
                  <FileImage className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {file.type}</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm">Chọn file PNG / JPG / SVG / WEBP</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onClose(); reset(); }} disabled={busy}>Hủy</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Đang upload…" : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
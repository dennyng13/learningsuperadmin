import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import { Button } from "@shared/components/ui/button";
import type { BrandAsset } from "@admin/features/brand-assets/types";

interface Props {
  asset: BrandAsset | null;
  onClose: () => void;
  onSave: (
    asset: BrandAsset,
    patch: Partial<Pick<BrandAsset, "display_name" | "description" | "sort_order" | "is_active">>,
  ) => Promise<void>;
}

export default function EditMetadataDialog({ asset, onClose, onSave }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (asset) {
      setDisplayName(asset.display_name);
      setDescription(asset.description ?? "");
      setSortOrder(asset.sort_order);
      setActive(asset.is_active);
    }
  }, [asset]);

  if (!asset) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await onSave(asset, {
        display_name: displayName.trim() || asset.display_name,
        description: description.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_active: active,
      });
      toast.success("Đã lưu metadata");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Không lưu được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa metadata</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-mono bg-muted/40 rounded-md px-2 py-1">
            {asset.asset_key}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tên hiển thị</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mô tả</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sort order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <Label className="text-xs">Hoạt động (hiển thị trong UI)</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Hủy</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
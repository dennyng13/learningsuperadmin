import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { cacheBustedUrl } from "@admin/lib/brandAssets";
import type { BrandAsset } from "@admin/features/brand-assets/types";

interface Props {
  asset: BrandAsset | null;
  onClose: () => void;
}

export default function PreviewDialog({ asset, onClose }: Props) {
  if (!asset) return null;
  const url = cacheBustedUrl(asset);
  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">{asset.display_name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center bg-muted/30 rounded-xl p-6 min-h-[300px]">
          <img src={url} alt={asset.display_name} className="max-h-[60vh] max-w-full object-contain" />
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-mono text-muted-foreground break-all">{asset.public_url}</p>
          <p className="text-muted-foreground">v{asset.version} · {asset.mime_type ?? "—"}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(asset.public_url);
              toast.success("Đã copy URL");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy URL
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => window.open(url, "_blank")}>
            <ExternalLink className="h-3.5 w-3.5" /> Mở public URL
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
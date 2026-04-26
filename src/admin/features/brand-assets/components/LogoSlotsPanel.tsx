import { useState } from "react";
import { Upload, Replace, Pencil, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { cacheBustedUrl, replaceBrandAsset } from "@admin/lib/brandAssets";
import type { BrandAsset, BrandAssetType } from "@admin/features/brand-assets/types";
import UploadAssetDialog from "./UploadAssetDialog";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_MIME = [
  "image/png", "image/jpeg", "image/webp", "image/svg+xml",
  "image/x-icon", "image/vnd.microsoft.icon",
];

interface SlotDef {
  asset_key: string;
  asset_type: BrandAssetType;
  display_name: string;
  hint: string;
}

const SLOTS: SlotDef[] = [
  {
    asset_key: "logoMain",
    asset_type: "logo",
    display_name: "Logo — Main",
    hint: "Logo chính trên login, footer, share images. Khuyến nghị PNG ngang, nền trong suốt.",
  },
  {
    asset_key: "logoApp",
    asset_type: "logo",
    display_name: "Logo — App (sidebar)",
    hint: "Icon vuông hiển thị ở header sidebar admin/teacher/student. Khuyến nghị 64×64 hoặc SVG.",
  },
];

interface Props {
  assets: BrandAsset[];
  /** Called after upload OR replace so the parent invalidates queries. */
  onChanged: () => void;
}

/**
 * Two-slot panel that surfaces `logoMain` and `logoApp` at the top of the
 * Brand Assets page. Each slot has a fast-path upload (preset asset_key) when
 * empty, and a one-click Replace when filled.
 */
export function LogoSlotsPanel({ assets, onChanged }: Props) {
  const [uploadFor, setUploadFor] = useState<SlotDef | null>(null);

  return (
    <>
      <div className="rounded-2xl bg-card p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Logo Slots
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              2 slot cố định — đổi file ở đây sẽ tự cập nhật sidebar, login và favicon trên cả 3 portal.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SLOTS.map((slot) => {
            const existing = assets.find((a) => a.asset_key === slot.asset_key) ?? null;
            return (
              <SlotCard
                key={slot.asset_key}
                slot={slot}
                asset={existing}
                onUploadClick={() => setUploadFor(slot)}
                onChanged={onChanged}
              />
            );
          })}
        </div>
      </div>

      {uploadFor && (
        <UploadAssetDialog
          open={!!uploadFor}
          onClose={() => setUploadFor(null)}
          onCreated={() => {
            setUploadFor(null);
            onChanged();
          }}
          preset={{
            asset_type: uploadFor.asset_type,
            asset_key: uploadFor.asset_key,
            display_name: uploadFor.display_name,
            lockIdentity: true,
          }}
        />
      )}
    </>
  );
}

/* ─────────── Single slot card ─────────── */

interface SlotCardProps {
  slot: SlotDef;
  asset: BrandAsset | null;
  onUploadClick: () => void;
  onChanged: () => void;
}

function SlotCard({ slot, asset, onUploadClick, onChanged }: SlotCardProps) {
  const [working, setWorking] = useState(false);

  const handleReplaceFile = async (file: File) => {
    if (!asset) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File quá lớn (tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      toast.error(`Định dạng không hỗ trợ: ${file.type || "unknown"}`);
      return;
    }
    setWorking(true);
    try {
      await replaceBrandAsset(asset.storage_path, file);
      toast.success("Đã thay logo — sidebar/login/favicon sẽ tự cập nhật");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Replace thất bại");
    } finally {
      setWorking(false);
    }
  };

  const onPickReplace = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_MIME.join(",");
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) handleReplaceFile(f);
    };
    input.click();
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex gap-3 items-center min-h-[88px]">
      {/* Preview */}
      <div className="h-16 w-16 rounded-lg bg-card border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
        {asset ? (
          <img
            src={cacheBustedUrl(asset)}
            alt={asset.display_name}
            className="max-h-full max-w-full object-contain p-1"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>

      {/* Meta + actions */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-display text-sm font-semibold truncate">{slot.display_name}</p>
          <code className="text-[10px] font-mono text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
            {slot.asset_key}
          </code>
          {asset && (
            <Badge variant="secondary" className="text-[9px]">v{asset.version}</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{slot.hint}</p>
        <div className="flex items-center gap-1.5 pt-1">
          {asset ? (
            <>
              <Button size="sm" variant="outline" onClick={onPickReplace} disabled={working} className="h-7 text-xs">
                {working ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Đang thay…</>
                ) : (
                  <><Replace className="h-3 w-3 mr-1" /> Replace</>
                )}
              </Button>
              <a
                href={`#asset-${asset.id}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                onClick={(e) => {
                  e.preventDefault();
                  // Small UX: scroll to the matching card in the Logo tab below.
                  const el = document.querySelector(`[data-asset-id="${asset.id}"]`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                <Pencil className="h-3 w-3" /> Sửa metadata
              </a>
            </>
          ) : (
            <Button size="sm" onClick={onUploadClick} className="h-7 text-xs">
              <Upload className="h-3 w-3 mr-1" /> Upload logo này
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogoSlotsPanel;
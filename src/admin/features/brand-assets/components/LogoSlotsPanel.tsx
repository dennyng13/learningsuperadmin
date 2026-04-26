import { useState } from "react";
import { Upload, Replace, Pencil, ImageOff, Loader2, Tag, Globe, LogIn, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  icon: LucideIcon;
  /** Where this asset is consumed — shown as a small chip on the slot. */
  usedIn: string;
}

const SLOTS: SlotDef[] = [
  {
    asset_key: "logo-main",
    asset_type: "logo",
    display_name: "Logo — Main",
    hint: "Logo chính (ngang) — dùng cho footer, share images, header public. PNG/SVG nền trong suốt.",
    icon: Tag,
    usedIn: "Login · Footer · Share",
  },
  {
    asset_key: "logo-app",
    asset_type: "logo",
    display_name: "Logo — App (sidebar)",
    hint: "Icon vuông — header sidebar admin/teacher/student. Khuyến nghị 64×64 hoặc SVG.",
    icon: Tag,
    usedIn: "Sidebar (3 portal)",
  },
  {
    asset_key: "logo-login",
    asset_type: "logo",
    display_name: "Logo — Login",
    hint: "Logo riêng cho trang đăng nhập. Bỏ trống sẽ dùng Logo Main.",
    icon: LogIn,
    usedIn: "Trang Login",
  },
  {
    asset_key: "favicon",
    asset_type: "favicon",
    display_name: "Favicon",
    hint: "Icon trên tab trình duyệt. Khuyến nghị PNG/ICO 32×32 hoặc 64×64, nền trong suốt.",
    icon: Globe,
    usedIn: "Browser tab (3 portal)",
  },
  {
    asset_key: "og-image",
    asset_type: "other",
    display_name: "OG Image (share)",
    hint: "Ảnh khi share link lên Facebook/Zalo. Khuyến nghị 1200×630 PNG/JPG.",
    icon: Share2,
    usedIn: "Social share",
  },
];

interface Props {
  assets: BrandAsset[];
  /** Called after upload OR replace so the parent invalidates queries. */
  onChanged: () => void;
}

/**
 * Fixed-slot panel at the top of the Brand Assets page. Surfaces every brand
 * asset that the app reads by canonical key (logos, favicon, OG image…) so an
 * admin can upload/replace them in one place. Replacements bump the version
 * which invalidates the shared `brand-assets-registry` cache → sidebar,
 * login, favicon and any other consumer auto-refreshes across all 3 portals.
 */
export function LogoSlotsPanel({ assets, onChanged }: Props) {
  const [uploadFor, setUploadFor] = useState<SlotDef | null>(null);

  return (
    <>
      <div className="rounded-2xl bg-card p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Brand Slots
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Các slot cố định — đổi file ở đây sẽ tự đồng bộ sidebar, login, favicon và share image trên cả 3 portal (Admin / Teacher / Student).
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
  const Icon = slot.icon;

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
          <Icon className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>

      {/* Meta + actions */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <p className="font-display text-sm font-semibold truncate">{slot.display_name}</p>
          <code className="text-[10px] font-mono text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
            {slot.asset_key}
          </code>
          {asset && (
            <Badge variant="secondary" className="text-[9px]">v{asset.version}</Badge>
          )}
          {!asset && (
            <Badge variant="outline" className="text-[9px] text-muted-foreground border-dashed">
              <ImageOff className="h-2.5 w-2.5 mr-0.5" /> chưa có
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{slot.hint}</p>
        <p className="text-[10px] font-medium text-muted-foreground/80">
          Dùng ở: <span className="text-foreground/70">{slot.usedIn}</span>
        </p>
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
              <Upload className="h-3 w-3 mr-1" /> Upload {slot.asset_type === "favicon" ? "favicon" : "ngay"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogoSlotsPanel;
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { listBrandAssets } from "@admin/lib/brandAssets";
import { LogoSlotsPanel } from "@admin/features/brand-assets/components/LogoSlotsPanel";
import { BRAND_ASSETS_REGISTRY_QUERY_KEY } from "@shared/hooks/useBrandAsset";

const QUERY_KEY = ["brand-assets"] as const;

/**
 * Tab tóm lược Brand Assets trong Settings — chỉ hiển thị các slot logo/favicon
 * core (LogoSlotsPanel) để admin replace nhanh; điều hướng sang trang đầy đủ
 * cho các loại asset còn lại (mascot, shapes, illustrations…).
 *
 * Lý do tách: trang Brand Assets gốc dài + nhiều tab (~250 LOC) — không phù
 * hợp nhồi vào tab Settings. Wrapper này chỉ surface workflow phổ biến nhất.
 */
export default function AdminBrandAssetsTab() {
  const qc = useQueryClient();
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listBrandAssets,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEY });
    qc.invalidateQueries({ queryKey: BRAND_ASSETS_REGISTRY_QUERY_KEY });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Brand Assets
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Quản lý logo, favicon dùng chung cho 3 portal. Thay đổi tại đây sẽ
            tự động đồng bộ Student / Teacher / Admin sau ~5 phút (hoặc reload).
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
          <Link to="/brand-assets">
            Trang đầy đủ <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Đang tải…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được brand assets: {(error as Error).message}
        </div>
      ) : (
        <>
          <LogoSlotsPanel assets={assets} onChanged={invalidate} />
          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            Cần quản lý mascot, shapes, illustrations? →{" "}
            <Link to="/brand-assets" className="font-semibold text-primary hover:underline">
              Mở trang Brand Assets đầy đủ
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
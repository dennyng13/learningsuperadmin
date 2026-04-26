import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon, Search, Plus, Loader2, Palette,
  Tag, Globe, Sparkles, Shapes, Brush, Star, Package, Quote, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { listBrandAssets } from "@admin/lib/brandAssets";
import {
  type BrandAsset,
  type BrandAssetType,
  SHAPE_PALETTES,
  type ShapePalette,
  extractShapePalette,
} from "@admin/features/brand-assets/types";
import { BrandAssetCard } from "../components/BrandAssetCard";
import UploadAssetDialog from "../components/UploadAssetDialog";
import { LogoSlotsPanel } from "../components/LogoSlotsPanel";
import { BRAND_ASSETS_REGISTRY_QUERY_KEY } from "@shared/hooks/useBrandAsset";

const QUERY_KEY = ["brand-assets"] as const;

/** Tab config — one tab per asset_type enum value. */
const TABS: {
  key: BrandAssetType;
  label: string;
  icon: LucideIcon;
  cardSize: "hero" | "default" | "compact";
  cols: string;
}[] = [
  { key: "logo",         label: "Logo",          icon: Tag,      cardSize: "hero",    cols: "md:grid-cols-2" },
  { key: "favicon",      label: "Favicon",       icon: Globe,    cardSize: "hero",    cols: "md:grid-cols-2" },
  { key: "mascot",       label: "Mascots",       icon: Sparkles, cardSize: "default", cols: "md:grid-cols-2 lg:grid-cols-3" },
  { key: "shape",        label: "Shapes",        icon: Shapes,   cardSize: "compact", cols: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8" },
  { key: "illustration", label: "Illustrations", icon: Brush,    cardSize: "default", cols: "md:grid-cols-2 lg:grid-cols-3" },
  { key: "icon",         label: "Icons",         icon: Star,     cardSize: "default", cols: "md:grid-cols-3 lg:grid-cols-4" },
  { key: "other",        label: "Other",         icon: Package,  cardSize: "default", cols: "md:grid-cols-3 lg:grid-cols-4" },
];

export default function BrandAssetsPage() {
  const qc = useQueryClient();
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listBrandAssets,
    staleTime: 30_000,
  });

  const [tab, setTab] = useState<BrandAssetType>("logo");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "hidden">("all");
  const [paletteFilter, setPaletteFilter] = useState<ShapePalette | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const invalidate = () => {
    // List page cache.
    qc.invalidateQueries({ queryKey: QUERY_KEY });
    // Shared registry consumed by useBrandAsset (sidebar / login / favicon).
    qc.invalidateQueries({ queryKey: BRAND_ASSETS_REGISTRY_QUERY_KEY });
  };

  /** Apply global search + active filter once. */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (q && !a.asset_key.toLowerCase().includes(q) && !a.display_name.toLowerCase().includes(q)) return false;
      if (activeFilter === "active" && !a.is_active) return false;
      if (activeFilter === "hidden" && a.is_active) return false;
      return true;
    });
  }, [assets, search, activeFilter]);

  /** Bucket filtered assets by asset_type for tab counts. */
  const byType = useMemo(() => {
    const map: Record<BrandAssetType, BrandAsset[]> = {
      logo: [], favicon: [], mascot: [], icon: [], illustration: [], shape: [], other: [],
    };
    for (const a of filtered) {
      if (map[a.asset_type]) map[a.asset_type].push(a);
    }
    return map;
  }, [filtered]);

  /** Shapes filtered by palette sub-filter. */
  const shapesByPalette = useMemo(() => {
    if (paletteFilter === "all") return byType.shape;
    return byType.shape.filter((a) => extractShapePalette(a.asset_key) === paletteFilter);
  }, [byType.shape, paletteFilter]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Brand Assets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý tập trung logo, favicon, mascot, shapes — dùng chung cho 3 portal Student / Teacher / Admin.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Upload asset mới
        </Button>
      </div>

      {/* Quick logo slots — surface logoMain & logoApp for one-click replace. */}
      {!isLoading && !error && (
        <LogoSlotsPanel assets={assets} onChanged={invalidate} />
      )}

      {/* Sub-modules */}
      <Link
        to="/brand-assets/quotes"
        className="group flex items-center justify-between gap-3 rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-4 hover:border-primary/40 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 text-primary p-2.5">
            <Quote className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold flex items-center gap-1.5">
              Max Quotes
              <Badge variant="secondary" className="text-[9px]">Student Portal</Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quản lý câu truyền động lực mascot Max nói với học viên (loading, dashboard, celebration…).
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </Link>

      {/* Filters */}
      <div className="rounded-2xl bg-card p-3 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo asset_key hoặc tên hiển thị…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="hidden">Đã ẩn</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-[10px]">
          {filtered.length} / {assets.length} assets
        </Badge>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được brand assets: {(error as Error).message}
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as BrandAssetType)}>
          <TabsList className="w-full justify-start flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                <t.icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {byType[t.key].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4 space-y-4">
              {/* Sub-filter only for Shapes tab */}
              {t.key === "shape" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
                    Palette
                  </span>
                  <PaletteChip
                    label={`Tất cả (${byType.shape.length})`}
                    active={paletteFilter === "all"}
                    onClick={() => setPaletteFilter("all")}
                  />
                  {SHAPE_PALETTES.map((p) => {
                    const count = byType.shape.filter((a) => extractShapePalette(a.asset_key) === p).length;
                    return (
                      <PaletteChip
                        key={p}
                        label={`${p} (${count})`}
                        active={paletteFilter === p}
                        onClick={() => setPaletteFilter(p)}
                      />
                    );
                  })}
                </div>
              )}

              <SectionGrid
                assets={t.key === "shape" ? shapesByPalette : byType[t.key]}
                size={t.cardSize}
                cols={t.cols}
                onChanged={invalidate}
                emptyHint={
                  t.key === "illustration"
                    ? "Chưa có illustration nào — upload bằng nút trên cùng."
                    : "Chưa có asset nào trong nhóm này."
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <UploadAssetDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onCreated={() => invalidate()} />
    </div>
  );
}

/* ─────────── Helpers ─────────── */

function PaletteChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors capitalize ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  );
}

interface SectionProps {
  assets: BrandAsset[];
  size: "hero" | "default" | "compact";
  cols: string;
  onChanged: () => void;
  emptyHint: string;
}

function SectionGrid({ assets, size, cols, onChanged, emptyHint }: SectionProps) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
        {emptyHint}
      </p>
    );
  }
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3`}>
      {assets.map((a) => (
        <BrandAssetCard key={a.id} asset={a} size={size} onChanged={onChanged} />
      ))}
    </div>
  );
}
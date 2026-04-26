import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon, Search, Plus, Loader2, Palette,
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

const QUERY_KEY = ["brand-assets"] as const;

export default function BrandAssetsPage() {
  const qc = useQueryClient();
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listBrandAssets,
    staleTime: 30_000,
  });

  const [tab, setTab] = useState<"logo-favicon" | "mascot" | "shape" | "other">("logo-favicon");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "hidden">("all");
  const [paletteFilter, setPaletteFilter] = useState<ShapePalette | "all">("all");

  const [uploadOpen, setUploadOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (q && !a.asset_key.toLowerCase().includes(q) && !a.display_name.toLowerCase().includes(q)) return false;
      if (activeFilter === "active" && !a.is_active) return false;
      if (activeFilter === "hidden" && a.is_active) return false;
      return true;
    });
  }, [assets, search, activeFilter]);

  const byType = useMemo(() => {
    const map: Record<string, BrandAsset[]> = {
      logo: [], favicon: [], mascot: [], icon: [], illustration: [], other: [], shape: [],
    };
    for (const a of filtered) {
      const isShape = a.asset_type === "other" && a.asset_key.startsWith("shape-");
      if (isShape) map.shape.push(a);
      else map[a.asset_type]?.push(a);
    }
    return map;
  }, [filtered]);

  const shapesByPalette = useMemo(() => {
    const list = paletteFilter === "all"
      ? byType.shape
      : byType.shape.filter((a) => extractShapePalette(a.asset_key) === paletteFilter);
    return list;
  }, [byType.shape, paletteFilter]);

  /* ─── Render ─── */

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
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="logo-favicon">
              Logo &amp; Favicon
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {byType.logo.length + byType.favicon.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="mascot">
              Mascots
              <Badge variant="secondary" className="ml-1.5 text-[10px]">{byType.mascot.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="shape">
              Geometric Shapes
              <Badge variant="secondary" className="ml-1.5 text-[10px]">{byType.shape.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="other">
              Khác
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {byType.icon.length + byType.illustration.length + byType.other.length - byType.shape.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Logo & Favicon */}
          <TabsContent value="logo-favicon" className="mt-4 space-y-4">
            <SectionGrid
              title="Logo"
              assets={byType.logo}
              size="hero"
              cols="md:grid-cols-2"
              {...{ setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete }}
            />
            <SectionGrid
              title="Favicon"
              assets={byType.favicon}
              size="hero"
              cols="md:grid-cols-2"
              {...{ setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete }}
            />
          </TabsContent>

          {/* Mascots */}
          <TabsContent value="mascot" className="mt-4">
            <SectionGrid
              title=""
              assets={byType.mascot}
              size="default"
              cols="md:grid-cols-2 lg:grid-cols-3"
              {...{ setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete }}
            />
          </TabsContent>

          {/* Shapes */}
          <TabsContent value="shape" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
                Palette
              </span>
              <button
                onClick={() => setPaletteFilter("all")}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  paletteFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Tất cả
              </button>
              {SHAPE_PALETTES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPaletteFilter(p)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors capitalize ${
                    paletteFilter === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <SectionGrid
              title=""
              assets={shapesByPalette}
              size="compact"
              cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
              {...{ setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete }}
            />
          </TabsContent>

          {/* Other */}
          <TabsContent value="other" className="mt-4 space-y-4">
            <SectionGrid
              title="Icon"
              assets={byType.icon}
              size="default"
              cols="md:grid-cols-3 lg:grid-cols-4"
              {...{ setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete }}
            />
            <SectionGrid
              title="Illustration"
              assets={byType.illustration}
              size="default"
              cols="md:grid-cols-2 lg:grid-cols-3"
              {...{ setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete }}
            />
            <SectionGrid
              title="Other"
              assets={byType.other.filter((a) => !a.asset_key.startsWith("shape-"))}
              size="default"
              cols="md:grid-cols-3 lg:grid-cols-4"
              {...{ setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete }}
            />
          </TabsContent>
        </Tabs>
      )}

      <PreviewDialog asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      <EditMetadataDialog asset={editAsset} onClose={() => setEditAsset(null)} onSave={handleEdit} />
      <UploadAssetDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onCreated={() => invalidate()} />
    </div>
  );
}

/* ─────────── Section grid helper ─────────── */

interface SectionProps {
  title: string;
  assets: BrandAsset[];
  size: "hero" | "default" | "compact";
  cols: string;
  setPreviewAsset: (a: BrandAsset) => void;
  setEditAsset: (a: BrandAsset) => void;
  handleReplace: (a: BrandAsset, file: File) => Promise<void>;
  handleToggleActive: (a: BrandAsset) => Promise<void>;
  handleDelete: (a: BrandAsset) => Promise<void>;
}

function SectionGrid({
  title, assets, size, cols,
  setPreviewAsset, setEditAsset, handleReplace, handleToggleActive, handleDelete,
}: SectionProps) {
  if (assets.length === 0) {
    return title ? (
      <div>
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
          Chưa có asset
        </p>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
        Chưa có asset
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {title && (
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>
      )}
      <div className={`grid grid-cols-1 ${cols} gap-3`}>
        {assets.map((a) => (
          <AssetCard
            key={a.id}
            asset={a}
            size={size}
            onPreview={setPreviewAsset}
            onEdit={setEditAsset}
            onReplace={handleReplace}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
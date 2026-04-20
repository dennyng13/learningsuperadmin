import { useState } from "react";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Plus, X, ExternalLink, Link2, Youtube, FileText, Image as ImageIcon } from "lucide-react";
import { normalizeUrl } from "@shared/lib/utils";

export interface SessionLink {
  label: string;
  url: string;
}

interface Props {
  links: SessionLink[];
  onChange: (links: SessionLink[]) => void;
}

/** Detect provider for thumbnail/icon */
function getLinkMeta(url: string) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube thumbnail
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) {
      return {
        host,
        kind: "youtube" as const,
        thumb: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
        icon: Youtube,
      };
    }
    // PDF
    if (/\.pdf($|\?)/i.test(url)) {
      return { host, kind: "pdf" as const, thumb: null, icon: FileText };
    }
    // Image
    if (/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url)) {
      return { host, kind: "image" as const, thumb: url, icon: ImageIcon };
    }
    // Generic — use Google favicon service for thumbnail
    return {
      host,
      kind: "web" as const,
      thumb: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
      icon: Link2,
    };
  } catch {
    return { host: url, kind: "web" as const, thumb: null, icon: Link2 };
  }
}

export function LinkManager({ links, onChange }: Props) {
  const [draftLabel, setDraftLabel] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const addLink = () => {
    if (!draftUrl.trim()) return;
    const url = normalizeUrl(draftUrl.trim());
    const label = draftLabel.trim() || getLinkMeta(url).host;
    onChange([...links, { label, url }]);
    setDraftLabel("");
    setDraftUrl("");
  };

  const removeLink = (idx: number) => {
    onChange(links.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {/* Existing links — thumbnail cards */}
      {links.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {links.map((l, i) => {
            const meta = getLinkMeta(l.url);
            const Icon = meta.icon;
            return (
              <div key={i} className="group relative flex items-center gap-2 border border-border rounded-lg p-1.5 bg-card hover:border-primary/40 transition-colors">
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                  {meta.thumb ? (
                    <img
                      src={meta.thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                {/* Text */}
                <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors">{l.label}</p>
                  <p className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5">
                    <ExternalLink className="w-2.5 h-2.5" /> {meta.host}
                  </p>
                </a>
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  aria-label="Xoá link"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-[11px] flex-[2]"
          placeholder="Nhãn (tuỳ chọn)"
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
        />
        <Input
          className="h-7 text-[11px] flex-[3]"
          placeholder="https://... (Enter để thêm)"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={addLink}
          disabled={!draftUrl.trim()}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

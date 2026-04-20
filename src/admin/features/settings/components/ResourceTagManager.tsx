import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { X, Plus, Tag } from "lucide-react";
import { Input } from "@shared/components/ui/input";
import { cn } from "@shared/lib/utils";

interface ResourceTagManagerProps {
  resourceType: "exercise" | "assessment";
  resourceId: string;
  compact?: boolean;
  className?: string;
}

interface TagRow {
  id: string;
  tag: string;
  created_by: string;
}

export default function ResourceTagManager({
  resourceType,
  resourceId,
  compact = false,
  className,
}: ResourceTagManagerProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<TagRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("resource_tags")
        .select("id, tag, created_by")
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .order("created_at");
      if (data) setTags(data as TagRow[]);
    };
    fetch();
  }, [resourceType, resourceId]);

  const addTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed || !user) return;
    if (tags.some((t) => t.tag.toLowerCase() === trimmed.toLowerCase())) {
      setNewTag("");
      setAdding(false);
      return;
    }
    const { data, error } = await supabase
      .from("resource_tags")
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        tag: trimmed,
        created_by: user.id,
      } as any)
      .select("id, tag, created_by")
      .single();
    if (!error && data) {
      setTags((prev) => [...prev, data as TagRow]);
    }
    setNewTag("");
    setAdding(false);
  };

  const removeTag = async (tagId: string) => {
    const { error } = await supabase.from("resource_tags").delete().eq("id", tagId);
    if (!error) setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Escape") {
      setAdding(false);
      setNewTag("");
    }
  };

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1 items-center", className)}>
        {tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium group"
          >
            <Tag className="h-2.5 w-2.5" />
            {t.tag}
            {user && (t.created_by === user.id) && (
              <button
                onClick={(e) => { e.stopPropagation(); removeTag(t.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        {adding ? (
          <Input
            autoFocus
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (newTag.trim()) addTag(); else setAdding(false); }}
            placeholder="Tag..."
            className="h-5 w-20 text-[10px] px-1.5 py-0 rounded"
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setAdding(true); }}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5 items-center", className)}>
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium group"
        >
          <Tag className="h-3 w-3" />
          {t.tag}
          {user && (t.created_by === user.id) && (
            <button
              onClick={() => removeTag(t.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {adding ? (
        <Input
          autoFocus
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (newTag.trim()) addTag(); else setAdding(false); }}
          placeholder="Nhập tag..."
          className="h-6 w-24 text-xs px-2 py-0 rounded-md"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors border border-dashed border-muted-foreground/30"
        >
          <Plus className="h-3 w-3" /> Tag
        </button>
      )}
    </div>
  );
}

/** Hook to batch-fetch tags for a list of resources */
export function useResourceTags(resourceType: "exercise" | "assessment", resourceIds: string[]) {
  const [tagMap, setTagMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (resourceIds.length === 0) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("resource_tags")
        .select("resource_id, tag")
        .eq("resource_type", resourceType)
        .in("resource_id", resourceIds);
      if (!data) return;
      const map: Record<string, string[]> = {};
      (data as any[]).forEach((r) => {
        if (!map[r.resource_id]) map[r.resource_id] = [];
        map[r.resource_id].push(r.tag);
      });
      setTagMap(map);
    };
    fetch();
  }, [resourceType, JSON.stringify(resourceIds)]);

  return tagMap;
}

import { useEffect, useState } from "react";
import { File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ClassNoteFile } from "@shared/hooks/useStudyPlan";

const BUCKET = "class-note-files";

/** Extract storage path from a legacy public URL like
 *  https://xxx.supabase.co/storage/v1/object/public/class-note-files/<path> */
function pathFromLegacyUrl(url: string): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

async function resolveSignedUrl(f: ClassNoteFile): Promise<string> {
  const path = f.path || pathFromLegacyUrl(f.url);
  if (!path) return f.url || "";
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || "";
}

export function ClassNoteFilesDisplay({ files }: { files?: ClassNoteFile[] | null }) {
  const [resolved, setResolved] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!files || files.length === 0) {
      setResolved([]);
      return;
    }
    Promise.all(files.map(resolveSignedUrl)).then(urls => {
      if (!cancelled) setResolved(urls);
    });
    return () => { cancelled = true; };
  }, [files]);

  if (!files || files.length === 0) return null;
  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {files.map((f, i) => {
        const url = resolved[i] || "";
        return (
          <a key={i} href={url || undefined} target="_blank" rel="noreferrer" className="block">
            {isImage(f.type) ? (
              url ? (
                <img src={url} alt={f.name} className="h-16 w-16 rounded-lg object-cover border hover:ring-2 hover:ring-primary/40 transition-all" />
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-muted/50 animate-pulse" />
              )
            ) : (
              <div className="h-16 w-auto min-w-[64px] rounded-lg border flex items-center gap-1.5 px-2 bg-muted/50 hover:bg-muted transition-colors">
                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{f.name}</span>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

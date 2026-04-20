import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { HardDrive, Loader2, Trash2, FolderOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BucketInfo {
  name: string;
  fileCount: number;
  isPublic: boolean;
}

const BUCKET_LABELS: Record<string, string> = {
  "test-imports": "File đề thi đã upload",
  "badge-images": "Hình ảnh huy hiệu",
  "avatars": "Ảnh đại diện",
  "flashcard-images": "Hình ảnh flashcard",
};

export default function AdminStorageTab() {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState<string | null>(null);

  const loadBuckets = async () => {
    setLoading(true);
    try {
      const bucketNames = ["test-imports", "badge-images", "avatars", "flashcard-images"];
      const results: BucketInfo[] = [];

      for (const name of bucketNames) {
        const { data } = await supabase.storage.from(name).list("", { limit: 1000 });
        results.push({
          name,
          fileCount: data?.length ?? 0,
          isPublic: name !== "test-imports",
        });
      }
      setBuckets(results);
    } catch {
      toast.error("Không thể tải thông tin storage");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBuckets();
  }, []);

  const handleCleanBucket = async (bucketName: string) => {
    if (!confirm(`Bạn có chắc muốn xoá TẤT CẢ file trong "${BUCKET_LABELS[bucketName] || bucketName}"?`)) return;
    setCleaning(bucketName);
    try {
      const { data: files } = await supabase.storage.from(bucketName).list("", { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => f.name);
        const { error } = await supabase.storage.from(bucketName).remove(paths);
        if (error) throw error;
        toast.success(`Đã xoá ${paths.length} file trong ${BUCKET_LABELS[bucketName]}`);
        loadBuckets();
      } else {
        toast.info("Bucket đã trống");
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
    setCleaning(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Quản lý Storage</h2>
          <p className="text-sm text-muted-foreground">
            Xem dung lượng và quản lý file trong các bucket
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadBuckets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {buckets.map((bucket) => (
            <Card key={bucket.name} className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{BUCKET_LABELS[bucket.name] || bucket.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {bucket.fileCount} file • {bucket.isPublic ? "Public" : "Private"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => handleCleanBucket(bucket.name)}
                disabled={!!cleaning || bucket.fileCount === 0}
              >
                {cleaning === bucket.name ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                )}
                Xoá tất cả file
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 bg-muted/30 border-dashed">
        <p className="text-sm text-muted-foreground">
           <strong>Lưu ý:</strong> File đề thi upload (test-imports) có thể xoá sau khi đã parse thành công để tiết kiệm dung lượng.
          File ảnh đại diện và huy hiệu nên giữ lại.
        </p>
      </Card>
    </div>
  );
}

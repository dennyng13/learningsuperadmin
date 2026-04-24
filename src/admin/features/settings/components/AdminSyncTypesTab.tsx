import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Label } from "@shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const REPOS = [
  { value: "dennyng13/ieltspractice-aa5eb78f", label: "Student Portal (ieltspractice-aa5eb78f)" },
  { value: "dennyng13/learningsuperadmin", label: "Admin Hub (learningsuperadmin)" },
  { value: "dennyng13/teachingwithlearningplus-52cac937", label: "Teacher Portal (teachingwithlearningplus-52cac937)" },
] as const;

type RepoValue = (typeof REPOS)[number]["value"];

export default function AdminSyncTypesTab() {
  const [repo, setRepo] = useState<RepoValue>(REPOS[1].value);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-sync-types", {
        body: { repo },
      });

      if (error) {
        const msg =
          (data as { error?: string } | null)?.error ?? error.message ?? "Lỗi không xác định";
        toast.error("Không trigger được workflow", { description: msg });
        return;
      }

      const result = data as { success?: boolean; actions_url?: string; error?: string } | null;
      if (!result?.success || !result.actions_url) {
        toast.error("Không trigger được workflow", {
          description: result?.error ?? "Phản hồi không hợp lệ từ server",
        });
        return;
      }

      toast.success("Đã trigger workflow Sync Types", {
        description: "GitHub Actions sẽ tạo PR sau vài phút.",
        action: {
          label: "Xem tiến trình",
          onClick: () => window.open(result.actions_url, "_blank", "noopener,noreferrer"),
        },
        duration: 10000,
      });
    } catch (err) {
      toast.error("Lỗi không mong muốn", { description: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const [owner, repoName] = repo.split("/");
  const actionsUrl = `https://github.com/${owner}/${repoName}/actions/workflows/sync-types.yml`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5 text-primary" />
          Đồng bộ Supabase Types
        </CardTitle>
        <CardDescription>
          Trigger GitHub Actions workflow để tạo lại <code className="rounded bg-muted px-1 py-0.5 text-xs">types.ts</code>{" "}
          từ schema database hiện tại và mở Pull Request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="repo-select">Chọn repository</Label>
          <Select value={repo} onValueChange={(v) => setRepo(v as RepoValue)} disabled={loading}>
            <SelectTrigger id="repo-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPOS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSync} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang trigger..." : "Sync ngay"}
          </Button>
          <a
            href={actionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Mở GitHub Actions
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          Workflow phải tồn tại tại{" "}
          <code className="rounded bg-muted px-1 py-0.5">.github/workflows/sync-types.yml</code> trên branch{" "}
          <code className="rounded bg-muted px-1 py-0.5">main</code> của repo đã chọn.
        </p>
      </CardContent>
    </Card>
  );
}
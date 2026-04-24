import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  GitPullRequest,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
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
import { Badge } from "@shared/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const REPOS = [
  { value: "dennyng13/ieltspractice-aa5eb78f", label: "Student Portal (ieltspractice-aa5eb78f)" },
  { value: "dennyng13/learningsuperadmin", label: "Admin Hub (learningsuperadmin)" },
  { value: "dennyng13/teachingwithlearningplus-52cac937", label: "Teacher Portal (teachingwithlearningplus-52cac937)" },
] as const;

type RepoValue = (typeof REPOS)[number]["value"];

interface SyncRun {
  id: number;
  title: string;
  status: string;
  conclusion: string | null;
  event: string;
  branch: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  actor: string | null;
  actor_avatar: string | null;
  pull_request: { number: number; html_url: string } | null;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s trước`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  return `${day} ngày trước`;
}

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === "completed") {
    if (conclusion === "success") {
      return (
        <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary">
          <CheckCircle2 className="h-3 w-3" /> Thành công
        </Badge>
      );
    }
    if (conclusion === "failure" || conclusion === "timed_out" || conclusion === "startup_failure") {
      return (
        <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-destructive">
          <XCircle className="h-3 w-3" /> Thất bại
        </Badge>
      );
    }
    if (conclusion === "cancelled") {
      return (
        <Badge variant="outline" className="gap-1">
          <Circle className="h-3 w-3" /> Đã hủy
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Circle className="h-3 w-3" /> {conclusion ?? "—"}
      </Badge>
    );
  }
  if (status === "in_progress" || status === "queued" || status === "waiting" || status === "pending") {
    return (
      <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary">
        <Loader2 className="h-3 w-3 animate-spin" /> {status === "queued" ? "Đang chờ" : "Đang chạy"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" /> {status}
    </Badge>
  );
}

export default function AdminSyncTypesTab() {
  const [repo, setRepo] = useState<RepoValue>(REPOS[1].value);
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);

  const fetchRuns = useCallback(async (target: RepoValue) => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("list-sync-type-runs", {
        body: { repo: target, per_page: 15 },
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error ?? error.message;
        setRunsError(msg ?? "Không tải được lịch sử");
        setRuns([]);
        return;
      }
      const result = data as { success?: boolean; runs?: SyncRun[]; error?: string } | null;
      if (!result?.success) {
        setRunsError(result?.error ?? "Phản hồi không hợp lệ");
        setRuns([]);
        return;
      }
      setRuns(result.runs ?? []);
    } catch (err) {
      setRunsError(String(err));
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns(repo);
  }, [repo, fetchRuns]);

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

      // Refresh list after a short delay so the new run shows up
      setTimeout(() => fetchRuns(repo), 2500);
    } catch (err) {
      toast.error("Lỗi không mong muốn", { description: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const [owner, repoName] = repo.split("/");
  const actionsUrl = `https://github.com/${owner}/${repoName}/actions/workflows/sync-types.yml`;

  return (
    <div className="space-y-4">
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

    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Lịch sử Sync</CardTitle>
          <CardDescription>15 lần chạy gần nhất của workflow này. Dữ liệu lấy trực tiếp từ GitHub.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRuns(repo)}
          disabled={runsLoading}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${runsLoading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        {runsLoading && runs.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : runsError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {runsError}
          </div>
        ) : runs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chưa có lần chạy nào. Bấm <strong>Sync ngay</strong> để bắt đầu.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={run.status} conclusion={run.conclusion} />
                    <span className="truncate text-sm font-medium" title={run.title}>
                      {run.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {run.actor && (
                      <span className="inline-flex items-center gap-1">
                        {run.actor_avatar && (
                          <img src={run.actor_avatar} alt="" className="h-4 w-4 rounded-full" />
                        )}
                        {run.actor}
                      </span>
                    )}
                    <span>{formatRelative(run.run_started_at ?? run.created_at)}</span>
                    <span>· {run.event}</span>
                    {run.branch && <span>· {run.branch}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  {run.pull_request && (
                    <a
                      href={run.pull_request.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <GitPullRequest className="h-3 w-3" />
                      PR #{run.pull_request.number}
                    </a>
                  )}
                  <a
                    href={run.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Xem run
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
import { useState } from "react";
import { Github, ExternalLink, Copy, Check, RefreshCw, Webhook, GitCommit, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { toast } from "sonner";

const REPO = "dennyng13/learningsuperadmin";
const REPO_URL = `https://github.com/${REPO}`;

const EMPTY_COMMIT_CMD = `git clone ${REPO_URL}.git tmp-resync && cd tmp-resync && git commit --allow-empty -m "chore: trigger Lovable re-sync" && git push origin main && cd .. && rm -rf tmp-resync`;

export default function AdminGitHubSyncTab() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCmd = async () => {
    try {
      await navigator.clipboard.writeText(EMPTY_COMMIT_CMD);
      setCopied(true);
      toast.success("Đã copy lệnh git");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Không copy được — copy thủ công nhé");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="h-5 w-5" /> Đồng bộ GitHub ↔ Lovable
          </CardTitle>
          <CardDescription>
            Project được kết nối với <code className="text-xs px-1.5 py-0.5 rounded bg-muted">{REPO}</code>.
            Mỗi commit lên branch <code className="text-xs px-1.5 py-0.5 rounded bg-muted">main</code> sẽ tự sync sang Lovable
            qua webhook GitHub App. Khi nghi ngờ webhook bị drift, dùng nút bên dưới.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={() => setOpen(true)}>
            <RefreshCw className="h-4 w-4" /> Đồng bộ lại ngay
          </Button>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Lovable không expose API để client tự "force pull". Nút này mở 3 lối tắt nhanh nhất để buộc re-sync mà không cần Disconnect/Connect.
          </p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" /> Đồng bộ lại ngay — chọn 1 cách
            </DialogTitle>
            <DialogDescription>
              Bất kỳ cách nào dưới đây sẽ kích hoạt Lovable kéo bản mới nhất từ <code className="text-xs">main</code> trong vài giây.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Option 1: Redeliver webhook */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                <h4 className="font-semibold text-sm flex items-center gap-1.5"><Webhook className="h-4 w-4" /> Redeliver webhook (nhanh nhất)</h4>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Mở Recent Deliveries → tìm delivery mới nhất → bấm <b>Redeliver</b>. Lovable sẽ nhận webhook và pull lại.
              </p>
              <div className="pl-8">
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a href={`${REPO_URL}/settings/hooks`} target="_blank" rel="noopener noreferrer">
                    Mở Webhooks Settings <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Option 2: Empty commit */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <h4 className="font-semibold text-sm flex items-center gap-1.5"><GitCommit className="h-4 w-4" /> Push empty commit lên main</h4>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Chạy lệnh này trên máy bạn — tạo 1 commit rỗng để webhook tự fire:
              </p>
              <div className="pl-8 flex items-start gap-2">
                <code className="flex-1 text-[11px] bg-muted rounded p-2 font-mono break-all">{EMPTY_COMMIT_CMD}</code>
                <Button variant="outline" size="sm" onClick={copyCmd} className="shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Option 3: Edit + commit on GitHub UI */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
                <h4 className="font-semibold text-sm flex items-center gap-1.5"><Github className="h-4 w-4" /> Sửa file trực tiếp trên GitHub</h4>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Nếu không dùng git CLI: mở <code className="text-[11px]">README.md</code> trên GitHub → bấm bút chì → thêm 1 ký tự → Commit thẳng vào main.
              </p>
              <div className="pl-8">
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a href={`${REPO_URL}/edit/main/README.md`} target="_blank" rel="noopener noreferrer">
                    Mở README để sửa <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" asChild className="gap-1.5">
              <a href={`${REPO_URL}/commits/main`} target="_blank" rel="noopener noreferrer">
                Xem commits trên main <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button onClick={() => setOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

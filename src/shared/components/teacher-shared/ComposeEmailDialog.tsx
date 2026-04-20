import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@shared/components/ui/dialog";
import { Loader2, Send, X, Users, User } from "lucide-react";

interface Recipient {
  email: string;
  name: string;
}

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients?: Recipient[];
  className?: string;
  classId?: string;
  defaultSubject?: string;
}

export default function ComposeEmailDialog({
  open, onOpenChange, recipients = [], className, classId, defaultSubject = "",
}: ComposeEmailDialogProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [removedRecipients, setRemovedRecipients] = useState<Set<string>>(new Set());

  const activeRecipients = recipients.filter(r => !removedRecipients.has(r.email));

  const handleRemoveRecipient = (email: string) => {
    setRemovedRecipients(prev => new Set([...prev, email]));
  };

  const handleSend = async () => {
    if (!user || activeRecipients.length === 0 || !subject.trim() || !body.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề, nội dung và có ít nhất 1 người nhận");
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Phiên đăng nhập hết hạn"); setSending(false); return; }

      // Get sender info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const senderName = profile?.full_name || user.email || "Giáo viên";
      const senderEmail = user.email || "";

      // Convert plain text body to HTML
      const bodyHtml = body.split("\n").map(line => `<p>${line || "&nbsp;"}</p>`).join("");

      // Record in teacher_emails table
      const { data: emailRecord, error: recordError } = await supabase
        .from("teacher_emails" as any)
        .insert({
          sender_user_id: user.id,
          sender_name: senderName,
          sender_email: senderEmail,
          reply_to: senderEmail,
          recipient_emails: activeRecipients.map(r => r.email),
          class_id: classId || null,
          subject: subject.trim(),
          body_html: bodyHtml,
          body_text: body.trim(),
          status: "sending",
          metadata: { class_name: className || null },
        } as any)
        .select("id")
        .single();

      if (recordError) throw recordError;

      // Send emails to each recipient
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of activeRecipients) {
        try {
          const res = await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "teacher-message",
              recipientEmail: recipient.email,
              replyTo: senderEmail,
              idempotencyKey: `teacher-msg-${(emailRecord as any).id}-${recipient.email}`,
              templateData: {
                teacherName: senderName,
                studentName: recipient.name,
                subject: subject.trim(),
                messageBody: bodyHtml,
                className: className || "",
              },
            },
          });
          if (res.error) {
            failedCount++;
          } else {
            sentCount++;
          }
        } catch {
          failedCount++;
        }
      }

      // Update record status
      await supabase
        .from("teacher_emails" as any)
        .update({
          status: failedCount === 0 ? "sent" : failedCount === activeRecipients.length ? "failed" : "partial",
          sent_count: sentCount,
          failed_count: failedCount,
        } as any)
        .eq("id", (emailRecord as any).id);

      if (failedCount === 0) {
        toast.success(`Đã gửi email đến ${sentCount} người thành công!`);
      } else {
        toast.warning(`Gửi: ${sentCount} thành công, ${failedCount} thất bại`);
      }

      // Reset form
      setSubject("");
      setBody("");
      setRemovedRecipients(new Set());
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
    setSending(false);
  };

  const handleClose = () => {
    if (!sending) {
      setSubject(defaultSubject);
      setBody("");
      setRemovedRecipients(new Set());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Soạn email
          </DialogTitle>
          <DialogDescription>
            Gửi email cá nhân hoá đến học viên qua hệ thống Learning Plus. Email trả lời sẽ về địa chỉ email của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Người nhận ({activeRecipients.length})
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-muted/20 max-h-24 overflow-y-auto">
              {activeRecipients.length === 0 ? (
                <p className="text-xs text-muted-foreground">Không có người nhận</p>
              ) : (
                activeRecipients.map(r => (
                  <Badge key={r.email} variant="secondary" className="text-[11px] gap-1 pr-1">
                    <User className="h-3 w-3" />
                    {r.name}
                    <button onClick={() => handleRemoveRecipient(r.email)} className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Class info */}
          {className && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Lớp: <span className="font-medium text-foreground">{className}</span>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Tiêu đề
            </label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Nhập tiêu đề email..."
              disabled={sending}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Nội dung
            </label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Nhập nội dung email..."
              rows={6}
              disabled={sending}
              className="resize-none"
            />
          </div>

          {/* Send */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={sending}>
              Hủy
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || activeRecipients.length === 0 || !subject.trim() || !body.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? "Đang gửi..." : `Gửi (${activeRecipients.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

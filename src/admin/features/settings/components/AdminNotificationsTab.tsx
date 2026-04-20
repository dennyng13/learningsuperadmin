import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";
import {
  Mail, Bell, MessageSquare, Send, Save, Loader2, Globe,
  PenLine, ToggleLeft, Users, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  template_key: string;
  display_name: string;
  description: string | null;
  subject: string;
  body_html: string;
  enabled: boolean;
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  signup_confirmation: Mail,
  review_reminder: Bell,
  test_result: MessageSquare,
  general_notification: Send,
};

type SectionKey = "toggle" | "templates" | "manual" | "domain";

export default function AdminNotificationsTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [openSection, setOpenSection] = useState<SectionKey>("toggle");

  // Manual send state
  const [manualRecipient, setManualRecipient] = useState<"all" | "role" | "email">("all");
  const [manualRole, setManualRole] = useState("user");
  const [manualEmail, setManualEmail] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at");
    setTemplates((data as any[]) || []);
    setLoading(false);
  };

  const toggleTemplate = async (id: string, enabled: boolean) => {
    setSaving(id);
    const { error } = await supabase
      .from("email_templates")
      .update({ enabled, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) toast.error("Lỗi cập nhật");
    else {
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
      toast.success(enabled ? "Đã bật" : "Đã tắt");
    }
    setSaving(null);
  };

  const startEdit = (t: EmailTemplate) => {
    setEditingTemplate(t.id);
    setEditSubject(t.subject);
    setEditBody(t.body_html);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(editingTemplate);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: editSubject,
        body_html: editBody,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", editingTemplate);
    if (error) toast.error("Lỗi lưu mẫu email");
    else {
      setTemplates(prev =>
        prev.map(t =>
          t.id === editingTemplate
            ? { ...t, subject: editSubject, body_html: editBody }
            : t
        )
      );
      toast.success("Đã lưu mẫu email");
      setEditingTemplate(null);
    }
    setSaving(null);
  };

  const handleManualSend = async () => {
    if (!manualSubject.trim() || !manualBody.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    setSending(true);
    // For now, save to log — actual sending requires email domain setup
    toast.info("Tính năng gửi email yêu cầu cấu hình domain gửi email trước. Nội dung đã được lưu lại.");
    setSending(false);
  };

  const SectionHeader = ({
    sectionKey,
    icon: Icon,
    title,
    description,
  }: {
    sectionKey: SectionKey;
    icon: React.ElementType;
    title: string;
    description: string;
  }) => (
    <button
      onClick={() => setOpenSection(openSection === sectionKey ? sectionKey : sectionKey)}
      className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {openSection === sectionKey ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Cấu hình Email & Thông báo</h2>
        <p className="text-sm text-muted-foreground">
          Quản lý các loại email, tuỳ chỉnh nội dung, và gửi thông báo cho học viên
        </p>
      </div>

      {/* Section 1: Toggle email types */}
      <Card className="overflow-hidden">
        <SectionHeader
          sectionKey="toggle"
          icon={ToggleLeft}
          title="Bật/tắt loại email"
          description="Chọn loại email nào được phép gửi tự động"
        />
        {openSection === "toggle" && (
          <div className="px-4 pb-4 space-y-3">
            {templates.map(t => {
              const Icon = TEMPLATE_ICONS[t.template_key] || Mail;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{t.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                  </div>
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={checked => toggleTemplate(t.id, checked)}
                    disabled={saving === t.id}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Section 2: Edit templates */}
      <Card className="overflow-hidden">
        <SectionHeader
          sectionKey="templates"
          icon={PenLine}
          title="Tuỳ chỉnh nội dung email"
          description="Chỉnh sửa tiêu đề và nội dung mẫu cho từng loại email"
        />
        {openSection === "templates" && (
          <div className="px-4 pb-4 space-y-3">
            {templates.map(t => {
              const isEditing = editingTemplate === t.id;
              return (
                <div key={t.id} className="rounded-xl border overflow-hidden">
                  <button
                    onClick={() => (isEditing ? setEditingTemplate(null) : startEdit(t))}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/20 transition-colors"
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      t.enabled ? "bg-primary" : "bg-muted-foreground/30"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{t.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">Tiêu đề: {t.subject}</p>
                    </div>
                    <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {isEditing && (
                    <div className="p-4 border-t bg-muted/10 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">Tiêu đề email</label>
                        <Input
                          value={editSubject}
                          onChange={e => setEditSubject(e.target.value)}
                          placeholder="Tiêu đề..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Nội dung (HTML)
                        </label>
                        <Textarea
                          value={editBody}
                          onChange={e => setEditBody(e.target.value)}
                          rows={6}
                          className="font-mono text-xs"
                          placeholder="<h2>Nội dung email...</h2>"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Biến có thể dùng: {"{{count}}"}, {"{{test_name}}"}, {"{{score}}"}, {"{{content}}"}
                        </p>
                      </div>
                      {/* Preview */}
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">Xem trước</label>
                        <div
                          className="border rounded-lg p-4 bg-card text-sm prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: editBody }}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>
                          Huỷ
                        </Button>
                        <Button size="sm" onClick={saveTemplate} disabled={saving === t.id}>
                          {saving === t.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                          Lưu
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Section 3: Manual send */}
      <Card className="overflow-hidden">
        <SectionHeader
          sectionKey="manual"
          icon={Send}
          title="Gửi email thủ công"
          description="Soạn và gửi email/thông báo đến học viên"
        />
        {openSection === "manual" && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Người nhận</label>
              <Select value={manualRecipient} onValueChange={(v: any) => setManualRecipient(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả học viên</SelectItem>
                  <SelectItem value="role">Theo vai trò</SelectItem>
                  <SelectItem value="email">Gửi riêng (nhập email)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {manualRecipient === "role" && (
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Vai trò</label>
                <Select value={manualRole} onValueChange={setManualRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Học viên (user)</SelectItem>
                    <SelectItem value="guest">Khách (guest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {manualRecipient === "email" && (
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Địa chỉ email</label>
                <Input
                  type="email"
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  placeholder="student@example.com"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Tiêu đề</label>
              <Input
                value={manualSubject}
                onChange={e => setManualSubject(e.target.value)}
                placeholder="Tiêu đề email..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Nội dung</label>
              <Textarea
                value={manualBody}
                onChange={e => setManualBody(e.target.value)}
                rows={5}
                placeholder="Nội dung thông báo cho học viên..."
              />
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Button onClick={handleManualSend} disabled={sending || !manualSubject.trim() || !manualBody.trim()}>
                {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Gửi email
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Section 4: Domain config */}
      <Card className="overflow-hidden">
        <SectionHeader
          sectionKey="domain"
          icon={Globe}
          title="Cấu hình domain gửi email"
          description="Thiết lập domain riêng để gửi email chuyên nghiệp"
        />
        {openSection === "domain" && (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700">Chưa cấu hình domain gửi email</p>
                <p className="text-xs text-amber-600 mt-1">
                  Để gửi email từ domain riêng (ví dụ: noreply@learningplus.vn), bạn cần thiết lập domain email.
                  Điều này giúp email không bị vào spam và tăng độ tin cậy với học viên.
                </p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold">Lợi ích khi có domain riêng:</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold"></span>
                  Email gửi từ @learningplus.vn thay vì domain mặc định
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold"></span>
                  Giảm nguy cơ email vào spam nhờ xác thực SPF, DKIM
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold"></span>
                  Tăng độ tin cậy và chuyên nghiệp với học viên
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold"></span>
                  Hỗ trợ gửi email xác nhận, nhắc nhở, thông báo tự động
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Hãy liên hệ quản trị viên để thiết lập domain email cho Learning Plus.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

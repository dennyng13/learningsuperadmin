import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Mail, Eye, Code, Save, Loader2, ShieldCheck, Send } from "lucide-react";

interface EmailTemplate {
  id: string;
  template_key: string;
  display_name: string;
  subject: string;
  body_html: string;
  description: string | null;
  enabled: boolean;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  auth:"Xác thực",
  trans:"App email",
  other:"Khác",
};

function categorize(key: string) {
  if (key.startsWith("auth_")) return "auth";
  if (key.startsWith("trans_")) return "trans";
  return "other";
}

export default function AdminEmailTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"code" | "preview">("code");

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("template_key");
    if (error) {
      toast.error("Không thể tải danh sách mẫu email");
      return;
    }
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEditor = (t: EmailTemplate) => {
    setEditing(t);
    setEditSubject(t.subject);
    setEditHtml(t.body_html);
    setEditEnabled(t.enabled);
    setEditorMode("code");
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: editSubject,
        body_html: editHtml,
        enabled: editEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error("Lưu thất bại: " + error.message);
      return;
    }
    toast.success("Đã lưu mẫu email");
    setPreviewOpen(false);
    fetchTemplates();
  };

  const toggleEnabled = async (t: EmailTemplate) => {
    const { error } = await supabase
      .from("email_templates")
      .update({ enabled: !t.enabled, updated_at: new Date().toISOString() })
      .eq("id", t.id);
    if (error) {
      toast.error("Không thể cập nhật trạng thái");
      return;
    }
    fetchTemplates();
  };

  const grouped = templates.reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    const cat = categorize(t.template_key);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const renderPreviewHtml = () => {
    // Simple mustache-like replacement for preview
    return editHtml
      .replace(/\{\{name\}\}/g, "Minh")
      .replace(/\{\{recipient\}\}/g, "minh@example.com")
      .replace(/\{\{siteUrl\}\}/g, "https://learningplus.vn")
      .replace(/\{\{confirmationUrl\}\}/g, "#")
      .replace(/\{\{newEmail\}\}/g, "newemail@example.com")
      .replace(/\{\{token\}\}/g, "123456")
      .replace(/\{\{courseName\}\}/g, "IELTS Band 7")
      .replace(/\{\{date\}\}/g, "20/01/2026")
      .replace(/\{\{time\}\}/g, "14:00")
      .replace(/\{\{content\}\}/g, "Đây là nội dung thông báo mẫu.")
      .replace(/\{\{count\}\}/g, "5")
      .replace(/\{\{test_name\}\}/g, "Reading Test 1")
      .replace(/\{\{score\}\}/g, "7.5")
      .replace(/\{\{#\w+\}\}([\s\S]*?)\{\{\/\w+\}\}/g, "$1")
      .replace(/\{\{\^\w+\}\}[\s\S]*?\{\{\/\w+\}\}/g, "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Mẫu email</h2>
        <Badge variant="secondary" className="ml-auto">{templates.length} mẫu</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Tuỳ chỉnh nội dung và tiêu đề email. Hỗ trợ HTML đầy đủ. Sử dụng <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{{biến}}"}</code> để chèn dữ liệu động.
      </p>

      {(["auth", "trans", "other"] as const).map((cat) => {
        const items = grouped[cat];
        if (!items?.length) return null;
        return (
          <div key={cat} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid gap-3">
              {items.map((t) => (
                <Card key={t.id} className="border">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{t.display_name}</p>
                        <Badge variant={t.enabled ? "default" : "outline"} className="text-[10px] shrink-0">
                          {t.enabled ? "Bật" : "Tắt"}
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tiêu đề: <span className="text-foreground">{t.subject}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={t.enabled}
                        onCheckedChange={() => toggleEnabled(t)}
                        aria-label="Bật/tắt template"
                      />
                      <Button variant="outline" size="sm" onClick={() => openEditor(t)}>
                        <Code className="h-3.5 w-3.5 mr-1" /> Sửa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Editor Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {editing?.display_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs">Tiêu đề email</Label>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Tiêu đề..."
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Label className="text-xs">Bật</Label>
                <Switch checked={editEnabled} onCheckedChange={setEditEnabled} />
              </div>
            </div>

            {editing?.description && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                ℹ {editing.description}
              </p>
            )}

            <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as "code" | "preview")}>
              <TabsList className="grid w-full grid-cols-2 max-w-xs">
                <TabsTrigger value="code" className="gap-1.5">
                  <Code className="h-3.5 w-3.5" /> HTML
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Xem trước
                </TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="mt-3">
                <Textarea
                  value={editHtml}
                  onChange={(e) => setEditHtml(e.target.value)}
                  className="font-mono text-xs min-h-[400px] leading-relaxed"
                  placeholder="<h1>Nội dung HTML...</h1>"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Biến: <code>{"{{recipient}}"}</code>, <code>{"{{confirmationUrl}}"}</code>, <code>{"{{siteUrl}}"}</code>, <code>{"{{token}}"}</code>, <code>{"{{name}}"}</code>, <code>{"{{newEmail}}"}</code>, <code>{"{{date}}"}</code>, <code>{"{{time}}"}</code>, <code>{"{{courseName}}"}</code>
                </p>
              </TabsContent>

              <TabsContent value="preview" className="mt-3">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={renderPreviewHtml()}
                    className="w-full min-h-[400px] border-0"
                    title="Email Preview"
                    sandbox=""
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Lưu thay đổi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Badge } from "@shared/components/ui/badge";
import { Textarea } from "@shared/components/ui/textarea";
import { Loader2, Mail, Eye, Code, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  template_key: string;
  display_name: string;
  subject: string;
  body_html: string;
  description: string | null;
  enabled: boolean;
}

const PASSWORD_RESET_KEYS = ["auth_recovery", "auth_reset_password", "auth_password_reset", "password_reset"];

function applyVariables(html: string, vars: Record<string, string>) {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  // strip remaining mustache sections so preview stays clean
  out = out.replace(/\{\{#\w+\}\}([\s\S]*?)\{\{\/\w+\}\}/g, "$1");
  out = out.replace(/\{\{\^\w+\}\}[\s\S]*?\{\{\/\w+\}\}/g, "");
  return out;
}

function applySubject(subject: string, vars: Record<string, string>) {
  let out = subject;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return out;
}

export default function EmailTemplatePreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [name, setName] = useState("Nguyễn Minh");
  const [email, setEmail] = useState("minh@learningplus.vn");
  const [password, setPassword] = useState("Tạm thời: Lp@2026!");
  const [confirmationUrl, setConfirmationUrl] = useState("https://admin.learningplus.vn/reset-password?token=preview-token-123");
  const [view, setView] = useState<"preview" | "html">("preview");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("id, template_key, display_name, subject, body_html, description, enabled")
      .order("template_key");
    if (error) {
      toast.error("Không tải được templates: " + error.message);
      setLoading(false);
      return;
    }
    const list = (data || []) as EmailTemplate[];
    setTemplates(list);

    const fromUrl = searchParams.get("key");
    const initial =
      list.find((t) => t.template_key === fromUrl)?.template_key ||
      list.find((t) => PASSWORD_RESET_KEYS.includes(t.template_key))?.template_key ||
      list.find((t) => t.template_key.toLowerCase().includes("recovery") || t.template_key.toLowerCase().includes("reset"))?.template_key ||
      list[0]?.template_key ||
      "";
    setSelectedKey(initial);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = useMemo(
    () => templates.find((t) => t.template_key === selectedKey),
    [templates, selectedKey],
  );

  const variables = useMemo(
    () => ({
      name,
      recipient: email,
      email,
      newEmail: email,
      password,
      confirmationUrl,
      siteUrl: "https://admin.learningplus.vn",
      token: "123456",
    }),
    [name, email, password, confirmationUrl],
  );

  const renderedHtml = useMemo(
    () => (current ? applyVariables(current.body_html, variables) : ""),
    [current, variables],
  );
  const renderedSubject = useMemo(
    () => (current ? applySubject(current.subject, variables) : ""),
    [current, variables],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Xem trước template email</h1>
        <Badge variant="secondary" className="ml-auto">{templates.length} templates</Badge>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Dữ liệu mẫu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Template</Label>
              <Select
                value={selectedKey}
                onValueChange={(v) => {
                  setSelectedKey(v);
                  setSearchParams({ key: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.template_key}>
                      {t.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {current && (
                <p className="text-[11px] text-muted-foreground">
                  Key: <code>{current.template_key}</code>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="var-name" className="text-xs">{"{{name}}"}</Label>
              <Input id="var-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="var-email" className="text-xs">{"{{email}}"} / {"{{recipient}}"}</Label>
              <Input id="var-email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="var-password" className="text-xs">{"{{password}}"}</Label>
              <Input id="var-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="var-url" className="text-xs">{"{{confirmationUrl}}"}</Label>
              <Textarea
                id="var-url"
                value={confirmationUrl}
                onChange={(e) => setConfirmationUrl(e.target.value)}
                className="text-xs font-mono min-h-[60px]"
              />
            </div>

            <Button variant="outline" size="sm" className="w-full" onClick={fetchTemplates}>
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Tải lại templates
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm truncate">
                  {current?.display_name || "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Tiêu đề: <span className="text-foreground">{renderedSubject || "—"}</span>
                </p>
              </div>
              {current && (
                <Badge variant={current.enabled ? "default" : "outline"} className="shrink-0 text-[10px]">
                  {current.enabled ? "Đang bật" : "Đã tắt"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!current ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Không tìm thấy template. Hãy kiểm tra lại bảng <code>email_templates</code>.
              </div>
            ) : (
              <Tabs value={view} onValueChange={(v) => setView(v as "preview" | "html")}>
                <TabsList className="grid w-full grid-cols-2 max-w-xs">
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Hiển thị
                  </TabsTrigger>
                  <TabsTrigger value="html" className="gap-1.5">
                    <Code className="h-3.5 w-3.5" /> HTML
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-3">
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={renderedHtml}
                      title="Email Preview"
                      className="w-full min-h-[600px] border-0"
                      sandbox=""
                    />
                  </div>
                </TabsContent>

                <TabsContent value="html" className="mt-3">
                  <Textarea
                    readOnly
                    value={renderedHtml}
                    className="font-mono text-xs min-h-[600px] leading-relaxed"
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
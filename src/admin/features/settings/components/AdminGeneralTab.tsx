import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import { Separator } from "@shared/components/ui/separator";
import { Globe, Clock, Building2, FileSignature, Loader2, Save, Image as ImageIcon, AlertTriangle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { toast } from "sonner";
import {
  getPartyASettings,
  updatePartyASettings,
  type PartyAOrgSettings,
} from "@admin/features/contracts/hooks/useContracts";
import { refreshOrgShortName } from "@shared/hooks/useOrgShortName";

const EMPTY: PartyAOrgSettings = {
  legal_name: "",
  short_name: "",
  business_id: "",
  address: "",
  representative_name: "",
  representative_title: "",
  phone: "",
  email: "",
  bank_account_number: "",
  bank_name: "",
};

/**
 * Cấu hình chung — bao gồm form Bên A (Party A) dùng làm snapshot mặc định
 * mỗi khi tạo hợp đồng mới. Mọi field tại đây sẽ được copy vào
 * `contracts.party_a_snapshot` để giữ tính bất biến của tài liệu pháp lý.
 */
export default function AdminGeneralTab() {
  const [data, setData] = useState<PartyAOrgSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await getPartyASettings();
        if (cancelled) return;
        setData({ ...EMPTY, ...(remote ?? {}) });
      } catch {
        if (!cancelled) toast.error("Không tải được cấu hình Bên A");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const set = <K extends keyof PartyAOrgSettings>(key: K, value: PartyAOrgSettings[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!data.legal_name?.trim()) {
      toast.error("Tên pháp lý (legal_name) là bắt buộc");
      return;
    }
    setSaving(true);
    try {
      await updatePartyASettings(data);
      refreshOrgShortName(data.short_name ?? "");
      toast.success("Đã lưu cấu hình Bên A — hợp đồng mới sẽ dùng thông tin này");
      setDirty(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không lưu được: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Cấu hình chung</h2>
        <p className="text-sm text-muted-foreground">
          Thông tin trung tâm — dùng làm Bên A mặc định khi tạo hợp đồng mới.
        </p>
      </div>

      {/* System info — read only for now */}
      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard icon={<Building2 className="h-5 w-5 text-primary" />} label="Trung tâm" value={data.legal_name || "Chưa cấu hình"} />
        <InfoCard icon={<Clock className="h-5 w-5 text-primary" />} label="Múi giờ" value="Asia/Ho_Chi_Minh (UTC+7)" />
        <InfoCard icon={<Globe className="h-5 w-5 text-primary" />} label="Website" value="ieltspractice.lovable.app" />
      </div>

      {/* Party A form */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSignature className="h-4 w-4 text-primary" />
              Bên A — Thông tin pháp lý của trung tâm
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Thông tin định danh trung tâm — dùng làm Bên A khi tạo hợp đồng mới.
              Mỗi hợp đồng sẽ <strong>snapshot</strong> dữ liệu tại thời điểm tạo, nên sửa ở đây
              <em> không </em>ảnh hưởng các hợp đồng đã ký.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || !dirty || loading} size="sm" className="shrink-0">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Lưu
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải…
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <Section title="Pháp nhân">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Tên pháp lý *"
                    hint="VD: Công ty TNHH Learning Plus"
                    tooltip="Tên đầy đủ trên Giấy đăng ký kinh doanh. Sẽ in nguyên văn trên hợp đồng — phải khớp với hồ sơ pháp lý."
                  >
                    <Input value={data.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} placeholder="Tên đầy đủ trên đăng ký kinh doanh" />
                  </Field>
                  <Field
                    label="Tên viết tắt tổ chức"
                    hint="VD: Learn+ / Learning Plus"
                    tooltip="Tên thương hiệu hiển thị ở sidebar, header và favicon của Admin Portal. Không dùng trong hợp đồng. Nếu kết thúc bằng dấu '+' sẽ tự được tô màu nhấn."
                  >
                    <Input value={data.short_name ?? ""} onChange={(e) => set("short_name", e.target.value)} placeholder="VD: Learn+" />
                  </Field>
                  <Field
                    label="Mã số thuế / Business ID"
                    hint="MST hoặc số ĐKKD"
                    tooltip="Mã số thuế 10–13 chữ số. Bắt buộc với hợp đồng có chi trả lương để xuất hoá đơn / khấu trừ TNCN."
                  >
                    <Input value={data.business_id ?? ""} onChange={(e) => set("business_id", e.target.value)} placeholder="VD: 0312345678" />
                  </Field>
                  <Field
                    label="Địa chỉ trụ sở"
                    className="sm:col-span-2"
                    tooltip="Địa chỉ ghi trên hợp đồng. Nên ghi đầy đủ: số nhà → phường → quận/huyện → tỉnh/thành phố."
                  >
                    <Textarea value={data.address ?? ""} onChange={(e) => set("address", e.target.value)} rows={2} placeholder="Số nhà, đường, phường, quận, tỉnh/thành phố" />
                  </Field>
                </div>
              </Section>

              <Separator />

              <Section title="Người đại diện ký hợp đồng">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Họ và tên người đại diện"
                    tooltip="Người ký Bên A trên hợp đồng. Có thể khác nhau theo từng hợp đồng — đây chỉ là giá trị mặc định."
                  >
                    <Input value={data.representative_name ?? ""} onChange={(e) => set("representative_name", e.target.value)} placeholder="VD: Nguyễn Văn A" />
                  </Field>
                  <Field
                    label="Chức danh"
                    tooltip="Chức danh in dưới chữ ký. VD: Giám đốc, Tổng giám đốc, Trưởng phòng Đào tạo…"
                  >
                    <Input value={data.representative_title ?? ""} onChange={(e) => set("representative_title", e.target.value)} placeholder="VD: Giám đốc / Tổng giám đốc" />
                  </Field>
                </div>
              </Section>

              <Separator />

              <Section title="Liên hệ">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Số điện thoại"
                    tooltip="Hotline trung tâm — hiển thị trong hợp đồng và email tự động gửi cho giáo viên/học viên."
                  >
                    <Input value={data.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="VD: 0901 234 567" />
                  </Field>
                  <Field
                    label="Email liên hệ"
                    tooltip="Email công khai của trung tâm. Khác với email gửi đi (cấu hình tại tab Email)."
                  >
                    <Input type="email" value={data.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="contact@learningplus.vn" />
                  </Field>
                </div>
              </Section>

              <Separator />

              <Section title="Tài khoản ngân hàng (cho thanh toán & bảng lương)">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Tên ngân hàng"
                    tooltip="Ghi rõ ngân hàng + chi nhánh để giáo viên dễ chuyển khoản hoàn phí (nếu có)."
                  >
                    <Input value={data.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value)} placeholder="VD: Vietcombank — CN Sài Gòn" />
                  </Field>
                  <Field
                    label="Số tài khoản"
                    tooltip="Số tài khoản trung tâm dùng nhận học phí. Sẽ in trên hợp đồng và email xác nhận thanh toán."
                  >
                    <Input value={data.bank_account_number ?? ""} onChange={(e) => set("bank_account_number", e.target.value)} placeholder="VD: 0123 4567 8910" />
                  </Field>
                </div>
              </Section>

              <Separator />

              <Section title="Logo & chữ ký">
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 flex items-start gap-3">
                  <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1 flex-1">
                    <p className="font-medium">Logo trung tâm dùng trong hợp đồng & email</p>
                    <p className="text-xs text-muted-foreground">
                      Quản lý tập trung tại Brand Assets (slot <code className="font-mono bg-muted/60 rounded px-1">logo-main</code>) — sidebar, login, favicon và hợp đồng PDF dùng chung.
                    </p>
                    <Link
                      to="/admin/brand-assets"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-1"
                    >
                      → Mở trang Brand Assets
                    </Link>
                  </div>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 flex items-start gap-2 text-xs text-warning-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                  <span>
                    Chữ ký số của người đại diện được upload riêng tại trang <strong>chi tiết hợp đồng</strong> khi ký từng bản — không lưu chung ở đây để đảm bảo audit trail.
                  </span>
                </div>
              </Section>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────── Helpers ─────────── */

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, hint, tooltip, className, children,
}: { label: string; hint?: string; tooltip?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Hướng dẫn: ${label}`}
                className="text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <HelpCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

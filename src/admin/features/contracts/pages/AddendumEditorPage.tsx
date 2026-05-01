import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Textarea } from "@shared/components/ui/textarea";
import { Button } from "@shared/components/ui/button";
import {
  AlertCircle, ArrowLeft, FileText, Loader2, Save,
} from "lucide-react";
import { toast } from "sonner";
import { useAddendumDetail, updateAddendumMeta } from "../hooks/useAddendums";
import { formatDateTimeDDMMYYYY } from "@shared/utils/dateFormat";
import AddendumStatusBadge from "../components/AddendumStatusBadge";
import AddendumPayRatesEditor from "../components/AddendumPayRatesEditor";
import AddendumActionsPanel from "../components/AddendumActionsPanel";
import AddendumCustomFieldsTab from "../components/AddendumCustomFieldsTab";
import { PartyAView, PartyBView } from "../components/PartyTablesView";
import SignaturesTab from "../components/SignaturesTab";
import StatusTimeline from "@shared/components/StatusTimeline";
import DetailSkeleton from "@shared/components/DetailSkeleton";
import EmptyState from "@shared/components/EmptyState";
import { getAddendumTimeline } from "../utils/statusTimeline";
import type { ContractSignatureRow } from "../types";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function AddendumEditorPage() {
  const { contractId, addendumId } = useParams<{ contractId: string; addendumId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAddendumDetail(addendumId);
  const backRoute = contractId ? `/contracts/${contractId}` : "/contracts";

  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [notes, setNotes] = useState("");
  const [autoArchive, setAutoArchive] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaDirty, setMetaDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setEffectiveFrom(data.effective_from ?? "");
      setEffectiveTo(data.effective_to ?? "");
      setNotes(data.notes ?? "");
      setAutoArchive(data.auto_archive_on_activate);
      setMetaDirty(false);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backRoute)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Hợp đồng
        </Button>
        <DetailSkeleton rows={3} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backRoute)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Hợp đồng
        </Button>
        <Card>
          <CardContent className="py-6 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error || "Không tìm thấy phụ lục"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = data.status;
  const metaEditable = status === "draft" || status === "revision_requested";
  const ratesEditable = metaEditable;
  const timeline = getAddendumTimeline(status);

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      await updateAddendumMeta(data.id, {
        effective_from: effectiveFrom || null,
        effective_to: effectiveTo || null,
        notes: notes || null,
        auto_archive_on_activate: autoArchive,
      });
      toast.success("Đã lưu thông tin chung");
      setMetaDirty(false);
      void refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lưu lỗi");
    } finally {
      setSavingMeta(false);
    }
  };

  // Map addendum signatures shape to ContractSignatureRow shape used by SignaturesTab.
  const sigRows: ContractSignatureRow[] = data.signatures.map((s) => ({
    id: s.id,
    contract_id: data.contract_id,
    party: s.party,
    signer_user_id: s.signed_by,
    signer_name: null,
    signature_image_url: s.signature_image_url,
    ip_address: s.ip_address,
    user_agent: s.user_agent,
    signed_at: s.signed_at,
    archived_at: s.archived_at,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(backRoute)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Hợp đồng
        </Button>
        <AddendumStatusBadge status={status} />
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>Phụ lục hợp đồng · {data.contract.contract_number}</span>
            </div>
            <h1 className="text-xl font-semibold mt-0.5">{data.addendum_number}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {data.contract.teacher_full_name ?? "—"} · Hiệu lực {formatDate(data.effective_from)}
              {data.effective_to ? ` – ${formatDate(data.effective_to)}` : ""}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <StatusTimeline steps={timeline} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="rates">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="rates">Thù lao & Thông tin</TabsTrigger>
              <TabsTrigger value="custom">Tùy chỉnh</TabsTrigger>
              <TabsTrigger value="parties">Hai bên</TabsTrigger>
              <TabsTrigger value="signatures">Chữ ký</TabsTrigger>
              <TabsTrigger value="audit">Lịch sử</TabsTrigger>
            </TabsList>

            <TabsContent value="rates" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bảng thù lao</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddendumPayRatesEditor
                    addendumId={data.id}
                    rates={data.pay_rates}
                    readOnly={!ratesEditable}
                    onMutated={refresh}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin chung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Số phụ lục</Label>
                      <Input value={data.addendum_number} disabled />
                    </div>
                    <div>
                      <Label className="text-xs">Trạng thái</Label>
                      <div className="h-9 flex items-center">
                        <AddendumStatusBadge status={status} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Hiệu lực từ</Label>
                      <Input
                        type="date"
                        value={effectiveFrom ?? ""}
                        onChange={(e) => { setEffectiveFrom(e.target.value); setMetaDirty(true); }}
                        disabled={!metaEditable}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Đến (tùy chọn)</Label>
                      <Input
                        type="date"
                        value={effectiveTo ?? ""}
                        onChange={(e) => { setEffectiveTo(e.target.value); setMetaDirty(true); }}
                        disabled={!metaEditable}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Ghi chú</Label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); setMetaDirty(true); }}
                      disabled={!metaEditable}
                    />
                  </div>
                  <div className="flex items-start justify-between p-3 rounded-md bg-muted/40 gap-3">
                    <div>
                      <p className="text-sm font-medium">Tự thay thế phụ lục cũ khi có hiệu lực</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Khi phụ lục này được ký đầy đủ, các phụ lục đang hiệu lực khác của hợp đồng
                        sẽ tự chuyển sang Đã thay thế. Tắt để cùng tồn tại.
                      </p>
                    </div>
                    <Switch
                      checked={autoArchive}
                      onCheckedChange={(v) => { setAutoArchive(v); setMetaDirty(true); }}
                      disabled={!metaEditable}
                    />
                  </div>
                  {metaEditable && (
                    <div className="flex justify-end">
                      <Button onClick={saveMeta} disabled={!metaDirty || savingMeta}>
                        {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        Lưu thông tin chung
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <AddendumCustomFieldsTab
                addendumId={data.id}
                status={status}
                bodyMd={data.body_md_snapshot ?? ""}
                fieldsSnapshot={data.template_fields_snapshot}
                values={data.custom_fields}
                onMutated={refresh}
              />
            </TabsContent>

            <TabsContent value="parties" className="mt-4 space-y-4">
              <PartyAView snapshot={data.party_a_snapshot} />
              <PartyBView snapshot={data.party_b_snapshot} />
            </TabsContent>

            <TabsContent value="signatures" className="mt-4">
              <SignaturesTab signatures={sigRows} />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch sử thao tác</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.audit_log.length === 0 ? (
                    <EmptyState title="Chưa có sự kiện nào." />
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {data.audit_log.map((log) => (
                        <li key={log.id} className="border-l-2 border-border pl-3 py-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{log.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTimeDDMMYYYY(log.created_at)}
                            </span>
                          </div>
                          {(log.from_status || log.to_status) && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {log.from_status ?? "—"} → {log.to_status ?? "—"}
                            </div>
                          )}
                          {log.notes && <div className="text-xs mt-0.5">{log.notes}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <AddendumActionsPanel addendum={data} onMutated={refresh} />
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Tiến trình</div>
            <StatusTimeline steps={timeline} vertical />
          </div>
        </div>
      </div>
    </div>
  );
}

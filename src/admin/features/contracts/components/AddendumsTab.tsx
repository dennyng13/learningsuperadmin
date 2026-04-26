import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Alert, AlertDescription } from "@shared/components/ui/alert";
import { ChevronRight, FileSignature, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AddendumStatusBadge from "./AddendumStatusBadge";
import CustomFieldsForm from "./CustomFieldsForm";
import { createAddendum, useAddendumList } from "../hooks/useAddendums";
import {
  useAddendumTemplatesList,
  useAddendumTemplateWithFields,
} from "../hooks/useAddendumTemplates";
import { useContractTemplateWithFields } from "../hooks/useContracts";
import { validateCustomFields } from "../utils/customFields";
import type {
  AddendumListItem,
  ContractStatus,
  ContractTemplateFieldRow,
} from "../types";

interface Props {
  contractId: string;
  contractStatus: ContractStatus;
  contractTemplateId?: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function AddendumsTab({ contractId, contractStatus, contractTemplateId }: Props) {
  const { data, loading, error, refresh } = useAddendumList(contractId);
  const { data: templates, loading: tplLoading } = useAddendumTemplatesList(false);
  const { data: contractTemplate } = useContractTemplateWithFields(contractTemplateId ?? undefined);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState("");
  const [notes, setNotes] = useState("");
  const [autoArchive, setAutoArchive] = useState(true);
  const [autoArchiveTouched, setAutoArchiveTouched] = useState(false);
  const [addendumNumber, setAddendumNumber] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});

  const { data: templateWithFields } = useAddendumTemplateWithFields(templateId || undefined);
  const fields = useMemo(() => templateWithFields?.fields ?? [], [templateWithFields]);

  const defaultTemplateId = contractTemplate?.default_addendum_template_id ?? null;

  // Pre-select the contract template's default addendum template (if active).
  useEffect(() => {
    if (!open) return;
    if (templateId) return;
    if (defaultTemplateId && templates.some((t) => t.id === defaultTemplateId && t.is_active)) {
      setTemplateId(defaultTemplateId);
    }
  }, [open, defaultTemplateId, templates, templateId]);

  // Reset values + pre-fill defaults whenever template fields change.
  useEffect(() => {
    if (!fields.length) {
      setCustomValues({});
      return;
    }
    const next: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.default_value !== null && f.default_value !== undefined) {
        next[f.field_key] = f.default_value;
      }
    }
    setCustomValues(next);
  }, [fields]);

  // When admin picks a template, default auto-archive flag from template
  // (unless admin already manually flipped it).
  useEffect(() => {
    if (!templateWithFields) return;
    if (autoArchiveTouched) return;
    setAutoArchive(templateWithFields.default_auto_archive);
  }, [templateWithFields, autoArchiveTouched]);

  const missingCustom = useMemo(
    () => validateCustomFields(fields as unknown as ContractTemplateFieldRow[], customValues),
    [fields, customValues],
  );

  const canCreate =
    contractStatus === "active" ||
    contractStatus === "renewing" ||
    contractStatus === "awaiting_admin" ||
    contractStatus === "awaiting_teacher" ||
    contractStatus === "revision_requested" ||
    contractStatus === "draft";

  const reset = () => {
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setEffectiveTo("");
    setNotes("");
    setAutoArchive(true);
    setAutoArchiveTouched(false);
    setAddendumNumber("");
    setTemplateId("");
    setCustomValues({});
  };

  const submit = async () => {
    if (!effectiveFrom) {
      toast.error("Cần chọn ngày hiệu lực");
      return;
    }
    if (missingCustom.length) {
      toast.error(`Thiếu trường bắt buộc: ${missingCustom.join(", ")}`);
      return;
    }
    setSubmitting(true);
    try {
      await createAddendum({
        contract_id: contractId,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        notes: notes || null,
        auto_archive_on_activate: autoArchiveTouched ? autoArchive : null,
        addendum_number: addendumNumber || null,
        template_id: templateId || null,
        custom_fields: fields.length ? customValues : {},
      });
      toast.success("Đã tạo phụ lục mới (Đang soạn)");
      setOpen(false);
      reset();
      void refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không tạo được");
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = (a: AddendumListItem) => (
    <TableRow key={a.id} className={a.status === "superseded" ? "opacity-60" : ""}>
      <TableCell>
        <Link
          to={`/contracts/${contractId}/addendums/${a.id}`}
          className="font-medium text-primary hover:underline"
        >
          {a.addendum_number}
        </Link>
      </TableCell>
      <TableCell><AddendumStatusBadge status={a.status} /></TableCell>
      <TableCell className="text-sm">
        {formatDate(a.effective_from)}
        {a.effective_to ? ` – ${formatDate(a.effective_to)}` : ""}
      </TableCell>
      <TableCell className="text-center text-sm">{a.pay_rate_count}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {a.auto_archive_on_activate ? "Tự thay thế" : "Cùng tồn tại"}
      </TableCell>
      <TableCell className="text-right">
        <Link
          to={`/contracts/${contractId}/addendums/${a.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          Mở <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </TableCell>
    </TableRow>
  );

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Phụ lục thù lao</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Mỗi phụ lục có vòng ký riêng (giáo viên ký trước, admin ký sau). Phụ lục mới hiệu lực
            có thể tự động thay thế phụ lục cũ.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!canCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Phụ lục mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo phụ lục thù lao</DialogTitle>
              <DialogDescription>
                Tạo bản nháp. Bạn sẽ thêm các điều khoản thù lao chi tiết ở trang chỉnh sửa,
                rồi mới gửi cho giáo viên ký.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Template picker */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Template phụ lục (tùy chọn)
                </Label>
                <Select
                  value={templateId || "__none__"}
                  onValueChange={(v) => {
                    setTemplateId(v === "__none__" ? "" : v);
                    setAutoArchiveTouched(false);
                  }}
                  disabled={tplLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Không dùng template (tự nhập)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Không dùng template —</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.id === defaultTemplateId ? " (mặc định)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate?.description && (
                  <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>

              <div>
                <Label className="text-xs">Số phụ lục (để trống để tự sinh)</Label>
                <Input
                  placeholder="LP-PL-yymmdd-##"
                  value={addendumNumber}
                  onChange={(e) => setAddendumNumber(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Hiệu lực từ</Label>
                  <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Đến (tùy chọn)</Label>
                  <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Ghi chú</Label>
                <Textarea
                  rows={2}
                  placeholder="Tóm tắt thay đổi (tùy chọn)…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Custom fields */}
              {fields.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Thông tin tùy chỉnh</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Các trường được định nghĩa trong template &ldquo;{selectedTemplate?.name}&rdquo;.
                    </p>
                  </div>
                  <CustomFieldsForm
                    fields={fields as unknown as ContractTemplateFieldRow[]}
                    values={customValues}
                    onChange={setCustomValues}
                  />
                  {missingCustom.length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">
                        Thiếu: {missingCustom.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="flex items-start justify-between p-3 rounded-md bg-muted/40 gap-3">
                <div>
                  <p className="text-sm font-medium">Tự thay thế phụ lục cũ khi có hiệu lực</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Khi phụ lục này được ký đầy đủ, các phụ lục đang hiệu lực khác của hợp đồng sẽ
                    tự chuyển sang trạng thái Đã thay thế. Tắt nếu muốn nhiều phụ lục cùng tồn tại.
                  </p>
                </div>
                <Switch
                  checked={autoArchive}
                  onCheckedChange={(v) => { setAutoArchive(v); setAutoArchiveTouched(true); }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Tạo phụ lục
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground py-4">Đang tải…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && data.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">
            <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Hợp đồng này chưa có phụ lục thù lao.
            {canCreate && <div className="mt-1">Bấm "Phụ lục mới" để tạo bản đầu tiên.</div>}
          </div>
        )}
        {!loading && !error && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số phụ lục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời hạn</TableHead>
                <TableHead className="text-center">Số dòng</TableHead>
                <TableHead>Cờ</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{data.map(renderRow)}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

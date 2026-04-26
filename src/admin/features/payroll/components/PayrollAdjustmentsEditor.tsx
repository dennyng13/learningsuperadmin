import { useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  PAYROLL_ADJUSTMENT_TYPE_LABELS,
  type PayrollAdjustment,
  type PayrollAdjustmentType,
} from "../types";
import { upsertAdjustment, deleteAdjustment } from "../hooks/usePayroll";
import { formatVndSigned } from "../utils/format";

interface Props {
  payslipId: string;
  adjustments: PayrollAdjustment[];
  readOnly?: boolean;
  onMutated: () => void;
}

interface Draft {
  id?: string;
  type: PayrollAdjustmentType;
  label: string;
  amount_vnd: string;
  notes: string;
}

const EMPTY: Draft = { type: "bonus", label: "", amount_vnd: "", notes: "" };

// Whether a type defaults to a positive (bonus) or negative (penalty/advance/tax)
// adjustment. The UI normalises the sign when the user types a positive number.
const NEGATIVE_TYPES = new Set<PayrollAdjustmentType>(["penalty", "advance", "tax_pit"]);

export default function PayrollAdjustmentsEditor({
  payslipId, adjustments, readOnly, onMutated,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  const reset = () => { setDraft(EMPTY); setAdding(false); setEditingId(null); };

  const submit = async () => {
    const raw = Number(draft.amount_vnd);
    if (!draft.label.trim()) { toast.error("Vui lòng nhập nhãn"); return; }
    if (!draft.amount_vnd || isNaN(raw) || raw < 0) {
      toast.error("Số tiền không hợp lệ (nhập số dương — hệ thống tự đảo dấu)");
      return;
    }
    const signed = NEGATIVE_TYPES.has(draft.type) ? -Math.abs(raw) : Math.abs(raw);
    setBusy(true);
    try {
      await upsertAdjustment({
        id: editingId ?? null,
        payslipId,
        type: draft.type,
        label: draft.label.trim(),
        amountVnd: signed,
        notes: draft.notes.trim() || null,
      });
      toast.success(editingId ? "Đã lưu thay đổi" : "Đã thêm");
      reset();
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (a: PayrollAdjustment) => {
    setEditingId(a.id);
    setAdding(false);
    setDraft({
      type: a.type,
      label: a.label,
      amount_vnd: String(Math.abs(a.amount_vnd)),
      notes: a.notes ?? "",
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá khoản điều chỉnh này?")) return;
    try {
      await deleteAdjustment(id);
      toast.success("Đã xoá");
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Loại</TableHead>
              <TableHead>Nhãn</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead>Ghi chú</TableHead>
              {!readOnly && <TableHead className="w-[100px] text-right">Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 4 : 5} className="text-center py-6 text-muted-foreground text-sm">
                  Chưa có khoản điều chỉnh nào.
                </TableCell>
              </TableRow>
            )}
            {adjustments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{PAYROLL_ADJUSTMENT_TYPE_LABELS[a.type]}</TableCell>
                <TableCell className="font-medium">{a.label}</TableCell>
                <TableCell className={`text-right font-mono ${a.amount_vnd < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  {formatVndSigned(a.amount_vnd)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                  {a.notes ?? "—"}
                </TableCell>
                {!readOnly && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => remove(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (adding || editingId) && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Loại</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft({ ...draft, type: v as PayrollAdjustmentType })}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYROLL_ADJUSTMENT_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nhãn</Label>
              <Input
                className="h-8"
                placeholder="Vd: Thưởng chuyên cần T4/2026"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Số tiền (VNĐ — nhập số dương)</Label>
              <Input
                className="h-8 font-mono"
                inputMode="numeric"
                placeholder="500000"
                value={draft.amount_vnd}
                onChange={(e) => setDraft({ ...draft, amount_vnd: e.target.value.replace(/[^0-9]/g, "") })}
              />
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {NEGATIVE_TYPES.has(draft.type)
                  ? "Sẽ trừ vào net (đảo dấu tự động)"
                  : "Sẽ cộng vào net"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Ghi chú</Label>
              <Textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={reset}><X className="h-3.5 w-3.5 mr-1" /> Huỷ</Button>
            <Button size="sm" disabled={busy} onClick={submit}>
              <Check className="h-3.5 w-3.5 mr-1" /> {editingId ? "Lưu" : "Thêm"}
            </Button>
          </div>
        </div>
      )}

      {!readOnly && !adding && !editingId && (
        <Button
          variant="outline" size="sm"
          onClick={() => { setAdding(true); setDraft(EMPTY); }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm khoản điều chỉnh
        </Button>
      )}
    </div>
  );
}

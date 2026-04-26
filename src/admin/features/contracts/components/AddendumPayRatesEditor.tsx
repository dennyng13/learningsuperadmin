import { useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Loader2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useProgramOptions } from "../hooks/useContracts";
import {
  upsertAddendumPayRate, deleteAddendumPayRate,
} from "../hooks/useAddendums";
import {
  PAY_RATE_UNIT_LABELS,
  type AddendumPayRateRow,
  type PayRateUnit,
} from "../types";

interface Props {
  addendumId: string;
  rates: AddendumPayRateRow[];
  readOnly?: boolean;
  onMutated: () => void;
}

interface DraftRate {
  id?: string;
  rate_unit: PayRateUnit;
  rate_amount_vnd: string;
  program_id: string;
  min_threshold: string;
  max_threshold: string;
  notes: string;
}

const EMPTY_DRAFT: DraftRate = {
  rate_unit: "session",
  rate_amount_vnd: "",
  program_id: "",
  min_threshold: "",
  max_threshold: "",
  notes: "",
};

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN") + " VNĐ";
}

export default function AddendumPayRatesEditor({ addendumId, rates, readOnly, onMutated }: Props) {
  const { data: programs } = useProgramOptions();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftRate>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const programName = (id: string | null) =>
    id ? (programs.find((p) => p.id === id)?.name ?? "—") : "Áp dụng chung";

  const reset = () => {
    setDraft(EMPTY_DRAFT);
    setAdding(false);
    setEditingId(null);
  };

  const submit = async () => {
    const amount = Number(draft.rate_amount_vnd);
    if (!draft.rate_amount_vnd || isNaN(amount) || amount < 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    const min = draft.min_threshold ? Number(draft.min_threshold) : null;
    const max = draft.max_threshold ? Number(draft.max_threshold) : null;
    if (min !== null && max !== null && min >= max) {
      toast.error("Ngưỡng dưới phải nhỏ hơn ngưỡng trên");
      return;
    }
    setSubmitting(true);
    try {
      await upsertAddendumPayRate({
        addendum_id: addendumId,
        id: editingId ?? null,
        rate_unit: draft.rate_unit,
        rate_amount_vnd: amount,
        program_id: draft.program_id || null,
        min_threshold: min,
        max_threshold: max,
        notes: draft.notes || null,
        sort_order: editingId ? (rates.find((r) => r.id === editingId)?.sort_order ?? 0) : rates.length,
      });
      toast.success(editingId ? "Đã lưu thay đổi" : "Đã thêm dòng thù lao");
      reset();
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (r: AddendumPayRateRow) => {
    setEditingId(r.id);
    setAdding(false);
    setDraft({
      rate_unit: r.rate_unit,
      rate_amount_vnd: String(r.rate_amount_vnd),
      program_id: r.program_id ?? "",
      min_threshold: r.min_threshold !== null ? String(r.min_threshold) : "",
      max_threshold: r.max_threshold !== null ? String(r.max_threshold) : "",
      notes: r.notes ?? "",
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá dòng thù lao này?")) return;
    try {
      await deleteAddendumPayRate(id);
      toast.success("Đã xoá");
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    }
  };

  const formCard = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{editingId ? "Chỉnh sửa dòng thù lao" : "Thêm dòng thù lao"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Chương trình</Label>
            <Select value={draft.program_id || "_all"} onValueChange={(v) => setDraft({ ...draft, program_id: v === "_all" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Áp dụng chung</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Đơn vị</Label>
            <Select value={draft.rate_unit} onValueChange={(v) => setDraft({ ...draft, rate_unit: v as PayRateUnit })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PAY_RATE_UNIT_LABELS) as PayRateUnit[]).map((u) => (
                  <SelectItem key={u} value={u}>{PAY_RATE_UNIT_LABELS[u]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Mức thù lao (VNĐ)</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="vd 250000"
            value={draft.rate_amount_vnd}
            onChange={(e) => setDraft({ ...draft, rate_amount_vnd: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Ngưỡng dưới (tùy chọn)</Label>
            <Input
              type="number"
              placeholder="vd 0"
              value={draft.min_threshold}
              onChange={(e) => setDraft({ ...draft, min_threshold: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Ngưỡng trên (tùy chọn)</Label>
            <Input
              type="number"
              placeholder="vd 65"
              value={draft.max_threshold}
              onChange={(e) => setDraft({ ...draft, max_threshold: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Ghi chú</Label>
          <Textarea
            rows={2}
            placeholder="Vd: Áp dụng cho 65 buổi đầu trở xuống"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={reset}>
            <X className="h-3.5 w-3.5 mr-1" /> Hủy
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {editingId ? "Lưu" : "Thêm"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Điều khoản thù lao</CardTitle>
        {!readOnly && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={() => { setAdding(true); setDraft(EMPTY_DRAFT); }}>
            <Plus className="h-4 w-4 mr-1" /> Thêm dòng
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {(adding || editingId) && formCard}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chương trình</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead className="text-right">Mức thù lao</TableHead>
              <TableHead>Ngưỡng</TableHead>
              <TableHead>Ghi chú</TableHead>
              {!readOnly && <TableHead className="w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="text-center text-muted-foreground py-6">
                  Chưa có điều khoản nào.
                </TableCell>
              </TableRow>
            ) : (
              rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{programName(r.program_id)}</TableCell>
                  <TableCell>{PAY_RATE_UNIT_LABELS[r.rate_unit]}</TableCell>
                  <TableCell className="text-right font-mono">{formatVnd(r.rate_amount_vnd)}</TableCell>
                  <TableCell className="text-xs">
                    {r.min_threshold !== null || r.max_threshold !== null
                      ? `${r.min_threshold ?? "—"} – ${r.max_threshold ?? "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(r)} title="Sửa">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)} title="Xoá">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

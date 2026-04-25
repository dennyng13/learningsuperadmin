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
import { Loader2, Plus, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  archivePayRate, createPayRate, useProgramOptions,
} from "../hooks/useContracts";
import {
  PAY_RATE_UNIT_LABELS, type ContractPayRateRow, type PayRateUnit,
} from "../types";

interface Props {
  contractId: string;
  active: ContractPayRateRow[];
  archived: ContractPayRateRow[];
  onMutated: () => void;
  readOnly?: boolean;
}

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN") + " VNĐ";
}

export default function PayRatesTab({ contractId, active, archived, onMutated, readOnly }: Props) {
  const { data: programs } = useProgramOptions();
  const [adding, setAdding] = useState(false);
  const [unit, setUnit] = useState<PayRateUnit>("session");
  const [amount, setAmount] = useState("");
  const [programId, setProgramId] = useState<string>("");
  const [minThreshold, setMinThreshold] = useState("");
  const [maxThreshold, setMaxThreshold] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!amount || isNaN(Number(amount))) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    setSubmitting(true);
    try {
      await createPayRate({
        contract_id: contractId,
        rate_unit: unit,
        rate_amount_vnd: Number(amount),
        program_id: programId || null,
        min_threshold: minThreshold ? Number(minThreshold) : null,
        max_threshold: maxThreshold ? Number(maxThreshold) : null,
        notes: notes || null,
      });
      toast.success("Đã thêm phụ lục thù lao");
      setAmount(""); setMinThreshold(""); setMaxThreshold(""); setNotes(""); setProgramId(""); setAdding(false);
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thêm được");
    } finally {
      setSubmitting(false);
    }
  };

  const archive = async (id: string) => {
    if (!confirm("Lưu trữ phụ lục này? Lương đã tính theo phụ lục cũ vẫn giữ nguyên.")) return;
    try {
      await archivePayRate(id);
      onMutated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    }
  };

  const renderTable = (rows: ContractPayRateRow[], showArchive = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chương trình</TableHead>
          <TableHead>Đơn vị</TableHead>
          <TableHead className="text-right">Mức thù lao</TableHead>
          <TableHead>Ngưỡng</TableHead>
          <TableHead>Ghi chú</TableHead>
          {showArchive && <TableHead className="w-12"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={showArchive ? 6 : 5} className="text-center text-muted-foreground py-6">
              Chưa có dữ liệu.
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => {
          const program = programs.find((p) => p.id === r.program_id);
          return (
            <TableRow key={r.id} className={r.archived_at ? "opacity-60" : ""}>
              <TableCell>{program?.name ?? "Tất cả chương trình"}</TableCell>
              <TableCell>{PAY_RATE_UNIT_LABELS[r.rate_unit]}</TableCell>
              <TableCell className="text-right font-mono">{formatVnd(r.rate_amount_vnd)}</TableCell>
              <TableCell className="text-xs">
                {r.min_threshold || r.max_threshold
                  ? `${r.min_threshold ?? "—"} – ${r.max_threshold ?? "—"}`
                  : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
              {showArchive && (
                <TableCell>
                  {!readOnly && (
                    <Button variant="ghost" size="sm" onClick={() => archive(r.id)} title="Lưu trữ">
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Phụ lục thù lao đang áp dụng</CardTitle>
          {!readOnly && (
            <Button size="sm" variant={adding ? "outline" : "default"} onClick={() => setAdding((v) => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {adding ? "Hủy" : "Thêm phụ lục"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {adding && !readOnly && (
            <div className="border border-border rounded-md p-3 mb-4 space-y-3 bg-muted/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Chương trình</Label>
                  <Select value={programId} onValueChange={setProgramId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả chương trình" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tất cả chương trình</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Đơn vị</Label>
                  <Select value={unit} onValueChange={(v) => setUnit(v as PayRateUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PAY_RATE_UNIT_LABELS) as [PayRateUnit, string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>Theo {l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mức thù lao (VNĐ)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="VD: 250000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ngưỡng tối thiểu</Label>
                  <Input value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ngưỡng tối đa</Label>
                  <Input value={maxThreshold} onChange={(e) => setMaxThreshold(e.target.value)} type="number" />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Ghi chú</Label>
                  <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Thêm
                </Button>
              </div>
            </div>
          )}
          {renderTable(active, true)}
        </CardContent>
      </Card>

      {archived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Phụ lục đã lưu trữ</CardTitle>
          </CardHeader>
          <CardContent>{renderTable(archived, false)}</CardContent>
        </Card>
      )}
    </div>
  );
}

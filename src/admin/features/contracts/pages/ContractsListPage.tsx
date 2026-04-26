import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListPageLayout } from "@shared/components/layouts";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { FileText, Plus, Search, Loader2, Settings2 } from "lucide-react";
import { useContractList } from "../hooks/useContracts";
import ContractStatusBadge from "../components/ContractStatusBadge";
import { CONTRACT_STATUS_LABELS, type ContractStatus } from "../types";

const STATUS_OPTIONS: Array<{ value: ContractStatus | "all"; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  ...Object.entries(CONTRACT_STATUS_LABELS).map(([v, label]) => ({
    value: v as ContractStatus, label,
  })),
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ContractsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [query, setQuery] = useState("");

  const { data, loading, error } = useContractList({
    status: statusFilter,
    expiringWithinDays: expiringOnly ? 30 : null,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (row) =>
        row.contract_number.toLowerCase().includes(q) ||
        (row.teacher_name ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <ListPageLayout
      title="Hợp đồng"
      subtitle="Quản lý hợp đồng dịch vụ đào tạo của giáo viên"
      icon={FileText}
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/contracts/templates")}
            size="sm"
            variant="outline"
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Quản lý template
          </Button>
          <Button onClick={() => navigate("/contracts/new")} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Tạo hợp đồng
          </Button>
        </div>
      }
      filterBar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Tìm theo số HĐ hoặc tên giáo viên"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ContractStatus | "all")}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={expiringOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setExpiringOnly((v) => !v)}
          >
            Sắp hết hạn (30 ngày)
          </Button>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Đang tải hợp đồng…
        </div>
      )}
      {!loading && error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số HĐ</TableHead>
                <TableHead>Giáo viên</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Cập nhật</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chưa có hợp đồng nào.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate(`/contracts/${row.id}`)}
                >
                  <TableCell className="font-mono text-xs">{row.contract_number}</TableCell>
                  <TableCell>{row.teacher_name ?? "—"}</TableCell>
                  <TableCell>{row.contract_type ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {formatDate(row.effective_from)} – {formatDate(row.effective_to)}
                  </TableCell>
                  <TableCell>
                    <ContractStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(row.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ListPageLayout>
  );
}

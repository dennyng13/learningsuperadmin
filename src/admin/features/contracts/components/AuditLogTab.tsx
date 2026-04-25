import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import {
  CONTRACT_STATUS_LABELS, type ContractAuditLogRow,
} from "../types";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const EVENT_LABELS: Record<string, string> = {
  created: "Tạo hợp đồng",
  sent_to_teacher: "Gửi cho giáo viên",
  party_b_updated: "Cập nhật Bên B",
  teacher_signed: "Giáo viên ký",
  admin_signed: "Admin ký",
  revision_requested: "Yêu cầu sửa",
  resign_requested: "Yêu cầu ký lại",
  terminated: "Chấm dứt",
  expired: "Tự động hết hạn",
  pdf_rendered: "Render PDF",
  pay_rate_added: "Thêm phụ lục thù lao",
  pay_rate_archived: "Lưu trữ phụ lục",
};

export default function AuditLogTab({ auditLog }: { auditLog: ContractAuditLogRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lịch sử thay đổi</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Thời điểm</TableHead>
              <TableHead>Sự kiện</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLog.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  Chưa có sự kiện nào.
                </TableCell>
              </TableRow>
            )}
            {auditLog.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                <TableCell>{EVENT_LABELS[row.event_type] ?? row.event_type}</TableCell>
                <TableCell className="text-xs">
                  {row.from_status && row.to_status
                    ? `${CONTRACT_STATUS_LABELS[row.from_status]} → ${CONTRACT_STATUS_LABELS[row.to_status]}`
                    : row.to_status
                      ? CONTRACT_STATUS_LABELS[row.to_status]
                      : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.message ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

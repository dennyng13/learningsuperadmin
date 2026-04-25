import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import type { PartyASnapshot, PartyBSnapshot } from "../types";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 font-medium">{value || "—"}</div>
    </div>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function PartyAView({ snapshot }: { snapshot: PartyASnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bên A — Bên sử dụng dịch vụ</CardTitle>
      </CardHeader>
      <CardContent>
        <Row label="Tên đơn vị" value={snapshot.legal_name} />
        <Row label="MSDN" value={snapshot.business_id} />
        <Row label="Địa chỉ" value={snapshot.address} />
        <Row label="Người đại diện" value={snapshot.representative_name} />
        <Row label="Chức vụ" value={snapshot.representative_title} />
      </CardContent>
    </Card>
  );
}

export function PartyBView({ snapshot }: { snapshot: PartyBSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bên B — Bên cung cấp dịch vụ</CardTitle>
      </CardHeader>
      <CardContent>
        <Row label="Họ và tên" value={snapshot.full_name} />
        <Row label="Ngày sinh" value={formatDate(snapshot.date_of_birth)} />
        <Row label="CCCD/CMND" value={snapshot.cccd_number} />
        <Row
          label="Cấp ngày / nơi cấp"
          value={
            (snapshot.cccd_issue_date || snapshot.cccd_issue_place)
              ? `${formatDate(snapshot.cccd_issue_date)} ${snapshot.cccd_issue_place ?? ""}`.trim()
              : null
          }
        />
        <Row label="Hộ khẩu thường trú" value={snapshot.permanent_address} />
        <Row label="Chỗ ở hiện tại" value={snapshot.current_address} />
        <Row label="Điện thoại" value={snapshot.phone} />
        <Row label="Email" value={snapshot.email} />
        <Row label="MST cá nhân" value={snapshot.tax_code} />
        <Row
          label="Tài khoản ngân hàng"
          value={
            (snapshot.bank_account_number || snapshot.bank_name)
              ? `${snapshot.bank_account_number ?? ""} · ${snapshot.bank_name ?? ""} ${snapshot.bank_branch ? `(${snapshot.bank_branch})` : ""}`.trim()
              : null
          }
        />
      </CardContent>
    </Card>
  );
}

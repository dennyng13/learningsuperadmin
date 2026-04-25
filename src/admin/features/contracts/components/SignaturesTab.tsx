import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import {
  type ContractParty, type ContractSignatureRow,
} from "../types";
import { getStorageSignedUrl } from "../hooks/useContracts";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function SignatureBlock({ sig, label }: { sig?: ContractSignatureRow; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!sig?.signature_image_url) return;
    if (sig.signature_image_url.startsWith("http")) {
      setUrl(sig.signature_image_url);
      return;
    }
    void getStorageSignedUrl(sig.signature_image_url).then(setUrl);
  }, [sig?.signature_image_url]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {label}
          {sig ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-0 hover:bg-emerald-100">Đã ký</Badge>
          ) : (
            <Badge variant="outline">Chưa ký</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sig ? (
          <div className="space-y-2">
            {url ? (
              <img
                src={url}
                alt="Chữ ký"
                className="bg-white border border-border rounded-md max-h-32 object-contain p-2"
              />
            ) : (
              <div className="text-xs text-muted-foreground">Đang tải ảnh chữ ký…</div>
            )}
            <div className="text-sm">
              <div><span className="text-muted-foreground">Người ký:</span> {sig.signer_name ?? "—"}</div>
              <div><span className="text-muted-foreground">Thời điểm:</span> {formatDateTime(sig.signed_at)}</div>
              {sig.ip_address && (
                <div className="text-xs text-muted-foreground">IP: {sig.ip_address}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Chưa có chữ ký từ phía này.</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SignaturesTab({ signatures }: { signatures: ContractSignatureRow[] }) {
  const active = signatures.filter((s) => !s.archived_at);
  const byParty = (p: ContractParty) => active.find((s) => s.party === p);
  const archived = signatures.filter((s) => s.archived_at);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SignatureBlock sig={byParty("admin")} label="Bên A — Đại diện đơn vị" />
        <SignatureBlock sig={byParty("teacher")} label="Bên B — Giáo viên" />
      </div>

      {archived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Lịch sử chữ ký</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {archived.map((s) => (
                <li key={s.id}>
                  <span className="capitalize">{s.party === "teacher" ? "Bên B" : "Bên A"}</span>
                  {" — "}
                  {s.signer_name ?? "—"} ký lúc {formatDateTime(s.signed_at)}
                  {s.archived_at ? ` (lưu trữ ${formatDateTime(s.archived_at)})` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

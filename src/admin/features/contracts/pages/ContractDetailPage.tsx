import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import {
  ArrowLeft, FileText, AlertCircle,
} from "lucide-react";
import { useContractDetail } from "../hooks/useContracts";
import ContractStatusBadge from "../components/ContractStatusBadge";
import { PartyAView, PartyBView } from "../components/PartyTablesView";
import PayRatesTab from "../components/PayRatesTab";
import SignaturesTab from "../components/SignaturesTab";
import AuditLogTab from "../components/AuditLogTab";
import ContractActionsPanel from "../components/ContractActionsPanel";
import CustomFieldsTab from "../components/CustomFieldsTab";
import AddendumsTab from "../components/AddendumsTab";
import StatusTimeline from "@shared/components/StatusTimeline";
import DetailSkeleton from "@shared/components/DetailSkeleton";
import { getContractTimeline } from "../utils/statusTimeline";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useContractDetail(contractId);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Danh sách hợp đồng
        </Button>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Danh sách hợp đồng
        </Button>
        <Card>
          <CardContent className="py-6 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error || "Không tìm thấy hợp đồng"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contract, teacher, pay_rates, signatures, audit_log } = data;
  const readOnly =
    contract.status === "active" ||
    contract.status === "expired" ||
    contract.status === "terminated";

  const timeline = getContractTimeline(contract.status);

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Danh sách hợp đồng
        </Button>
        <ContractStatusBadge status={contract.status} />
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>Hợp đồng dịch vụ</span>
            </div>
            <h1 className="text-xl font-semibold mt-0.5">{contract.contract_number}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {teacher?.full_name ?? "—"} · Hiệu lực {formatDate(contract.effective_from)} – {formatDate(contract.effective_to)}
            </div>
          </div>
        </div>
        <div className="mt-4 -mx-1 px-1">
          <StatusTimeline steps={timeline} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="overview">Thông tin</TabsTrigger>
              <TabsTrigger value="custom">Tùy chỉnh</TabsTrigger>
              <TabsTrigger value="addendums">Phụ lục</TabsTrigger>
              <TabsTrigger value="rates">Thù lao cũ</TabsTrigger>
              <TabsTrigger value="signatures">Chữ ký</TabsTrigger>
              <TabsTrigger value="audit">Lịch sử</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <PartyAView snapshot={contract.party_a_snapshot} />
              <PartyBView snapshot={contract.party_b_snapshot} />
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <CustomFieldsTab
                contractId={contract.id}
                status={contract.status}
                fieldsSnapshot={contract.template_fields_snapshot}
                values={contract.custom_fields}
                onMutated={refresh}
              />
            </TabsContent>

            <TabsContent value="addendums" className="mt-4">
              <AddendumsTab
                contractId={contract.id}
                contractStatus={contract.status}
                contractTemplateId={contract.template_id}
              />
            </TabsContent>

            <TabsContent value="rates" className="mt-4">
              <PayRatesTab
                contractId={contract.id}
                active={pay_rates.active}
                archived={pay_rates.archived}
                onMutated={refresh}
                readOnly={readOnly}
              />
            </TabsContent>

            <TabsContent value="signatures" className="mt-4">
              <SignaturesTab signatures={signatures} />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <AuditLogTab auditLog={audit_log} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <ContractActionsPanel contract={contract} onMutated={refresh} />
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Tiến trình
            </div>
            <StatusTimeline steps={timeline} vertical />
          </div>
        </div>
      </div>
    </div>
  );
}

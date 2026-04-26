import { useParams } from "react-router-dom";
import { DetailPageLayout } from "@shared/components/layouts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Card, CardContent } from "@shared/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { useContractDetail } from "../hooks/useContracts";
import ContractStatusBadge from "../components/ContractStatusBadge";
import { PartyAView, PartyBView } from "../components/PartyTablesView";
import PayRatesTab from "../components/PayRatesTab";
import SignaturesTab from "../components/SignaturesTab";
import AuditLogTab from "../components/AuditLogTab";
import ContractActionsPanel from "../components/ContractActionsPanel";
import CustomFieldsTab from "../components/CustomFieldsTab";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const { data, loading, error, refresh } = useContractDetail(contractId);

  if (loading) {
    return (
      <DetailPageLayout title="Hợp đồng" backRoute="/contracts">
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Đang tải…
        </div>
      </DetailPageLayout>
    );
  }

  if (error || !data) {
    return (
      <DetailPageLayout title="Hợp đồng" backRoute="/contracts">
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {error || "Không tìm thấy hợp đồng"}
          </CardContent>
        </Card>
      </DetailPageLayout>
    );
  }

  const { contract, teacher, pay_rates, signatures, audit_log } = data;
  const subtitle = `${teacher?.full_name ?? "—"} · Hiệu lực ${formatDate(contract.effective_from)} – ${formatDate(contract.effective_to)}`;

  const readOnly =
    contract.status === "active" ||
    contract.status === "expired" ||
    contract.status === "terminated";

  return (
    <DetailPageLayout
      title={contract.contract_number}
      subtitle={subtitle}
      icon={FileText}
      backRoute="/contracts"
      backLabel="Danh sách hợp đồng"
      actions={<ContractStatusBadge status={contract.status} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">Thông tin</TabsTrigger>
              <TabsTrigger value="custom">Tùy chỉnh</TabsTrigger>
              <TabsTrigger value="rates">Phụ lục thù lao</TabsTrigger>
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
        <div className="space-y-4">
          <ContractActionsPanel contract={contract} onMutated={refresh} />
        </div>
      </div>
    </DetailPageLayout>
  );
}

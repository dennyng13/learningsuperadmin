import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature, Loader2, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import WidgetRefreshButton from "./WidgetRefreshButton";

// Lightweight widgets for contract / addendum lifecycle counts (Q38=e).
// Uses contract_list / addendum_list RPCs which already exist; counts are
// computed client-side via array length to keep migrations untouched.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

interface ContractCounts {
  contractsAwaiting: number;
  addendumsAwaiting: number;
  contractsExpiringSoon: number;
}

const TONE_CLASSES = {
  yellow: "bg-lp-yellow text-lp-ink",
  sky:    "bg-lp-sky text-lp-ink",
  coral:  "bg-lp-coral text-white",
} as const;

export default function ContractStatusWidget() {
  const navigate = useNavigate();

  const { data: state, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["dashboard-contract-status"],
    queryFn: async (): Promise<ContractCounts> => {
      const [allContracts, expiringSoon, allAddendums] = await Promise.all([
        rpc("contract_list", { p_status: null, p_teacher_id: null, p_expiring_within_days: null }),
        rpc("contract_list", { p_status: null, p_teacher_id: null, p_expiring_within_days: 30 }),
        rpc("addendum_list", { p_contract_id: null, p_status: null, p_active_only: false }),
      ]);
      const firstErr = allContracts.error || expiringSoon.error || allAddendums.error;
      if (firstErr) throw firstErr;
      const contracts = (allContracts.data ?? []) as Array<{ status: string }>;
      const expiring = (expiringSoon.data ?? []) as Array<{ status: string }>;
      const addendums = (allAddendums.data ?? []) as Array<{ status: string }>;
      const awaitingStatuses = new Set(["awaiting_teacher", "awaiting_admin", "revision_requested"]);
      return {
        contractsAwaiting: contracts.filter((c) => awaitingStatuses.has(c.status)).length,
        addendumsAwaiting: addendums.filter((a) => awaitingStatuses.has(a.status)).length,
        contractsExpiringSoon: expiring.filter((c) => c.status === "active").length,
      };
    },
    staleTime: 60_000,
  });

  const cards = useMemo(() => [
    {
      key: "contracts-awaiting",
      icon: FileSignature,
      label: "HĐ chờ ký",
      hint: "Chờ giáo viên / admin ký",
      value: state?.contractsAwaiting ?? 0,
      tone: "yellow",
      onClick: () => navigate("/contracts?status=awaiting_teacher"),
    },
    {
      key: "addendums-awaiting",
      icon: FileText,
      label: "Phụ lục chờ ký",
      hint: "Phụ lục thù lao chưa ký xong",
      value: state?.addendumsAwaiting ?? 0,
      tone: "sky",
      onClick: () => navigate("/contracts"),
    },
    {
      key: "contracts-expiring",
      icon: AlertTriangle,
      label: "Sắp hết hạn 30 ngày",
      hint: "Hợp đồng đang hiệu lực",
      value: state?.contractsExpiringSoon ?? 0,
      tone: "coral",
      onClick: () => navigate("/contracts?expiring_within_days=30"),
    },
  ] as const, [state, navigate]);

  if (isLoading) {
    return (
      <div className="rounded-pop border-[2px] border-lp-ink bg-white shadow-pop-xs p-4 flex items-center text-xs text-lp-body font-body">
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2 text-lp-teal" /> Đang tải số liệu hợp đồng…
      </div>
    );
  }
  if (error) {
    return null; // silent — admin without RLS won't break the dashboard
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-display font-extrabold uppercase tracking-[0.12em] text-lp-body">
          Hợp đồng
        </h3>
        <WidgetRefreshButton
          onClick={() => refetch()}
          refreshing={isFetching}
          title="Tải lại số liệu hợp đồng"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map(({ key, icon: Icon, label, hint, value, tone, onClick }) => (
        <button
          key={key}
          onClick={onClick}
          className="text-left rounded-pop border-[2px] border-lp-ink bg-white shadow-pop-xs p-4 transition-all duration-150 ease-bounce hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-pop flex items-center justify-center border-[2px] border-lp-ink shrink-0 ${TONE_CLASSES[tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-lp-body font-body">{label}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-lp-ink">{value}</span>
              </div>
              <p className="text-[11px] text-lp-body truncate">{hint}</p>
            </div>
          </div>
        </button>
      ))}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature, Loader2, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Lightweight widgets for contract / addendum lifecycle counts (Q38=e).
// Uses contract_list / addendum_list RPCs which already exist; counts are
// computed client-side via array length to keep migrations untouched.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

interface CountState {
  loading: boolean;
  error: string | null;
  contractsAwaiting: number;
  addendumsAwaiting: number;
  contractsExpiringSoon: number;
}

export default function ContractStatusWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState<CountState>({
    loading: true,
    error: null,
    contractsAwaiting: 0,
    addendumsAwaiting: 0,
    contractsExpiringSoon: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [allContracts, expiringSoon, allAddendums] = await Promise.all([
          rpc("contract_list", { p_status: null, p_teacher_id: null, p_expiring_within_days: null }),
          rpc("contract_list", { p_status: null, p_teacher_id: null, p_expiring_within_days: 30 }),
          rpc("addendum_list", { p_contract_id: null, p_status: null, p_active_only: false }),
        ]);
        if (cancelled) return;

        const contracts = (allContracts.data ?? []) as Array<{ status: string }>;
        const expiring = (expiringSoon.data ?? []) as Array<{ status: string }>;
        const addendums = (allAddendums.data ?? []) as Array<{ status: string }>;

        const awaitingStatuses = new Set(["awaiting_teacher", "awaiting_admin", "revision_requested"]);
        const contractsAwaiting = contracts.filter((c) => awaitingStatuses.has(c.status)).length;
        const addendumsAwaiting = addendums.filter((a) => awaitingStatuses.has(a.status)).length;
        const contractsExpiringSoon = expiring.filter((c) => c.status === "active").length;

        setState({
          loading: false,
          error: allContracts.error?.message
            ?? expiringSoon.error?.message
            ?? allAddendums.error?.message
            ?? null,
          contractsAwaiting,
          addendumsAwaiting,
          contractsExpiringSoon,
        });
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Lỗi không xác định",
        }));
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const cards = useMemo(() => [
    {
      key: "contracts-awaiting",
      icon: FileSignature,
      label: "HĐ chờ ký",
      hint: "Chờ giáo viên / admin ký",
      value: state.contractsAwaiting,
      tone: "amber",
      onClick: () => navigate("/contracts?status=awaiting_teacher"),
    },
    {
      key: "addendums-awaiting",
      icon: FileText,
      label: "Phụ lục chờ ký",
      hint: "Phụ lục thù lao chưa ký xong",
      value: state.addendumsAwaiting,
      tone: "blue",
      onClick: () => navigate("/contracts"),
    },
    {
      key: "contracts-expiring",
      icon: AlertTriangle,
      label: "Sắp hết hạn 30 ngày",
      hint: "Hợp đồng đang hiệu lực",
      value: state.contractsExpiringSoon,
      tone: "rose",
      onClick: () => navigate("/contracts?expiring_within_days=30"),
    },
  ] as const, [state, navigate]);

  if (state.loading) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Đang tải số liệu hợp đồng…
      </div>
    );
  }
  if (state.error) {
    return null; // silent — admin without RLS won't break the dashboard
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map(({ key, icon: Icon, label, hint, value, tone, onClick }) => (
        <button
          key={key}
          onClick={onClick}
          className="text-left rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone === "amber" ? "bg-amber-500/10 text-amber-600" : tone === "blue" ? "bg-blue-500/10 text-blue-600" : "bg-rose-500/10 text-rose-600"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold">{value}</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

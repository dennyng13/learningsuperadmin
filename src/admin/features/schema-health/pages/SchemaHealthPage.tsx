import { useEffect, useState, useMemo } from "react";
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2,
  Database, FileWarning, Search,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { cn } from "@shared/lib/utils";
import {
  EXPECTED_SCHEMA, runFullProbe,
  type TableProbeResult, type ColumnStatus,
} from "@admin/features/schema-health/lib/probe";

/**
 * Schema Health — admin tool kiểm tra mapping cột DB → UI.
 *
 * Mục đích: sau mỗi migration, cho phép super-admin xác nhận các cột FE
 * đang phụ thuộc đã thực sự tồn tại trong DB. Nếu một cột MISSING, hiển
 * thị migration cần apply để fix.
 *
 * Không phụ thuộc RPC introspect — dùng kỹ thuật "probe `select <col>`"
 * (mọi user có quyền SELECT trên bảng đều dùng được).
 */
export default function SchemaHealthPage() {
  const [results, setResults] = useState<TableProbeResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const runProbe = async () => {
    setLoading(true);
    try {
      const rs = await runFullProbe();
      setResults(rs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runProbe();
  }, []);

  const summary = useMemo(() => {
    if (!results) return { tables: 0, missingTables: 0, columns: 0, missing: 0, unknown: 0 };
    let columns = 0, missing = 0, unknown = 0, missingTables = 0;
    for (const r of results) {
      if (!r.exists) missingTables++;
      for (const c of r.columns) {
        columns++;
        if (c.status === "missing") missing++;
        if (c.status === "unknown") unknown++;
      }
    }
    return { tables: results.length, missingTables, columns, missing, unknown };
  }, [results]);

  const filtered = useMemo(() => {
    if (!results) return [];
    const q = filter.trim().toLowerCase();
    return results
      .filter((r) => !q || r.table.toLowerCase().includes(q) || r.columns.some((c) => c.column.toLowerCase().includes(q)))
      .map((r) => {
        if (!showOnlyIssues) return r;
        const cols = r.columns.filter((c) => c.status !== "present");
        if (cols.length === 0 && r.exists) return null;
        return { ...r, columns: cols };
      })
      .filter((r): r is TableProbeResult => !!r);
  }, [results, filter, showOnlyIssues]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Hệ thống · Super Admin
          </p>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Schema Health
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Kiểm tra cột DB ↔ chỗ FE consume. Cảnh báo nếu migration chưa apply.
          </p>
        </div>
        <Button onClick={runProbe} disabled={loading} size="sm" variant="outline" className="h-8 gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? "Đang quét..." : "Quét lại"}
        </Button>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Bảng kiểm tra"
          value={summary.tables}
          icon={Database}
          tone="neutral"
        />
        <SummaryCard
          label="Bảng thiếu"
          value={summary.missingTables}
          icon={FileWarning}
          tone={summary.missingTables > 0 ? "error" : "success"}
        />
        <SummaryCard
          label="Cột thiếu"
          value={summary.missing}
          icon={XCircle}
          tone={summary.missing > 0 ? "error" : "success"}
        />
        <SummaryCard
          label="Cột không xác định"
          value={summary.unknown}
          icon={AlertTriangle}
          tone={summary.unknown > 0 ? "warning" : "success"}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Tìm bảng / cột..."
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant={showOnlyIssues ? "default" : "ghost"}
          onClick={() => setShowOnlyIssues((v) => !v)}
          className="h-8 text-xs"
        >
          Chỉ hiện cảnh báo
        </Button>
      </div>

      {/* Tables */}
      {loading && !results ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed bg-muted/20 p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium">
                {showOnlyIssues ? "Không có vấn đề nào — schema hoàn chỉnh." : "Không khớp bộ lọc."}
              </p>
            </div>
          ) : (
            filtered.map((r) => <TableSection key={r.table} result={r} />)
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Summary card ───────── */
function SummaryCard({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "success" | "warning" | "error";
}) {
  const toneClass = {
    neutral: "text-muted-foreground bg-muted/40 border-border",
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
    error: "text-destructive bg-destructive/10 border-destructive/30",
  }[tone];

  return (
    <div className={cn("rounded-xl border p-3 flex items-center gap-3", toneClass)}>
      <Icon className="h-7 w-7 shrink-0 opacity-70" />
      <div>
        <p className="text-2xl font-bold leading-none font-display">{value}</p>
        <p className="text-[11px] uppercase tracking-wider mt-1 opacity-80">{label}</p>
      </div>
    </div>
  );
}

/* ───────── Table section ───────── */
function TableSection({ result }: { result: TableProbeResult }) {
  const spec = EXPECTED_SCHEMA.find((s) => s.table === result.table);
  const issues = result.columns.filter((c) => c.status !== "present").length;
  const allOk = result.exists && issues === 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        !result.exists && "border-destructive/40",
        result.exists && issues > 0 && "border-amber-500/40",
      )}
    >
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
          <code className="text-sm font-mono font-bold truncate">{result.table}</code>
          {!result.exists ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-medium">
              <XCircle className="h-3 w-3" /> BẢNG CHƯA TỒN TẠI
            </span>
          ) : allOk ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
              <CheckCircle2 className="h-3 w-3" /> OK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
              <AlertTriangle className="h-3 w-3" /> {issues} vấn đề
            </span>
          )}
        </div>
      </div>

      {spec?.description && (
        <p className="px-4 py-2 text-[11px] text-muted-foreground border-b">{spec.description}</p>
      )}

      <div className="divide-y">
        {result.columns.map((c) => {
          const colSpec = spec?.columns.find((s) => s.name === c.column);
          return <ColumnRow key={c.column} status={c.status} column={c.column} description={colSpec?.description} migration={colSpec?.migration} usedBy={colSpec?.usedBy} error={c.error} />;
        })}
      </div>
    </div>
  );
}

/* ───────── Column row ───────── */
function ColumnRow({
  status, column, description, migration, usedBy, error,
}: {
  status: ColumnStatus;
  column: string;
  description?: string;
  migration?: string;
  usedBy?: string[];
  error?: string;
}) {
  const tone = {
    present: { icon: CheckCircle2, cls: "text-emerald-500" },
    missing: { icon: XCircle, cls: "text-destructive" },
    unknown: { icon: AlertTriangle, cls: "text-amber-500" },
  }[status];
  const Icon = tone.icon;

  return (
    <div className={cn("px-4 py-2.5 flex items-start gap-3", status !== "present" && "bg-amber-500/5")}>
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", tone.cls)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-mono font-semibold">{column}</code>
          {status === "missing" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
              MISSING
            </span>
          )}
          {status === "unknown" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
              UNKNOWN
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        )}
        {usedBy && usedBy.length > 0 && (
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            FE consume: <span className="font-mono">{usedBy.join(", ")}</span>
          </p>
        )}
        {status === "missing" && migration && (
          <p className="text-[11px] mt-1 text-destructive">
            ⚠ Cần apply migration: <code className="font-mono bg-destructive/10 px-1 rounded">{migration}</code>
          </p>
        )}
        {status === "unknown" && error && error !== "table_missing" && (
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 font-mono">{error}</p>
        )}
      </div>
    </div>
  );
}
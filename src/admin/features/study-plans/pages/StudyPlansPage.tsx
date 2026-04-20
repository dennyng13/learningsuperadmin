import { useState, useMemo } from "react";
import { useAllStudyPlans } from "@shared/hooks/useStudyPlan";
import { StudyPlanList } from "@shared/components/study-plan/StudyPlanList";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Search, Plus, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@shared/lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang học" },
  { value: "paused", label: "Tạm dừng" },
  { value: "completed", label: "Hoàn thành" },
];

export default function StudyPlansPage() {
  const { data: plans, isLoading } = useAllStudyPlans();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!plans) return [];
    return plans.filter((p: any) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (p.plan_name || "").toLowerCase();
        return name.includes(q);
      }
      return true;
    });
  }, [plans, search, statusFilter]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 animate-page-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold">Kế hoạch học tập</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{plans?.length || 0} kế hoạch</p>
        </div>
        <Button onClick={() => navigate("/admin/study-plans/new")} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Tạo kế hoạch
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={cn(
            "p-2 rounded-full border transition-all",
            searchOpen ? "bg-primary/10 border-primary/30" : "hover:bg-muted"
          )}
        >
          <Search className="h-4 w-4" />
        </button>

        {searchOpen && (
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kế hoạch..."
            className="h-8 w-48 text-xs rounded-full"
            autoFocus
          />
        )}

        <span className="h-5 w-px bg-border" />

        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:border-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <StudyPlanList plans={filtered} isLoading={false} />
      )}
    </div>
  );
}

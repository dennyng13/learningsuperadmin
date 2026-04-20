import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { cn } from "@shared/lib/utils";
import {
  Plus, RefreshCw, Minus, Check, ChevronDown, ChevronUp, Loader2, ArrowRight,
} from "lucide-react";

export interface SyncPreviewData {
  summary: {
    added: number;
    updated: number;
    unchanged: number;
    removed: number;
  };
  details: {
    added: { full_name: string; email?: string | null; phone?: string | null; [key: string]: any }[];
    updated: { full_name: string; changes: Record<string, { old: any; new: any }> }[];
    removed: { full_name: string; email?: string | null; [key: string]: any }[];
  };
  classes_to_sync?: number;
}

interface SyncPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: SyncPreviewData | null;
  onConfirm: () => void;
  confirming: boolean;
  entityLabel: string; // "học viên" or "giáo viên"
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Tên",
  email: "Email",
  phone: "SĐT",
  status: "Trạng thái",
  course_names: "Khóa học",
  classes: "Lớp dạy",
};

export function SyncPreviewDialog({
  open, onOpenChange, preview, onConfirm, confirming, entityLabel,
}: SyncPreviewDialogProps) {
  const [expandedSection, setExpandedSection] = useState<"added" | "updated" | "removed" | null>(null);

  if (!preview) return null;

  const { summary, details } = preview;
  const hasChanges = summary.added > 0 || summary.updated > 0 || summary.removed > 0;

  const toggleSection = (section: "added" | "updated" | "removed") => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">Xác nhận đồng bộ {entityLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SummaryCard icon={Plus} label="Mới" count={summary.added} color="text-emerald-600 bg-emerald-500/10" />
            <SummaryCard icon={RefreshCw} label="Cập nhật" count={summary.updated} color="text-blue-600 bg-blue-500/10" />
            <SummaryCard icon={Check} label="Không đổi" count={summary.unchanged} color="text-muted-foreground bg-muted" />
            <SummaryCard icon={Minus} label="Đã xóa trên TnG" count={summary.removed} color="text-rose-600 bg-rose-500/10" />
          </div>

          {preview.classes_to_sync !== undefined && preview.classes_to_sync > 0 && (
            <p className="text-xs text-muted-foreground"> {preview.classes_to_sync} lớp học sẽ được đồng bộ</p>
          )}

          {!hasChanges ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
               Không có thay đổi nào. Dữ liệu đã đồng bộ.
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[45vh]">
              <div className="space-y-2">
                {/* Added */}
                {summary.added > 0 && (
                  <CollapsibleSection
                    title={`${summary.added} ${entityLabel} mới`}
                    icon={Plus}
                    color="text-emerald-600"
                    expanded={expandedSection === "added"}
                    onToggle={() => toggleSection("added")}
                  >
                    {details.added.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 px-3 text-xs">
                        <Plus className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="font-medium">{item.full_name}</span>
                        {item.email && <span className="text-muted-foreground truncate">{item.email}</span>}
                      </div>
                    ))}
                  </CollapsibleSection>
                )}

                {/* Updated */}
                {summary.updated > 0 && (
                  <CollapsibleSection
                    title={`${summary.updated} ${entityLabel} cập nhật`}
                    icon={RefreshCw}
                    color="text-blue-600"
                    expanded={expandedSection === "updated"}
                    onToggle={() => toggleSection("updated")}
                  >
                    {details.updated.map((item, i) => (
                      <div key={i} className="py-2 px-3 border-b border-border/30 last:border-0">
                        <p className="text-xs font-medium mb-1">{item.full_name}</p>
                        <div className="space-y-0.5">
                          {Object.entries(item.changes).map(([field, { old: oldVal, new: newVal }]) => (
                            <div key={field} className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground w-16 shrink-0">{FIELD_LABELS[field] || field}:</span>
                              <span className="text-rose-500 line-through truncate max-w-[150px]">{oldVal || "—"}</span>
                              <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                              <span className="text-emerald-600 truncate max-w-[150px]">{newVal || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CollapsibleSection>
                )}

                {/* Removed */}
                {summary.removed > 0 && (
                  <CollapsibleSection
                    title={`${summary.removed} ${entityLabel} không còn trên TnG`}
                    icon={Minus}
                    color="text-rose-600"
                    expanded={expandedSection === "removed"}
                    onToggle={() => toggleSection("removed")}
                  >
                    <div className="px-3 py-1.5 text-[11px] text-amber-600 bg-amber-500/5 rounded mb-1">
                       Các {entityLabel} này sẽ được đánh dấu"Archived"
                    </div>
                    {details.removed.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 px-3 text-xs">
                        <Minus className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="font-medium text-muted-foreground">{item.full_name}</span>
                        {item.email && <span className="text-muted-foreground/60 truncate">{item.email}</span>}
                      </div>
                    ))}
                  </CollapsibleSection>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Hủy
          </Button>
          {hasChanges && (
            <Button onClick={onConfirm} disabled={confirming}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Xác nhận đồng bộ
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ icon: Icon, label, count, color }: {
  icon: any; label: string; count: number; color: string;
}) {
  return (
    <div className={cn("rounded-lg p-3 text-center", color)}>
      <Icon className="h-4 w-4 mx-auto mb-1" />
      <p className="text-lg font-bold leading-none">{count}</p>
      <p className="text-[10px] mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, color, expanded, onToggle, children }: {
  title: string; icon: any; color: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-sm font-medium flex-1">{title}</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t bg-muted/10 max-h-[200px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

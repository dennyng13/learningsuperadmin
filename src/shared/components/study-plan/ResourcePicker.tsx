import { useMemo, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { Search, Plus, X, Check, type LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/utils";

export interface PickableResource {
  id: string;
  title: string;
  skill?: string | null;
  course_level?: string | null;
  program?: string | null;
  section_type?: string | null;
}

interface Props {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  /** Pre-filtered list (program/level filter handled at parent level) */
  options: PickableResource[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Optional badge color for selected chips */
  selectedBg?: string;
  emptyHint?: string;
}

const SKILL_LABEL: Record<string, string> = {
  L: "Listening", R: "Reading", W: "Writing", S: "Speaking",
  listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking",
};

export function ResourcePicker({
  label, icon: Icon, iconColor, options, selectedIds, onChange,
  selectedBg = "bg-primary", emptyHint = "Chưa có dữ liệu",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const skillOptions = useMemo(() => {
    const set = new Set<string>();
    options.forEach((o) => o.skill && set.add(o.skill));
    return Array.from(set);
  }, [options]);

  const levelOptions = useMemo(() => {
    const set = new Set<string>();
    options.forEach((o) => o.course_level && set.add(o.course_level));
    return Array.from(set);
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      if (skillFilter !== "all" && o.skill !== skillFilter) return false;
      if (levelFilter !== "all" && o.course_level !== levelFilter) return false;
      if (q && !o.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [options, query, skillFilter, levelFilter]);

  const selectedItems = useMemo(
    () => options.filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds]
  );

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", iconColor)} /> {label}
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              {selectedIds.length}
            </Badge>
          )}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]">
              <Plus className="w-3 h-3 mr-0.5" /> Thêm
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0" align="end">
            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  className="h-8 text-xs pl-7"
                  placeholder="Tìm theo tên..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {/* Filters */}
              {(skillOptions.length > 0 || levelOptions.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {skillOptions.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSkillFilter("all")}
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded border",
                          skillFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                        )}
                      >
                        Tất cả kỹ năng
                      </button>
                      {skillOptions.map((sk) => (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => setSkillFilter(sk)}
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded border",
                            skillFilter === sk ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                          )}
                        >
                          {SKILL_LABEL[sk] || sk}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
              {levelOptions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setLevelFilter("all")}
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded border",
                      levelFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                    )}
                  >
                    Tất cả cấp độ
                  </button>
                  {levelOptions.map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevelFilter(lv)}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border",
                        levelFilter === lv ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                      )}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Results */}
            <div className="max-h-[280px] overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground py-6">
                  {options.length === 0 ? emptyHint : "Không tìm thấy"}
                </p>
              ) : (
                filtered.map((o) => {
                  const selected = selectedIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(o.id)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 hover:bg-muted transition-colors",
                        selected && "bg-primary/5"
                      )}
                    >
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0",
                        selected ? "bg-primary border-primary" : "border-border"
                      )}>
                        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <span className="flex-1 truncate font-medium">{o.title}</span>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {o.skill && <span className="text-[8px] bg-muted px-1 py-0.5 rounded">{SKILL_LABEL[o.skill] || o.skill}</span>}
                        {o.section_type && <span className="text-[8px] bg-muted px-1 py-0.5 rounded">{o.section_type}</span>}
                        {o.course_level && <span className="text-[8px] bg-muted px-1 py-0.5 rounded">{o.course_level}</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-border p-2 flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">
                Đã chọn {selectedIds.length}
              </span>
              <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setOpen(false)}>
                Xong
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected chips */}
      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((s) => (
            <Badge
              key={s.id}
              className={cn("text-[10px] gap-1 pr-1", selectedBg, "text-white")}
              variant="default"
            >
              <span className="truncate max-w-[180px]">{s.title}</span>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className="hover:bg-white/20 rounded-full w-3.5 h-3.5 flex items-center justify-center"
                aria-label="Bỏ chọn"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">Chưa gán</p>
      )}
    </div>
  );
}

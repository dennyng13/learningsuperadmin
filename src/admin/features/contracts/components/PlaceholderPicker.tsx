import { useMemo, useState } from "react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@shared/components/ui/popover";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { ChevronDown, Search, Sparkles } from "lucide-react";
import {
  RESERVED_PLACEHOLDERS,
  type ReservedPlaceholder,
} from "../utils/reservedFieldKeys";
import type { ContractTemplateFieldRow } from "../types";

interface PlaceholderPickerProps {
  customFields: ContractTemplateFieldRow[];
  onPick: (key: string) => void;
  reservedPlaceholders?: ReservedPlaceholder[];
}

interface PickerEntry {
  key: string;
  label: string;
  group: string;
  isCustom: boolean;
}

export default function PlaceholderPicker({
  customFields,
  onPick,
  reservedPlaceholders = RESERVED_PLACEHOLDERS,
}: PlaceholderPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const entries: PickerEntry[] = useMemo(() => {
    const reserved = reservedPlaceholders.map((p: ReservedPlaceholder) => ({
      ...p, isCustom: false,
    }));
    const custom: PickerEntry[] = customFields.map((f) => ({
      key: f.field_key,
      label: f.label,
      group: f.field_group ? `Tùy chỉnh — ${f.field_group}` : "Tùy chỉnh",
      isCustom: true,
    }));
    return [...reserved, ...custom];
  }, [customFields, reservedPlaceholders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.key.toLowerCase().includes(q) || e.label.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const groups = useMemo(() => {
    const map = new Map<string, PickerEntry[]>();
    for (const e of filtered) {
      const list = map.get(e.group) ?? [];
      list.push(e);
      map.set(e.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handlePick = (key: string) => {
    onPick(key);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Chèn placeholder
          <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm placeholder…"
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {groups.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 text-center">
              Không có placeholder phù hợp.
            </p>
          )}
          {groups.map(([groupName, items]) => (
            <div key={groupName}>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                {groupName}
              </div>
              {items.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2 group"
                  onClick={() => handlePick(e.key)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.label}</div>
                    <code className="text-[10px] text-muted-foreground">
                      {`{{${e.key}}}`}
                    </code>
                  </div>
                  {e.isCustom ? (
                    <Badge variant="secondary" className="text-[10px]">Tùy chỉnh</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Auto-fill</Badge>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

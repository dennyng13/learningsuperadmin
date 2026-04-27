/**
 * useBulkSelection — generic checkbox selection state cho list pages.
 *
 * Dùng chung cho Practice / Flashcards / Tests:
 *   const sel = useBulkSelection(visibleIds);
 *   <Checkbox checked={sel.isSelected(id)} onChange={() => sel.toggle(id)} />
 *   <Checkbox checked={sel.allSelected} onChange={sel.toggleAll} />
 *
 * - `visibleIds` thay đổi (vd filter) → tự loại bỏ ID không còn hiển thị
 *   khỏi selection để tránh "select 5 nhưng chỉ thấy 2".
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export function useBulkSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drop IDs that are no longer visible (filter changed, item deleted, ...)
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(visibleIds);
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [visibleIds]);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === visibleIds.length && visibleIds.length > 0) return new Set();
      return new Set(visibleIds);
    });
  }, [visibleIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected = useMemo(
    () => visibleIds.length > 0 && selected.size === visibleIds.length,
    [visibleIds.length, selected.size],
  );
  const someSelected = useMemo(
    () => selected.size > 0 && selected.size < visibleIds.length,
    [visibleIds.length, selected.size],
  );

  return {
    selected,
    selectedIds: useMemo(() => Array.from(selected), [selected]),
    count: selected.size,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
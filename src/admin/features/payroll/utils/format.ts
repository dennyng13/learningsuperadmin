export function formatVnd(n: number | null | undefined) {
  return ((n ?? 0).toLocaleString("vi-VN")) + " VNĐ";
}

export function formatVndSigned(n: number | null | undefined) {
  const v = n ?? 0;
  if (v > 0) return "+" + v.toLocaleString("vi-VN") + " VNĐ";
  if (v < 0) return v.toLocaleString("vi-VN") + " VNĐ"; // negative sign already
  return "0 VNĐ";
}

export function formatMonth(iso: string) {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

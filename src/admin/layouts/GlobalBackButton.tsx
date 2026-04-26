import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { isTopLevelAdminRoute } from "@shared/config/navigation";

/**
 * Global "Quay lại" button rendered next to the breadcrumb in `AdminLayout`.
 * Visible on EVERY admin page except dashboard (`/`), so user always has a
 * one-click way back without each module needing its own back button.
 *
 * Behaviour: prefers `navigate(-1)` to feel natural; falls back to dashboard
 * if the user landed on a deep link with no history.
 */
export function GlobalBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (isTopLevelAdminRoute(pathname)) return null;

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Quay lại"
      className="mr-2 inline-flex h-7 items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 text-[11px] font-medium text-foreground/70 hover:border-primary/40 hover:bg-card hover:text-foreground transition-colors shrink-0"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Quay lại
    </button>
  );
}
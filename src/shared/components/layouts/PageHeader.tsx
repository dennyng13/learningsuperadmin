import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isTopLevelAdminRoute } from "@shared/config/navigation";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Explicit route to navigate to. Nếu không truyền, nút back gọi `navigate(-1)`. */
  backRoute?: string;
  backLabel?: string;
  /**
   * Override hành vi auto. Mặc định: ẩn ở top-level admin route (dashboard,
   * /library, /users, /classes/list, …) và hiện ở mọi trang con khác.
   * Truyền `false` để ép ẩn, `true` để ép hiện.
   */
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, backRoute, backLabel, showBack, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Auto: hiện nút back ở mọi trang KHÔNG phải top-level (dashboard / sidebar
  // entries). Caller có thể ép qua prop `showBack` hoặc truyền `backRoute`.
  const shouldShowBack = showBack ?? (Boolean(backRoute) || !isTopLevelAdminRoute(pathname));

  const handleBack = () => {
    if (backRoute) {
      navigate(backRoute);
      return;
    }
    // Nếu không có history (vd user mở tab mới vào deep link) → về dashboard.
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex items-start gap-3 mb-5">
      {shouldShowBack && (
        <button
          onClick={handleBack}
          className="mt-0.5 p-1.5 rounded-xl hover:bg-muted/60 transition-colors shrink-0"
          aria-label={backLabel || "Quay lại"}
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary shrink-0" />}
          <h1 className="font-display text-xl font-extrabold tracking-tight truncate">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

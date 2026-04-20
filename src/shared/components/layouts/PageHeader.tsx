import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  backRoute?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, backRoute, backLabel, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3 mb-5">
      {backRoute && (
        <button
          onClick={() => navigate(backRoute)}
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

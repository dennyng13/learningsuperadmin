/**
 * PlaceholderPage — single shared "coming soon" component for IA modules
 * that don't have a real implementation yet.
 *
 * Mounted from AdminRoutes for ~12 routes added in Day 7 IA overhaul. Pages
 * track via PLACEHOLDER_TRACKING.md (root). Each placeholder shows:
 * - Header with route-specific title + icon
 * - DemoBanner-style alert ("Tính năng đang phát triển")
 * - Optional sub-bullets describing planned scope
 *
 * Replace this component (or remove the route) once the real page ships.
 */

import { Construction } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DetailPageLayout } from "@shared/components/layouts/DetailPageLayout";
import { Button } from "@shared/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Short paragraph describing what this module will do once shipped. */
  description?: string;
  /** Optional bullet list of planned sub-features. */
  scope?: string[];
  /** Optional ETA hint. Default "TBD". */
  eta?: string;
}

export function PlaceholderPage({
  title,
  subtitle,
  icon: Icon = Construction,
  description,
  scope,
  eta = "TBD",
}: Props) {
  const navigate = useNavigate();

  return (
    <DetailPageLayout
      title={title}
      subtitle={subtitle}
      icon={Icon}
      backRoute="/"
      backLabel="Trang chủ"
    >
      {/* Demo banner */}
      <div className="rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-5 mb-4">
        <div className="flex items-start gap-3">
          <Construction className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-display text-sm font-bold text-amber-900 dark:text-amber-200">
              Tính năng đang được phát triển
            </p>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
              Trang này là placeholder. Module sẽ sớm có mặt — backend dependencies + UI
              đang được hoàn thiện. ETA: <span className="font-mono">{eta}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Scope card */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-center pt-4">
          <Icon className="h-12 w-12 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {description}
            </p>
          )}
        </div>
        {scope && scope.length > 0 && (
          <div className="max-w-md mx-auto space-y-1.5 pt-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground text-center">
              Phạm vi dự kiến
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {scope.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-lp-coral mt-0.5">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            Quay về Trang chủ
          </Button>
        </div>
      </div>
    </DetailPageLayout>
  );
}

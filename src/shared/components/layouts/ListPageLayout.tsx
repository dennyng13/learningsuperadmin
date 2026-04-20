import React from "react";
import { PageHeader } from "./PageHeader";
import type { LucideIcon } from "lucide-react";

interface ListPageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  backRoute?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
}

export function ListPageLayout({
  title, subtitle, icon, backRoute, backLabel, actions,
  filterBar, children,
}: ListPageLayoutProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-5 md:py-8">
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        backRoute={backRoute}
        backLabel={backLabel}
        actions={actions}
      />
      {filterBar && (
        <div className="sticky top-0 md:top-14 z-20 bg-background/95 backdrop-blur-sm pb-3 -mx-4 px-4 border-b border-border/40 mb-4">
          {filterBar}
        </div>
      )}
      {children}
    </div>
  );
}

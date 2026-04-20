import React from "react";
import { PageHeader } from "./PageHeader";
import type { LucideIcon } from "lucide-react";

interface DetailPageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  backRoute?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailPageLayout({
  title, subtitle, icon, backRoute, backLabel, actions, children,
}: DetailPageLayoutProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 md:py-8">
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        backRoute={backRoute}
        backLabel={backLabel}
        actions={actions}
      />
      {children}
    </div>
  );
}

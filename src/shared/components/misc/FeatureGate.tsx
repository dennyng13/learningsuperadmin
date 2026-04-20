import React from "react";
import { useModuleAccess } from "@shared/hooks/useModuleAccess";
import { useAuth, type AppRole } from "@shared/hooks/useAuth";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Override role (defaults to primaryRole from useAuth) */
  role?: AppRole | null;
}

/**
 * Declarative feature gate that wraps useModuleAccess.
 * Shows children if role has access, otherwise shows fallback (or LockedFeatureCard).
 */
export function FeatureGate({ module, children, fallback, role: roleProp }: FeatureGateProps) {
  const { primaryRole } = useAuth();
  const { canAccess, loading } = useModuleAccess();

  const role = roleProp ?? primaryRole;

  if (loading) return null;

  if (canAccess(role, module)) {
    return <>{children}</>;
  }

  return <>{fallback ?? <LockedFeatureCard />}</>;
}

/**
 * Default locked state card with upgrade CTA.
 */
export function LockedFeatureCard() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-muted/30">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-display text-base font-bold text-foreground mb-1">
        Tính năng dành cho học viên chính thức
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Liên hệ trung tâm để được nâng cấp tài khoản và sử dụng tính năng này.
      </p>
    </div>
  );
}

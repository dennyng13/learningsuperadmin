import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "admin" | "teacher" | "user" | "guest";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isGuest: boolean;
  primaryRole: AppRole | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    loading: true,
    isAdmin: false,
    isSuperAdmin: false,
    isTeacher: false,
    isStudent: false,
    isGuest: false,
    primaryRole: null,
  });

  const applyAuthState = (user: User | null, session: Session | null, roles: AppRole[], loading: boolean) => {
    setState(computeState(user, session, roles, loading));
  };

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.warn("[useAuth] Failed to load roles", error);
        return [];
      }

      const roles = (data?.map((r: any) => r.role as AppRole)) ?? [];
      return roles;
    } catch (error) {
      console.warn("[useAuth] Unexpected role fetch error", error);
      return [];
    }
  }, []);

  const computeState = (user: User | null, session: Session | null, roles: AppRole[], loading: boolean): AuthState => {
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    const isSuperAdmin = roles.includes("super_admin");
    const isTeacher = roles.includes("teacher");
    const isStudent = roles.includes("user");
    const isGuest = roles.includes("guest");
    // Priority: super_admin > admin > teacher > user > guest
    const primaryRole = isSuperAdmin ? "super_admin" : isAdmin ? "admin" : isTeacher ? "teacher" : isStudent ? "user" : isGuest ? "guest" : null;
    return { user, session, roles, loading, isAdmin, isSuperAdmin, isTeacher, isStudent, isGuest, primaryRole };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const roles = await fetchRoles(session.user.id);
            applyAuthState(session.user, session, roles, false);
          }, 0);
        } else {
          applyAuthState(null, null, [], false);
        }
      }
    );

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.warn("[useAuth] Failed to restore session", error);
          applyAuthState(null, null, [], false);
          return;
        }

        if (session?.user) {
          const roles = await fetchRoles(session.user.id);
          applyAuthState(session.user, session, roles, false);
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
      })
      .catch((error) => {
        console.warn("[useAuth] Unexpected session restore error", error);
        applyAuthState(null, null, [], false);
      });

    return () => subscription.unsubscribe();
  }, [fetchRoles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}

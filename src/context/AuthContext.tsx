import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "agent" | "customer";

export type Profile = {
  id: string;
  display_name: string | null;
  organization: string | null;
  preferred_language: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      if (!next) {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, organization, preferred_language")
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (cancelled) return;
      setProfile(profileRow);
      setRoles(roleRows?.map(({ role }) => role) ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      hasRole: (role: AppRole) => roles.includes(role),
      signOut,
    }),
    [session, profile, roles, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, getFreshSession, forceSignOut } from '../lib/supabase';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshNow: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial load
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.warn('getSession error:', error);
      setSession(data.session ?? null);
      setLoading(false);
    });

    // Listen for auth changes (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await forceSignOut();
    setSession(null);
  };

  const refreshNow = async () => {
    const fresh = await getFreshSession(300);
    if (!fresh) await signOut();
    else setSession(fresh);
  };

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, signOut, refreshNow }),
    [session, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

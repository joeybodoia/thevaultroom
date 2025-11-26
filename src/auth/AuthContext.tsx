import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, getFreshSession, forceSignOut } from '../lib/supabase';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  idleWarning: boolean;
  signOut: (reason?: string, options?: { reload?: boolean }) => Promise<void>;
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
  const [idleWarning, setIdleWarning] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
  };

  const scheduleRefresh = (nextSession: Session | null) => {
    if (!nextSession?.expires_at) return;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);

    const now = Math.floor(Date.now() / 1000);
    const refreshInSeconds = Math.max(nextSession.expires_at - now - 180, 5); // refresh 3 minutes early
    refreshTimer.current = setTimeout(async () => {
      const fresh = await getFreshSession(300);
      if (!fresh) {
        await forceSignOut();
        setSession(null);
      } else {
        setSession(fresh);
        scheduleRefresh(fresh);
      }
    }, refreshInSeconds * 1000);
  };

  const resetIdleTimers = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
    setIdleWarning(false);

    // warn at 25m, sign out at 30m
    idleWarningTimer.current = setTimeout(() => {
      setIdleWarning(true);
    }, 25 * 60 * 1000);

    idleTimer.current = setTimeout(async () => {
      await forceSignOut();
      setSession(null);
      setIdleWarning(false);
      try {
        alert('You were signed out due to inactivity.');
      } catch (_) {
        console.warn('Signed out due to inactivity.');
      }
    }, 30 * 60 * 1000);
  };

  useEffect(() => {
    let mounted = true;
    const loadTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[auth] getSession timeout; clearing session and continuing');
        setSession(null);
        setLoading(false);
      }
    }, 6000);

    // Initial load
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn('getSession error:', error);
        console.log('[auth] initial session', {
          hasSession: !!data.session,
          userId: data.session?.user.id,
          expiresAt: data.session?.expires_at,
        });
        setSession(data.session ?? null);
        setLoading(false);
        scheduleRefresh(data.session ?? null);
        resetIdleTimers();
      })
      .catch((err) => {
        console.warn('getSession failed:', err);
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    // Listen for auth changes (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      console.log('[auth] onAuthStateChange', {
        event,
        hasSession: !!s,
        userId: s?.user?.id,
        expiresAt: s?.expires_at,
      });
      setSession(s ?? null);
      scheduleRefresh(s ?? null);
      if (event === 'SIGNED_OUT') {
        clearTimers();
        setIdleWarning(false);
      } else {
        resetIdleTimers();
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(loadTimeout);
      clearTimers();
      sub?.subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', resetIdleTimers);
        window.removeEventListener('keydown', resetIdleTimers);
        window.removeEventListener('click', resetIdleTimers);
        window.removeEventListener('touchstart', resetIdleTimers);
      }
    };
  }, []);

  const signOut = async (reason?: string, options?: { reload?: boolean }) => {
    console.log('[auth] signOut start', {
      reason,
      userId: session?.user?.id,
    });
    clearTimers();
    try {
      await Promise.race([
        forceSignOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000)),
      ]);
      console.log('[auth] signOut success');
    } catch (e) {
      console.warn('signOut fallback:', e);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
      console.log('[auth] storage cleared after signOut error');
    } finally {
      setSession(null);
      setIdleWarning(false);
      setLoading(false);
      console.log('[auth] signOut finished, session cleared');
      if (options?.reload) {
        console.log('[auth] reloading page after signOut');
        try {
          window.location.reload();
        } catch (e) {
          console.warn('[auth] reload failed:', e);
        }
      }
    }
  };

  const refreshNow = async () => {
    console.log('[auth] refreshNow called');
    const fresh = await getFreshSession(300);
    if (!fresh) {
      await signOut();
    } else {
      console.log('[auth] refreshNow got session', {
        userId: fresh.user.id,
        expiresAt: fresh.expires_at,
      });
      setSession(fresh);
      scheduleRefresh(fresh);
      resetIdleTimers();
    }
  };

  // User activity listeners for idle timeout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    resetIdleTimers();
    window.addEventListener('mousemove', resetIdleTimers);
    window.addEventListener('keydown', resetIdleTimers);
    window.addEventListener('click', resetIdleTimers);
    window.addEventListener('touchstart', resetIdleTimers);
    return () => {
      window.removeEventListener('mousemove', resetIdleTimers);
      window.removeEventListener('keydown', resetIdleTimers);
      window.removeEventListener('click', resetIdleTimers);
      window.removeEventListener('touchstart', resetIdleTimers);
    };
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, idleWarning, signOut, refreshNow }),
    [session, loading, idleWarning]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

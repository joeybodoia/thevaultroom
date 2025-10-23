// supabase.ts
// -------------------------------------------------------------
// Production-ready Supabase client for React + Vite (JS v2).
// - PKCE auth for SPA
// - persistSession + autoRefreshToken
// - Cross-tab auth sync
// - Focus/visibility "wake refresh"
// - Helpers: getFreshSession(), forceSignOut()
// -------------------------------------------------------------

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,   // store session in localStorage
    autoRefreshToken: true, // proactively refresh before expiry
    detectSessionInUrl: true,
    flowType: 'pkce',       // recommended for SPA
    // storage: localStorage // (default in browser)
  },
  global: { fetch },
})

/**
 * Returns a fresh session, refreshing if the access token is near expiry.
 * Use before important API calls or on app/tab focus to avoid "stale token" loops.
 */
export async function getFreshSession(minSecondsLeft = 60): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.warn('[supabase] getSession error:', error)
    return null
  }
  const session = data.session
  if (!session?.expires_at) return session ?? null

  const now = Math.floor(Date.now() / 1000)
  const secondsLeft = session.expires_at - now
  if (secondsLeft <= minSecondsLeft) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
    if (refreshErr) {
      console.warn('[supabase] refreshSession error:', refreshErr)
      return null
    }
    return refreshed.session ?? null
  }
  return session
}

/**
 * Force a clean sign-out and clear local storage.
 * Call this when refresh fails or you detect repeated 401/403s.
 */
export async function forceSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'global' })
  } catch (e) {
    console.warn('[supabase] signOut error:', e)
  } finally {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
  }
}

/**
 * Lightweight lifecycle setup:
 * - Keep a subscription alive to enable cross-tab auth sync.
 * - On focus/visibility, try to "wake" and refresh the session.
 */
(function setupAuthLifecycle() {
  // Cross-tab sync via BroadcastChannel
  const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
    // No-op here; your app's AuthProvider/guards can react as needed.
    // The subscription itself enables sync between tabs.
  })

  async function onFocus() {
    try {
      await getFreshSession(60)
    } catch (e) {
      console.warn('[supabase] focus refresh failed:', e)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus()
    })
  }

  // Clean up on Vite HMR to avoid duplicate listeners in dev
  if (import.meta?.hot) {
    import.meta.hot.dispose(() => {
      sub?.subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus as any)
      }
    })
  }
})()

/**
 * Optional convenience: fetch the current user safely.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.warn('[supabase] getUser error:', error)
    return null
  }
  return data.user ?? null
}

/**
 * Optional convenience: handle 401/403 responses globally in your data layer:
 *
 * Example:
 * const { data, error } = await supabase.from('profiles').select('*')
 * if (error?.status === 401 || error?.code === 'PGRST301') {
 *   const s = await getFreshSession(300)
 *   if (!s) await forceSignOut()
 * }
 */
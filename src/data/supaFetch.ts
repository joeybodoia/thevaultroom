import { supabase, getFreshSession, forceSignOut } from '../lib/supabase'

export async function supaFetch<T>(cb: () => Promise<{ data: T; error: any }>): Promise<T> {
  const s = await getFreshSession(60)
  if (!s) {
    await forceSignOut()
    throw new Error('Session expired')
  }

  const { data, error } = await cb()
  if (error?.status === 401 || error?.code === 'PGRST301') {
    const retried = await getFreshSession(300)
    if (!retried) {
      await forceSignOut()
      throw new Error('Unauthorized')
    }
    const retry = await cb()
    if (retry.error) throw retry.error
    return retry.data
  }
  if (error) throw error
  return data
}
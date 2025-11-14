import { supabase, forceSignOut } from '../lib/supabase';

export async function supaFetch<T>(
  cb: () => Promise<{ data: T; error: any }>
): Promise<T> {
  // First attempt
  const { data, error } = await cb();

  // If unauthorized, try a one-time refresh + retry
  if (error?.status === 401 || error?.code === 'PGRST301') {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();

    if (refreshErr || !refreshed.session) {
      await forceSignOut();
      throw new Error('Unauthorized');
    }

    const retry = await cb();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  if (error) throw error;
  return data;
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if environment variables are available
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase configuration missing:')
  console.warn('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Present' : '✗ Missing')
  console.warn('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Present' : '✗ Missing')
  console.warn('The app will run in demo mode with mock data.')
}
// Create client only if configured, otherwise create a mock client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
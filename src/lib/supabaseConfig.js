/**
 * Where the app finds its Supabase project. Values come from Vite env vars
 * (see .env / .env.example); nothing is hardcoded in source.
 */
export const SUPABASE_URL      = (import.meta.env.VITE_SUPABASE_URL      ?? '').trim()
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

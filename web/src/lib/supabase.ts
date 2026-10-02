import { createClient } from '@supabase/supabase-js'

// Only the public project URL and anon (publishable) key belong here.
// Never put SUPABASE_DB_URL or the service_role key in a VITE_ variable:
// everything prefixed with VITE_ is bundled into the public JS.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (see web/.env.example)')
}

export const supabase = createClient(url, anonKey)

export type Movie = {
  id: number
  name: string
  date: string // YYYY-MM-DD
  gun_score: number | null
  team_score: number | null
  comment: string
}

export type MovieInput = Omit<Movie, 'id'>

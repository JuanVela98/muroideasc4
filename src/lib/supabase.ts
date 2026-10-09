import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

// Si faltan las llaves exportamos null y la app muestra un aviso en vez de romperse.
export const supabase = isConfigured ? createClient(url!, key!) : null

export const MAX_LENGTH = 280

export type Idea = {
  id: number
  user_id: string
  author_name: string
  content: string
  created_at: string
  updated_at: string
}

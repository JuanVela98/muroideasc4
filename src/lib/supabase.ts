import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

// Si faltan las llaves exportamos null y la app muestra un aviso en vez de romperse.
export const supabase = isConfigured ? createClient(url!, key!) : null

export const MAX_LENGTH = 280

export const NOTE_COLORS = ['amarillo', 'rosa', 'azul', 'verde', 'naranja', 'morado'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export type Idea = {
  id: number
  user_id: string
  author_name: string
  content: string
  color: NoteColor
  x: number
  y: number
  created_at: string
  updated_at: string
}

// Color estable por persona, para su cursor.
export function userColor(userId: string) {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) % 360
  return `hsl(${h} 75% 45%)`
}

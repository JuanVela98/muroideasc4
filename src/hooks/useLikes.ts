import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Reaction = 'love' | 'like'
type Reactions = Record<Reaction, number[]>

const STORAGE_KEY = 'muro-reacciones'
const EMPTY: Reactions = { love: [], like: [] }

function onlyNumbers(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((n) => typeof n === 'number') : []
}

function loadMine(): Reactions {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { love: onlyNumbers(saved?.love), like: onlyNumbers(saved?.like) }
  } catch {
    return EMPTY
  }
}

function saveMine(r: Reactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r))
  } catch {
    // Sin almacenamiento (ventana privada): igual funciona mientras la página esté abierta.
  }
}

// "Me encanta" y "Like" en vivo, sin tabla: cada persona conectada anuncia qué ideas le
// gustan (igual que el contador de conectados). Solo cuentan las personas que están en la
// página. Los tuyos se recuerdan en este navegador para que vuelvan a contar cuando entres.
export function useLikes(userId: string) {
  const [mine, setMine] = useState<Reactions>(loadMine)
  const [others, setOthers] = useState<Map<string, Reactions>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mineRef = useRef(mine)
  mineRef.current = mine

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const channel = client.channel('reacciones', {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const next = new Map<string, Reactions>()
        for (const [key, metas] of Object.entries(channel.presenceState<Partial<Reactions>>())) {
          if (key === userId) continue
          // Una persona con varias pestañas cuenta una sola vez por idea.
          const love = new Set<number>()
          const like = new Set<number>()
          for (const m of metas) {
            for (const id of onlyNumbers(m.love)) love.add(id)
            for (const id of onlyNumbers(m.like)) like.add(id)
          }
          next.set(key, { love: [...love], like: [...like] })
        }
        setOthers(next)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track(mineRef.current)
      })

    return () => {
      channelRef.current = null
      client.removeChannel(channel)
    }
  }, [userId])

  function countFor(ideaId: number, reaction: Reaction) {
    let n = mine[reaction].includes(ideaId) ? 1 : 0
    for (const r of others.values()) if (r[reaction].includes(ideaId)) n++
    return n
  }

  function reactedByMe(ideaId: number, reaction: Reaction) {
    return mine[reaction].includes(ideaId)
  }

  function toggle(ideaId: number, reaction: Reaction) {
    const list = mine[reaction]
    const next = {
      ...mine,
      [reaction]: list.includes(ideaId) ? list.filter((id) => id !== ideaId) : [...list, ideaId],
    }
    setMine(next)
    saveMine(next)
    channelRef.current?.track(next)
  }

  return { countFor, reactedByMe, toggle }
}

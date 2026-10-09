import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'muro-me-encanta'

function loadMine(): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((n) => typeof n === 'number') : []
  } catch {
    return []
  }
}

function saveMine(ids: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Sin almacenamiento (ventana privada): igual funciona mientras la página esté abierta.
  }
}

// "Me encanta" en vivo, sin tabla: cada persona conectada anuncia qué ideas le encantan
// (igual que el contador de conectados). Solo cuentan las personas que están en la página.
// Los tuyos se recuerdan en este navegador para que vuelvan a contar cuando entres.
export function useLikes(userId: string) {
  const [mine, setMine] = useState<number[]>(loadMine)
  const [others, setOthers] = useState<Map<string, number[]>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mineRef = useRef(mine)
  mineRef.current = mine

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const channel = client.channel('me-encanta', {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const next = new Map<string, number[]>()
        for (const [key, metas] of Object.entries(channel.presenceState<{ liked: number[] }>())) {
          if (key === userId) continue
          // Una persona con varias pestañas cuenta una sola vez por idea.
          const ids = new Set<number>()
          for (const m of metas) for (const id of m.liked ?? []) ids.add(id)
          next.set(key, [...ids])
        }
        setOthers(next)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ liked: mineRef.current })
      })

    return () => {
      channelRef.current = null
      client.removeChannel(channel)
    }
  }, [userId])

  function countFor(ideaId: number) {
    let n = mine.includes(ideaId) ? 1 : 0
    for (const ids of others.values()) if (ids.includes(ideaId)) n++
    return n
  }

  function likedByMe(ideaId: number) {
    return mine.includes(ideaId)
  }

  function toggleLike(ideaId: number) {
    const next = mine.includes(ideaId) ? mine.filter((id) => id !== ideaId) : [...mine, ideaId]
    setMine(next)
    saveMine(next)
    channelRef.current?.track({ liked: next })
  }

  return { countFor, likedByMe, toggleLike }
}

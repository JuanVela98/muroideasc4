import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, userColor } from '../lib/supabase'

export type Cursor = { id: string; name: string; color: string; x: number; y: number }

const THROTTLE_MS = 40

// Un solo canal en vivo para: personas conectadas, cursores y notas que se arrastran.
export function useLiveCanvas(
  userId: string,
  name: string,
  onRemoteMove: (id: number, x: number, y: number) => void,
) {
  const [online, setOnline] = useState(1)
  const [cursors, setCursors] = useState<Record<string, Cursor>>({})
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onMoveRef = useRef(onRemoteMove)
  onMoveRef.current = onRemoteMove
  const color = useMemo(() => userColor(userId), [userId])
  const lastCursor = useRef(0)
  const lastMove = useRef(0)

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const channel = client.channel('lienzo', {
      config: { presence: { key: userId }, broadcast: { self: false } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        // Cuenta personas (no pestañas) y borra el cursor de quien ya se fue.
        const ids = Object.keys(channel.presenceState())
        setOnline(Math.max(1, ids.length))
        setCursors((prev) => {
          const next: Record<string, Cursor> = {}
          for (const id of ids) if (prev[id]) next[id] = prev[id]
          return next
        })
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const c = payload as Cursor
        if (c.id !== userId) setCursors((prev) => ({ ...prev, [c.id]: c }))
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        const m = payload as { id: number; x: number; y: number }
        onMoveRef.current(m.id, m.x, m.y)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ name })
      })

    channelRef.current = channel
    return () => {
      channelRef.current = null
      client.removeChannel(channel)
    }
  }, [userId, name])

  const sendCursor = useCallback(
    (x: number, y: number) => {
      const now = performance.now()
      if (now - lastCursor.current < THROTTLE_MS) return
      lastCursor.current = now
      channelRef.current?.send({ type: 'broadcast', event: 'cursor', payload: { id: userId, name, color, x, y } })
    },
    [userId, name, color],
  )

  const sendMove = useCallback((id: number, x: number, y: number) => {
    const now = performance.now()
    if (now - lastMove.current < THROTTLE_MS) return
    lastMove.current = now
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { id, x, y } })
  }, [])

  return { online, cursors, color, sendCursor, sendMove }
}

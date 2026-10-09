import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Cuenta personas conectadas (no pestañas): cada usuario se anuncia con su id.
export function useOnlineCount(userId: string, name: string) {
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const channel = client.channel('conectados', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        setCount(Math.max(1, Object.keys(channel.presenceState()).length))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name, since: new Date().toISOString() })
        }
      })

    return () => {
      client.removeChannel(channel)
    }
  }, [userId, name])

  return count
}

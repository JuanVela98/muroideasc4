import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type NoteColor } from '../lib/supabase'
import { useIdeas } from '../hooks/useIdeas'
import { useLikes } from '../hooks/useLikes'
import { useLiveCanvas } from '../hooks/useLiveCanvas'
import { Canvas, type Pan } from './Canvas'
import { Composer } from './Composer'

const TOPBAR_HEIGHT = 57
const NOTE_WIDTH = 240

export function Wall({ session }: { session: Session }) {
  const user = session.user
  const name = (user.user_metadata?.display_name as string | undefined)?.trim() || user.email?.split('@')[0] || 'Anónimo'
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 })
  const ideasApi = useIdeas()
  const likes = useLikes(user.id)
  const { online, cursors, sendCursor, sendMove } = useLiveCanvas(user.id, name, ideasApi.moveLocal)

  // La nota nueva aparece en el centro de lo que estás viendo, con un poco de desorden.
  async function publish(content: string, color: NoteColor) {
    const jitter = () => (Math.random() - 0.5) * 120
    const x = window.innerWidth / 2 - pan.x - NOTE_WIDTH / 2 + jitter()
    const y = (window.innerHeight - TOPBAR_HEIGHT) / 2 - pan.y - 130 + jitter()
    await ideasApi.addIdea(content, color, Math.round(x), Math.round(y))
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden>💡</span>
          <span className="brand-name">Muro de Ideas</span>
        </div>
        <div className="online" aria-live="polite">
          <span className="dot" aria-hidden />
          <strong>{online}</strong> {online === 1 ? 'conectado' : 'conectados'}
        </div>
        <div className="me">
          <span className="me-name">{name}</span>
          <button onClick={() => supabase!.auth.signOut()}>Salir</button>
        </div>
      </header>

      <Canvas
        ideas={ideasApi.ideas}
        userId={user.id}
        pan={pan}
        setPan={setPan}
        cursors={cursors}
        sendCursor={sendCursor}
        sendMove={sendMove}
        moveLocal={ideasApi.moveLocal}
        dragging={ideasApi.dragging}
        saveMove={ideasApi.saveMove}
        setColor={ideasApi.setColor}
        updateIdea={ideasApi.updateIdea}
        deleteIdea={ideasApi.deleteIdea}
        likes={likes}
      />

      {ideasApi.error && <p className="toast error" role="alert">{ideasApi.error}</p>}
      {ideasApi.loading ? (
        <p className="hint">Cargando ideas…</p>
      ) : ideasApi.ideas.length === 0 ? (
        <p className="hint">Todavía no hay ideas. ¡Publica la primera! Arrastra el fondo para moverte.</p>
      ) : null}

      <Composer onSubmit={publish} />
    </>
  )
}

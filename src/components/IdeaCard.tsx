import { useState } from 'react'
import { MAX_LENGTH, type Idea } from '../lib/supabase'

function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  if (seconds < 45) return 'hace un momento'
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), 'minute')
  if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), 'hour')
  return rtf.format(-Math.round(seconds / 86400), 'day')
}

type Props = {
  idea: Idea
  isMine: boolean
  likes: number
  liked: boolean
  onToggleLike: () => void
  onUpdate: (id: number, content: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function IdeaCard({ idea, isMine, likes, liked, onToggleLike, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(idea.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edited = new Date(idea.updated_at).getTime() - new Date(idea.created_at).getTime() > 1000
  const draftLength = draft.trim().length

  async function save() {
    if (!draftLength || draft.length > MAX_LENGTH) return
    setBusy(true)
    setError(null)
    try {
      await onUpdate(idea.id, draft.trim())
      setEditing(false)
    } catch {
      setError('No se pudo guardar.')
    }
    setBusy(false)
  }

  async function remove() {
    if (!confirm('¿Borrar esta idea? No se puede deshacer.')) return
    setBusy(true)
    try {
      await onDelete(idea.id)
    } catch {
      setError('No se pudo borrar.')
      setBusy(false)
    }
  }

  return (
    <article className={`idea ${isMine ? 'mine' : ''}`}>
      <header>
        <span className="avatar" aria-hidden>{idea.author_name.charAt(0).toUpperCase()}</span>
        <strong>{idea.author_name}</strong>
        {isMine && <span className="tag">Tú</span>}
        <time dateTime={idea.created_at} title={new Date(idea.created_at).toLocaleString('es')}>
          {timeAgo(idea.created_at)}
          {edited && ' · editada'}
        </time>
      </header>

      {editing ? (
        <div className="edit">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus aria-label="Editar idea" />
          <div className="form-row">
            <span className={`counter ${draft.length > MAX_LENGTH ? 'over' : ''}`}>{draft.length}/{MAX_LENGTH}</span>
            <div className="actions">
              <button onClick={() => { setEditing(false); setDraft(idea.content); setError(null) }} disabled={busy}>
                Cancelar
              </button>
              <button className="primary" onClick={save} disabled={busy || !draftLength || draft.length > MAX_LENGTH}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="content">{idea.content}</p>
      )}

      {!editing && (
        <div className="actions">
          <button
            className={`like ${liked ? 'liked' : ''}`}
            onClick={onToggleLike}
            aria-pressed={liked}
            title={liked ? 'Quitar me encanta' : 'Me encanta'}
          >
            <span aria-hidden>{liked ? '❤️' : '🤍'}</span> Me encanta
            {likes > 0 && <span className="like-count">{likes}</span>}
          </button>
          {isMine && (
            <>
              <button onClick={() => { setDraft(idea.content); setEditing(true) }} disabled={busy}>Editar</button>
              <button className="danger" onClick={remove} disabled={busy}>Borrar</button>
            </>
          )}
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </article>
  )
}

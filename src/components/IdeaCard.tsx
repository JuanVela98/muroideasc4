import { useRef, useState, type PointerEvent } from 'react'
import { MAX_LENGTH, NOTE_COLORS, type Idea, type NoteColor } from '../lib/supabase'
import type { Reaction } from '../hooks/useLikes'

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
  z: number
  countFor: (reaction: Reaction) => number
  reactedByMe: (reaction: Reaction) => boolean
  onToggle: (reaction: Reaction) => void
  onUpdate: (id: number, content: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onColor: (id: number, color: NoteColor) => void
  onDragStart: (id: number) => void
  onDrag: (id: number, x: number, y: number) => void
  onDragEnd: (id: number, x: number, y: number) => void
}

const REACTIONS: { key: Reaction; emoji: string; label: string }[] = [
  { key: 'love', emoji: '❤️', label: 'Me encanta' },
  { key: 'like', emoji: '👍', label: 'Like' },
]

export function IdeaCard(props: Props) {
  const { idea, isMine, z, countFor, reactedByMe, onToggle, onUpdate, onDelete, onColor, onDragStart, onDrag, onDragEnd } = props
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(idea.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grabbed, setGrabbed] = useState(false)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; x: number; y: number } | null>(null)

  const edited = new Date(idea.updated_at).getTime() - new Date(idea.created_at).getTime() > 1000
  const draftLength = draft.trim().length

  // Arrastrar desde cualquier parte de la nota, menos botones y cajas de texto.
  function down(e: PointerEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest('button, textarea, input')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, ox: idea.x, oy: idea.y, x: idea.x, y: idea.y }
    setGrabbed(true)
    onDragStart(idea.id)
  }
  function move(e: PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d) return
    d.x = d.ox + (e.clientX - d.sx)
    d.y = d.oy + (e.clientY - d.sy)
    onDrag(idea.id, d.x, d.y)
  }
  function up() {
    const d = drag.current
    if (!d) return
    drag.current = null
    setGrabbed(false)
    onDragEnd(idea.id, d.x, d.y)
  }

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
    <article
      className={`note ${grabbed ? 'grabbed' : ''}`}
      data-color={idea.color}
      style={{ transform: `translate(${idea.x}px, ${idea.y}px)`, zIndex: z }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <header>
        <strong>{idea.author_name}</strong>
        {isMine && <span className="tag">Tú</span>}
        <time dateTime={idea.created_at} title={new Date(idea.created_at).toLocaleString('es')}>
          {timeAgo(idea.created_at)}
          {edited && ' · editada'}
        </time>
      </header>

      {editing ? (
        <div className="edit">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} autoFocus aria-label="Editar idea" />
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
        <footer>
          <div className="reactions">
            {REACTIONS.map(({ key, emoji, label }) => {
              const active = reactedByMe(key)
              const count = countFor(key)
              return (
                <button
                  key={key}
                  className={`reaction ${active ? 'active' : ''}`}
                  onClick={() => onToggle(key)}
                  aria-pressed={active}
                  aria-label={`${label}${count ? ` (${count})` : ''}`}
                  title={active ? `Quitar ${label.toLowerCase()}` : label}
                >
                  <span aria-hidden>{emoji}</span>
                  {count > 0 && <span className="reaction-count">{count}</span>}
                </button>
              )
            })}
          </div>
          <div className="swatches" role="group" aria-label="Color de la nota">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${c === idea.color ? 'on' : ''}`}
                data-color={c}
                title={c}
                aria-label={`Color ${c}`}
                aria-pressed={c === idea.color}
                onClick={() => onColor(idea.id, c)}
              />
            ))}
          </div>
          {isMine && (
            <div className="actions owner">
              <button onClick={() => { setDraft(idea.content); setEditing(true) }} disabled={busy}>Editar</button>
              <button className="danger" onClick={remove} disabled={busy}>Borrar</button>
            </div>
          )}
        </footer>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </article>
  )
}

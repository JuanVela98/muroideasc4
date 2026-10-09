import { useState, type FormEvent } from 'react'
import { MAX_LENGTH, NOTE_COLORS, type NoteColor } from '../lib/supabase'

// Barra flotante para escribir una idea nueva y elegir su color.
export function Composer({ onSubmit }: { onSubmit: (content: string, color: NoteColor) => Promise<void> }) {
  const [text, setText] = useState('')
  const [color, setColor] = useState<NoteColor>('amarillo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const length = text.trim().length
  const tooLong = text.length > MAX_LENGTH

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!length || tooLong) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(text.trim(), color)
      setText('')
    } catch {
      setError('No se pudo publicar. Revisa tu conexión e intenta otra vez.')
    }
    setBusy(false)
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
        }}
        placeholder="¿Qué idea tienes hoy?"
        rows={2}
        aria-label="Escribe tu idea"
      />
      <div className="form-row">
        <div className="swatches" role="group" aria-label="Color de tu nota">
          {NOTE_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${c === color ? 'on' : ''}`}
              data-color={c}
              title={c}
              aria-label={`Color ${c}`}
              aria-pressed={c === color}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <span className={`counter ${tooLong ? 'over' : text.length > MAX_LENGTH - 20 ? 'near' : ''}`}>
          {text.length}/{MAX_LENGTH}
        </span>
        <button type="submit" className="primary" disabled={busy || !length || tooLong}>
          {busy ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  )
}

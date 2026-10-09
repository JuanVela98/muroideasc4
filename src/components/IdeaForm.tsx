import { useState, type FormEvent } from 'react'
import { MAX_LENGTH } from '../lib/supabase'

export function IdeaForm({ onSubmit }: { onSubmit: (content: string) => Promise<void> }) {
  const [text, setText] = useState('')
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
      await onSubmit(text.trim())
      setText('')
    } catch {
      setError('No se pudo publicar. Revisa tu conexión e intenta otra vez.')
    }
    setBusy(false)
  }

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
        }}
        placeholder="¿Qué idea tienes hoy?"
        rows={3}
        aria-label="Escribe tu idea"
      />
      <div className="form-row">
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

import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

// Traduce los errores más comunes de Supabase a palabras simples.
function friendlyError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered')) return 'Ese correo ya tiene cuenta. Prueba entrar.'
  if (m.includes('email not confirmed')) return 'Primero confirma tu correo (revisa tu bandeja).'
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento y vuelve a probar.'
  if (m.includes('invalid') && m.includes('email')) return 'Ese correo no parece válido.'
  return message
}

export function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    setNotice(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim() } },
      })
      if (error) setError(friendlyError(error.message))
      else if (!data.session) setNotice('¡Cuenta creada! Te enviamos un correo para confirmarla. Después entra aquí.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(friendlyError(error.message))
    }
    setBusy(false)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-icon" aria-hidden>💡</span>
          <h1>Muro de Ideas</h1>
        </div>
        <p className="muted">Comparte ideas cortas y mira las de todos, en vivo.</p>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            Entrar
          </button>
          <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Tu nombre (se verá junto a tus ideas)
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} placeholder="Ej: Ana" autoComplete="nickname" />
            </label>
          )}
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com" autoComplete="email" />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <p className="error" role="alert">{error}</p>}
          {notice && <p className="notice" role="status">{notice}</p>}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </main>
  )
}

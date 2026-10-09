import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { Wall } from './components/Wall'

function MissingKeys() {
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-icon" aria-hidden>🔑</span>
          <h1>Faltan las llaves de Supabase</h1>
        </div>
        <p className="muted">
          Crea un archivo <code>.env</code> (copia <code>.env.example</code>) con
          <code> VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y vuelve a
          iniciar la app.
        </p>
      </div>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <MissingKeys />
  if (!ready) return <p className="muted center">Cargando…</p>
  return session ? <Wall key={session.user.id} session={session} /> : <Auth />
}

import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useIdeas } from '../hooks/useIdeas'
import { useOnlineCount } from '../hooks/useOnlineCount'
import { useLikes } from '../hooks/useLikes'
import { IdeaForm } from './IdeaForm'
import { IdeaCard } from './IdeaCard'

export function Wall({ session }: { session: Session }) {
  const user = session.user
  const name = (user.user_metadata?.display_name as string | undefined)?.trim() || user.email?.split('@')[0] || 'Anónimo'
  const online = useOnlineCount(user.id, name)
  const { ideas, loading, error, addIdea, updateIdea, deleteIdea } = useIdeas()
  const { countFor, likedByMe, toggleLike } = useLikes(user.id)

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

      <main className="wall">
        <IdeaForm onSubmit={addIdea} />

        {error && <p className="error" role="alert">No se pudieron cargar las ideas: {error}</p>}
        {loading ? (
          <p className="muted center">Cargando ideas…</p>
        ) : ideas.length === 0 ? (
          <p className="muted center empty">Todavía no hay ideas. ¡Sé la primera persona en publicar una!</p>
        ) : (
          <section className="ideas" aria-label="Ideas">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                isMine={idea.user_id === user.id}
                likes={countFor(idea.id)}
                liked={likedByMe(idea.id)}
                onToggleLike={() => toggleLike(idea.id)}
                onUpdate={updateIdea}
                onDelete={deleteIdea}
              />
            ))}
          </section>
        )}
      </main>
    </>
  )
}

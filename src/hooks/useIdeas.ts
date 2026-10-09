import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, type Idea, type NoteColor } from '../lib/supabase'

function sortNewestFirst(list: Idea[]) {
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// Carga las ideas y se queda escuchando cambios en vivo (crear, editar, mover, pintar, borrar).
export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Ideas que yo estoy arrastrando ahora: ignoro la posición que llega del servidor.
  const dragging = useRef(new Set<number>())

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const channel = client
      .channel('ideas-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const idea = payload.new as Idea
          setIdeas((prev) =>
            prev.some((i) => i.id === idea.id) ? prev : sortNewestFirst([idea, ...prev]),
          )
        } else if (payload.eventType === 'UPDATE') {
          const idea = payload.new as Idea
          setIdeas((prev) =>
            prev.map((i) =>
              i.id !== idea.id ? i : dragging.current.has(i.id) ? { ...idea, x: i.x, y: i.y } : idea,
            ),
          )
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as Partial<Idea>).id
          setIdeas((prev) => prev.filter((i) => i.id !== id))
        }
      })
      .subscribe()

    client
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else
          setIdeas((prev) => {
            // Mezcla por si llegó algo en vivo mientras cargaba.
            const byId = new Map<number, Idea>()
            for (const i of data ?? []) byId.set(i.id, i)
            for (const i of prev) byId.set(i.id, i)
            return sortNewestFirst([...byId.values()])
          })
        setLoading(false)
      })

    return () => {
      client.removeChannel(channel)
    }
  }, [])

  // Cambio solo local (mientras se arrastra, o cuando llega un movimiento en vivo de otra persona).
  const moveLocal = useCallback((id: number, x: number, y: number) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, x, y } : i)))
  }, [])

  async function addIdea(content: string, color: NoteColor, x: number, y: number) {
    const { data, error } = await supabase!
      .from('ideas')
      .insert({ content, color, x, y })
      .select()
      .single()
    if (error) throw error
    setIdeas((prev) => (prev.some((i) => i.id === data.id) ? prev : sortNewestFirst([data, ...prev])))
  }

  async function updateIdea(id: number, content: string) {
    const { data, error } = await supabase!.from('ideas').update({ content }).eq('id', id).select().single()
    if (error) throw error
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...data, x: i.x, y: i.y } : i)))
  }

  async function saveMove(id: number, x: number, y: number) {
    const { error } = await supabase!.from('ideas').update({ x, y }).eq('id', id)
    if (error) setError(error.message)
  }

  async function setColor(id: number, color: NoteColor) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, color } : i)))
    const { error } = await supabase!.from('ideas').update({ color }).eq('id', id)
    if (error) setError(error.message)
  }

  async function deleteIdea(id: number) {
    const { error } = await supabase!.from('ideas').delete().eq('id', id)
    if (error) throw error
    setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  return { ideas, loading, error, dragging, moveLocal, addIdea, updateIdea, saveMove, setColor, deleteIdea }
}

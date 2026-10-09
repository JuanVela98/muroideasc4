import { useEffect, useState } from 'react'
import { supabase, type Idea } from '../lib/supabase'

function sortNewestFirst(list: Idea[]) {
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// Carga las ideas y se queda escuchando cambios en vivo (crear, editar, borrar).
export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          setIdeas((prev) => prev.map((i) => (i.id === idea.id ? idea : i)))
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
      .limit(200)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setIdeas((prev) => {
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

  // Actualizamos la lista local al instante; el evento en vivo confirma lo mismo.
  async function addIdea(content: string) {
    const { data, error } = await supabase!.from('ideas').insert({ content }).select().single()
    if (error) throw error
    setIdeas((prev) => (prev.some((i) => i.id === data.id) ? prev : sortNewestFirst([data, ...prev])))
  }

  async function updateIdea(id: number, content: string) {
    const { data, error } = await supabase!.from('ideas').update({ content }).eq('id', id).select().single()
    if (error) throw error
    setIdeas((prev) => prev.map((i) => (i.id === id ? data : i)))
  }

  async function deleteIdea(id: number) {
    const { error } = await supabase!.from('ideas').delete().eq('id', id)
    if (error) throw error
    setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  return { ideas, loading, error, addIdea, updateIdea, deleteIdea }
}

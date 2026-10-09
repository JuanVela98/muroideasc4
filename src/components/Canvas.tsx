import { useRef, useState, type PointerEvent } from 'react'
import type { Idea, NoteColor } from '../lib/supabase'
import type { Cursor } from '../hooks/useLiveCanvas'
import type { useLikes } from '../hooks/useLikes'
import { IdeaCard } from './IdeaCard'

export type Pan = { x: number; y: number }

type Props = {
  ideas: Idea[]
  userId: string
  pan: Pan
  setPan: (updater: (p: Pan) => Pan) => void
  cursors: Record<string, Cursor>
  sendCursor: (x: number, y: number) => void
  sendMove: (id: number, x: number, y: number) => void
  moveLocal: (id: number, x: number, y: number) => void
  dragging: React.MutableRefObject<Set<number>>
  saveMove: (id: number, x: number, y: number) => Promise<void>
  setColor: (id: number, color: NoteColor) => void
  updateIdea: (id: number, content: string) => Promise<void>
  deleteIdea: (id: number) => Promise<void>
  likes: ReturnType<typeof useLikes>
}

export function Canvas(p: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const panning = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const zCounter = useRef(1)
  const [zMap, setZMap] = useState<Record<number, number>>({})

  // Posición del mouse en coordenadas del canvas (no de la pantalla).
  function toWorld(e: PointerEvent) {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left - p.pan.x, y: e.clientY - r.top - p.pan.y }
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return // solo el fondo mueve el canvas
    e.currentTarget.setPointerCapture(e.pointerId)
    panning.current = { sx: e.clientX, sy: e.clientY, ox: p.pan.x, oy: p.pan.y }
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const w = toWorld(e)
    p.sendCursor(w.x, w.y)
    const s = panning.current
    if (s) p.setPan(() => ({ x: s.ox + e.clientX - s.sx, y: s.oy + e.clientY - s.sy }))
  }
  function up() {
    panning.current = null
  }

  return (
    <div
      ref={ref}
      className={`canvas ${panning.current ? 'panning' : ''}`}
      style={{ backgroundPosition: `${p.pan.x}px ${p.pan.y}px` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onWheel={(e) => p.setPan((o) => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }))}
    >
      <div className="world" style={{ transform: `translate(${p.pan.x}px, ${p.pan.y}px)` }}>
        {p.ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            isMine={idea.user_id === p.userId}
            z={zMap[idea.id] ?? 0}
            countFor={(r) => p.likes.countFor(idea.id, r)}
            reactedByMe={(r) => p.likes.reactedByMe(idea.id, r)}
            onToggle={(r) => p.likes.toggle(idea.id, r)}
            onUpdate={p.updateIdea}
            onDelete={p.deleteIdea}
            onColor={p.setColor}
            onDragStart={(id) => {
              p.dragging.current.add(id)
              zCounter.current += 1
              setZMap((m) => ({ ...m, [id]: zCounter.current }))
            }}
            onDrag={(id, x, y) => {
              p.moveLocal(id, x, y)
              p.sendMove(id, x, y)
            }}
            onDragEnd={(id, x, y) => {
              p.sendMove(id, x, y)
              p.saveMove(id, x, y).finally(() => p.dragging.current.delete(id))
            }}
          />
        ))}

        {Object.values(p.cursors).map((c) => (
          <div key={c.id} className="cursor" style={{ transform: `translate(${c.x}px, ${c.y}px)` }}>
            <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
              <path d="M1 1l15 9-6.5 1.5L7 18z" fill={c.color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span style={{ background: c.color }}>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

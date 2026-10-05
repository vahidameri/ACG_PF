import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, ListChecks, BellRing, ShieldAlert, User, CornerDownLeft } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from './Editor'
import { cx } from './ui'

interface Item {
  key: string
  label: string
  sub: string
  icon: typeof Briefcase
  run: () => void
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db } = useStore()
  const editor = useEditor()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const pname = (id: string) => db.Projects.find((p) => p.id === id)?.name || ''
    const all: Item[] = [
      ...db.Projects.map((p) => ({ key: p.id, label: p.name, sub: `پروژه · ${p.code}`, icon: Briefcase, run: () => navigate(`/projects/${p.id}`) })),
      ...db.Tasks.map((t) => ({ key: t.id, label: t.title, sub: `تسک · ${pname(t.project_id)} · ${t.assignee}`, icon: ListChecks, run: () => editor.open('Tasks', t as never) })),
      ...db.FollowUps.map((f) => ({ key: f.id, label: f.subject, sub: `فالوآپ · ${f.person}`, icon: BellRing, run: () => editor.open('FollowUps', f as never) })),
      ...db.Risks.map((r) => ({ key: r.id, label: r.title, sub: `ریسک · ${pname(r.project_id)}`, icon: ShieldAlert, run: () => editor.open('Risks', r as never) })),
      ...db.Team.map((m) => ({ key: m.id, label: m.name, sub: `عضو تیم · ${m.role}`, icon: User, run: () => navigate(`/tasks?assignee=${encodeURIComponent(m.name)}`) })),
    ]
    const s = q.trim()
    if (!s) return all.slice(0, 12)
    return all.filter((i) => i.label.includes(s) || i.sub.includes(s)).slice(0, 30)
  }, [db, q, navigate, editor])

  if (!open) return null

  const run = (i: Item) => {
    onClose()
    i.run()
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center pt-[12vh] px-4 no-print">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop fade-in">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setIdx(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowDown') setIdx((i) => Math.min(items.length - 1, i + 1))
            if (e.key === 'ArrowUp') setIdx((i) => Math.max(0, i - 1))
            if (e.key === 'Enter' && items[idx]) run(items[idx])
          }}
          placeholder="جستجو…"
          className="w-full border-b border-line bg-transparent px-5 h-14 text-base outline-none"
        />
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <div className="py-8 text-center text-sm text-sub">نتیجه‌ای پیدا نشد</div>}
          {items.map((i, n) => (
            <button
              key={i.key}
              onMouseEnter={() => setIdx(n)}
              onClick={() => run(i)}
              className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right', n === idx && 'bg-muted')}
            >
              <i.icon size={17} className="text-sub shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{i.label}</div>
                <div className="truncate text-xs text-sub">{i.sub}</div>
              </div>
              {n === idx && <CornerDownLeft size={14} className="text-sub" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

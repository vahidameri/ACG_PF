// Product vs Tech tracks: every task belongs to a track (explicit, or inferred from the
// assignee's team) and can depend on tasks in the other track (handoffs).
import type { DB, Task, Track } from './types'
import type { T2 } from './i18n'
import { isTaskOverdue } from './metrics'
import { addDays, todayISO } from './jalali'

export const TRACKS: Track[] = ['product', 'tech']
export const TRACK: Record<Track, T2> = { product: ['پروداکت', 'Product'], tech: ['تک', 'Tech'] }
export const TRACK_COLOR: Record<Track, string> = { product: '#6A0421', tech: '#1D4F61' }
export const trackDot: Record<Track, string> = { product: 'bg-[#8a1c3c] dark:bg-[#ec7892]', tech: 'bg-[#1D4F61] dark:bg-[#C1D6DE]' }
export const trackSoft: Record<Track, string> = {
  product: 'bg-[#6A0421]/[0.08] text-[#8a1c3c] dark:text-[#ec7892]',
  tech: 'bg-[#1D4F61]/[0.10] text-[#1D4F61] dark:text-[#C1D6DE]',
}

export function memberTrack(db: DB, name: string): Track | '' {
  return db.Team.find((m) => m.name === name)?.track || ''
}

export function trackOf(t: Task, db: DB): Track | '' {
  return (t.track as Track) || memberTrack(db, t.assignee)
}

export const depIds = (t: Task) => String(t.depends_on || '').split(',').map((x) => x.trim()).filter(Boolean)
export const depsOf = (t: Task, db: DB) => depIds(t).map((id) => db.Tasks.find((x) => x.id === id)).filter(Boolean) as Task[]
export const dependentsOf = (t: Task, db: DB) => db.Tasks.filter((x) => depIds(x).includes(t.id))
/** Open dependencies — the task is waiting on someone else. */
export const waitingOn = (t: Task, db: DB) => (t.status === 'done' ? [] : depsOf(t, db).filter((d) => d.status !== 'done'))

export interface TrackStats {
  total: number
  open: number
  done: number
  overdue: number
  blocked: number
  waiting: number // waiting on the other track
  doneWeek: number
  points: number
  donePoints: number
  pct: number
}

export function trackStats(db: DB, track: Track, projectId?: string): TrackStats {
  const since = addDays(todayISO(), -7)
  const ts = db.Tasks.filter((t) => trackOf(t, db) === track && (!projectId || t.project_id === projectId))
  const done = ts.filter((t) => t.status === 'done')
  const points = ts.reduce((a, t) => a + (Number(t.points) || 0), 0)
  const donePoints = done.reduce((a, t) => a + (Number(t.points) || 0), 0)
  return {
    total: ts.length,
    open: ts.length - done.length,
    done: done.length,
    overdue: ts.filter(isTaskOverdue).length,
    blocked: ts.filter((t) => t.status === 'blocked').length,
    waiting: ts.filter((t) => waitingOn(t, db).some((d) => trackOf(d, db) !== track)).length,
    doneWeek: done.filter((t) => t.completed_at && t.completed_at.slice(0, 10) >= since).length,
    points,
    donePoints,
    pct: ts.length ? Math.round((done.length / ts.length) * 100) : 0,
  }
}

/** Cross-track handoffs: a task waiting on a task owned by the other track. */
export function handoffs(db: DB, projectId?: string) {
  const out: { from: Task; to: Task; ready: boolean }[] = []
  db.Tasks.filter((t) => !projectId || t.project_id === projectId).forEach((t) => {
    depsOf(t, db).forEach((d) => {
      const a = trackOf(d, db)
      const b = trackOf(t, db)
      if (a && b && a !== b) out.push({ from: d, to: t, ready: d.status === 'done' })
    })
  })
  return out
}

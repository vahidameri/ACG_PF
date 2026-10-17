// Hand-offs between sides. A pass is sent (from side/person → to side/person), then accepted or returned.
// A returned pass is sent again as the next round, so every back-and-forth is counted and visible.
import type { Access, DB, Handoff, Task } from './types'
import { daysBetween, todayISO } from './jalali'
import { memberTrack, trackOf } from './tracks'

export const isOpen = (h: Handoff) => h.status === 'sent'
export const forTask = (db: DB, taskId: string) => db.Handoffs.filter((h) => h.task_id === taskId).sort((a, b) => (a.sent_at < b.sent_at ? -1 : 1))

/** The next round number for this task between these two sides (either direction). */
export function nextRound(db: DB, taskId: string, a: string, b: string) {
  const pair = db.Handoffs.filter((h) => h.task_id === taskId && ((h.from_side === a && h.to_side === b) || (h.from_side === b && h.to_side === a)))
  return pair.reduce((m, h) => Math.max(m, Number(h.round) || 1), 0) + 1
}

/** May this person answer the pass? The named receiver, anyone on the receiving side when no one is named, or leadership. */
export function canRespond(h: Handoff, db: DB, me: string, access: Access) {
  if (!isOpen(h)) return false
  if (access === 'super' || access === 'exec' || access === 'head') return true
  if (h.to_person) return h.to_person === me
  return !!me && memberTrack(db, me) === h.to_side
}

/** Days the pass has waited (open) or took (answered). */
export const ageDays = (h: Handoff, today = todayISO()) => Math.max(0, daysBetween(h.sent_at.slice(0, 10), (h.responded_at || today).slice(0, 10)))

export const sentToMe = (h: Handoff, db: DB, me: string) => isOpen(h) && (h.to_person ? h.to_person === me : !!me && memberTrack(db, me) === h.to_side && h.from_person !== me)
export const returnedToMe = (h: Handoff, me: string) => h.status === 'returned' && h.from_person === me

/** Has a returned pass been sent again since? (then it is history, not waiting) */
export const resent = (h: Handoff, db: DB) => db.Handoffs.some((x) => x.task_id === h.task_id && x.id !== h.id && x.sent_at > h.sent_at)

export interface PairStat {
  from: string
  to: string
  open: number
  returned: number
  accepted: number
  total: number
  avgDays: number
  returnRate: number
}
export function pairStats(db: DB, projectId?: string): PairStat[] {
  const m = new Map<string, PairStat>()
  db.Handoffs.filter((h) => !projectId || h.project_id === projectId).forEach((h) => {
    const k = `${h.from_side}>${h.to_side}`
    const s = m.get(k) || { from: h.from_side, to: h.to_side, open: 0, returned: 0, accepted: 0, total: 0, avgDays: 0, returnRate: 0 }
    s.total++
    if (h.status === 'sent') s.open++
    if (h.status === 'returned') s.returned++
    if (h.status === 'accepted') s.accepted++
    s.avgDays += h.status === 'sent' ? 0 : ageDays(h)
    m.set(k, s)
  })
  return [...m.values()].map((s) => ({ ...s, avgDays: s.accepted + s.returned ? Math.round((s.avgDays / (s.accepted + s.returned)) * 10) / 10 : 0, returnRate: s.accepted + s.returned ? Math.round((s.returned / (s.accepted + s.returned)) * 100) : 0 }))
}

/** The side a task starts from when it is handed over. */
export const sideOfTask = (t: Task, db: DB) => trackOf(t, db)

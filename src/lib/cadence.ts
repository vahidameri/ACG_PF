// Weekly delivery day: each project hands something over on one day of the week (Projects.delivery_day,
// Saturday = 0 … Friday = 6). The lead records it with "Delivered" (Projects.last_delivery); the Radar,
// the inbox and the morning emails watch it.
import type { Project } from './types'
import { addDays, todayISO } from './jalali'
import { weekCfg, weekStart } from './weeks'
import type { T2 } from './i18n'

export const DAYS: T2[] = [['شنبه', 'Saturday'], ['یکشنبه', 'Sunday'], ['دوشنبه', 'Monday'], ['سه‌شنبه', 'Tuesday'], ['چهارشنبه', 'Wednesday'], ['پنجشنبه', 'Thursday'], ['جمعه', 'Friday']]
export const DAY_OPTIONS: Record<string, T2> = { '': ['— ندارد —', '— None —'], ...Object.fromEntries(DAYS.map((d, i) => [String(i), d])) }

export type DeliveryState = 'done' | 'today' | 'upcoming' | 'missed'
const running = (p: Project) => p.status === 'active' || p.status === 'planning'
export const hasDeliveryDay = (p: Project) => running(p) && p.delivery_day !== undefined && p.delivery_day !== '' && Number(p.delivery_day) >= 0 && Number(p.delivery_day) <= 6

/** This week's delivery date for the project ('' when it has no delivery day). */
export function deliveryDate(p: Project, today = todayISO()) {
  if (!hasDeliveryDay(p)) return ''
  const ws = weekStart(today)
  return addDays(ws, (Number(p.delivery_day) - weekCfg().start + 7) % 7)
}

export function deliveryState(p: Project, today = todayISO()): DeliveryState | '' {
  const d = deliveryDate(p, today)
  if (!d) return ''
  if (p.last_delivery && p.last_delivery >= weekStart(today)) return 'done'
  return d === today ? 'today' : d > today ? 'upcoming' : 'missed'
}

export const DELIVERY_STATE: Record<DeliveryState, T2> = {
  done: ['تحویل شد', 'Delivered'],
  today: ['امروز تحویل', 'Due today'],
  upcoming: ['در راه', 'Coming up'],
  missed: ['تحویل نشد', 'Missed'],
}

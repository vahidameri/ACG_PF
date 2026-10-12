// Working weeks, Iranian style: the week starts on Saturday and Saturday–Wednesday are workdays.
import { addDays, daysBetween, fa, fmtDayMonth, parseISO, todayISO, weekdayIndex } from './jalali'
import { L } from './i18n'

export const WORKDAYS = 5

/** Saturday of the week that contains iso. */
export function weekStart(iso: string = todayISO()) {
  const d = parseISO(iso)
  return d ? addDays(iso, -weekdayIndex(d)) : iso
}
export const weekEnd = (ws: string) => addDays(ws, 6)
export const inWeek = (iso: string, ws: string) => !!iso && iso >= ws && iso <= weekEnd(ws)
export const weeksFrom = (ws: string, n: number) => Array.from({ length: n }, (_, i) => addDays(ws, i * 7))

/** Workdays (Sat–Wed) between two dates inclusive that fall inside the week starting ws. */
export function workdaysInWeek(ws: string, from: string, to: string) {
  let n = 0
  for (let i = 0; i < WORKDAYS; i++) {
    const day = addDays(ws, i)
    if (day >= from && day <= to) n++
  }
  return n
}

export function weekLabel(ws: string) {
  return `${fmtDayMonth(ws)} – ${fmtDayMonth(addDays(ws, 6))}`
}

/** "This week", "Next week", "2 weeks ago"… relative to the current week. */
export function weekRel(ws: string) {
  const n = Math.round(daysBetween(weekStart(), ws) / 7)
  if (n === 0) return L('این هفته', 'This week')
  if (n === 1) return L('هفته‌ی بعد', 'Next week')
  if (n === -1) return L('هفته‌ی قبل', 'Last week')
  return n > 0 ? L(`${fa(n)} هفته بعد`, `In ${n} weeks`) : L(`${fa(-n)} هفته پیش`, `${-n} weeks ago`)
}

/** Weekly update cycle: reports are due by end of Sunday, the portfolio weekly is on Monday. */
export const UPDATE_DUE_OFFSET = 1
export const updateDue = (ws: string) => addDays(ws, UPDATE_DUE_OFFSET)

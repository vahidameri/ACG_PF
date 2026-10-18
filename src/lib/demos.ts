// Sprint ceremonies (planning, demo & review, retro): what each one will show and how ready it is.
import type { DB, Deliverable, Meeting, Task } from './types'
import { AGILE_SERIES } from './labels'

export type DemoItem = { ref: string; kind: 'T'; row: Task } | { ref: string; kind: 'D'; row: Deliverable }

export const isCeremony = (m: Meeting) => AGILE_SERIES.includes(m.series)

export const refsOf = (m: Meeting) => String(m.items || '').split(',').map((x) => x.trim()).filter(Boolean)

export function itemsOf(m: Meeting, db: DB): DemoItem[] {
  return refsOf(m).flatMap((ref): DemoItem[] => {
    const id = ref.slice(2)
    if (ref.startsWith('D:')) {
      const row = db.Deliverables.find((d) => d.id === id)
      return row ? [{ ref, kind: 'D', row }] : []
    }
    const row = db.Tasks.find((t) => t.id === id)
    return row ? [{ ref, kind: 'T', row }] : []
  })
}

/** Ready to show: a task that is done or in review, an output that is delivered. */
export const isReady = (i: DemoItem) => (i.kind === 'D' ? i.row.status === 'delivered' : i.row.status === 'done' || i.row.status === 'review')

export function readiness(m: Meeting, db: DB) {
  const items = itemsOf(m, db)
  const ready = items.filter(isReady).length
  const prep = String(m.checklist || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const prepDone = prep.filter((l) => /^\[x\]/i.test(l)).length
  return { items, ready, total: items.length, pct: items.length ? Math.round((ready / items.length) * 100) : 0, prep: prep.length, prepDone }
}

/** A sensible starting checklist for each ceremony; editable per meeting. */
export const PREP: Record<string, [string, string][]> = {
  demo: [
    ['محیط استیج به‌روز و در دسترس است', 'Stage is up to date and reachable'],
    ['داده‌ی نمونه برای نمایش آماده است', 'Sample data for the demo is ready'],
    ['ترتیب ارائه و ارائه‌دهنده‌ی هر بخش مشخص است', 'Running order and presenters are set'],
    ['دعوت‌نامه و لینک Meet برای ذی‌نفعان فرستاده شد', 'Stakeholders have the invite and Meet link'],
  ],
  planning: [
    ['بک‌لاگ اولویت‌بندی و برآورد شده است', 'Backlog is prioritised and estimated'],
    ['ظرفیت تیم در این اسپرینت مشخص است', 'Team capacity for the sprint is known'],
    ['هدف اسپرینت پیش‌نویس شده است', 'Sprint goal is drafted'],
  ],
  retro: [
    ['نتیجه‌ی اکشن‌های رتروی قبل بررسی شد', 'Last retro’s actions reviewed'],
    ['داده‌ی اسپرینت (سرعت، تأخیرها، تحویل‌ها) آماده است', 'Sprint data (velocity, slips, deliveries) is ready'],
  ],
}

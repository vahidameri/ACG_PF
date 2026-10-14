// Free-text content (task titles, notes…) typed in Persian is shown in English in the English UI.
// Translations come from Google (LanguageApp, on the Apps Script server) and are cached in this
// browser. Only the display changes: the Sheet keeps the original text.
import type { DB, SheetName } from './types'

export const TEXT_FIELDS: Partial<Record<SheetName, string[]>> = {
  Tasks: ['title', 'description', 'tags'],
  FollowUps: ['subject', 'notes'],
  Projects: ['description', 'objective', 'category', 'pause_reason'],
  Milestones: ['title'],
  Deliverables: ['title', 'notes'],
  Risks: ['title', 'mitigation'],
  Meetings: ['title', 'notes', 'decisions'],
  Updates: ['summary', 'done', 'next', 'blockers'],
  Scope: ['item', 'change_note'],
  Sprints: ['name', 'goal'],
  Comments: ['body'],
  Contracts: ['title', 'notes'],
}

const PERSIAN = /[؀-ۿ]/
const KEY = 'acg.tr.en'
export type TrMap = Record<string, string>

export function loadTr(): TrMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}
export function saveTr(m: TrMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {}
}

/** Persian texts in the data that have no translation yet. */
export function pendingTexts(db: DB, m: TrMap, skip: Set<string>): string[] {
  const out = new Set<string>()
  for (const [s, fields] of Object.entries(TEXT_FIELDS) as [SheetName, string[]][])
    for (const r of db[s] as unknown as Record<string, unknown>[])
      for (const f of fields) {
        const v = r[f]
        if (typeof v === 'string' && v && PERSIAN.test(v) && !(v in m) && !skip.has(v) && v.length <= 4000) out.add(v)
      }
  return [...out]
}

export function translateDB(db: DB, m: TrMap): DB {
  if (!Object.keys(m).length) return db
  const out = { ...db } as unknown as Record<string, Record<string, unknown>[]>
  for (const [s, fields] of Object.entries(TEXT_FIELDS) as [SheetName, string[]][])
    out[s] = (db[s] as unknown as Record<string, unknown>[]).map((r) => {
      let c: Record<string, unknown> | null = null
      for (const f of fields) {
        const v = r[f]
        if (typeof v === 'string' && m[v]) (c ??= { ...r })[f] = m[v]
      }
      return c || r
    })
  return out as unknown as DB
}

/** On save: a field still showing our translation goes back to the original text. */
export function untranslateRow(sheet: SheetName, row: Record<string, unknown>, rev: Map<string, string>) {
  const fields = TEXT_FIELDS[sheet]
  if (!fields || !rev.size) return row
  const out = { ...row }
  for (const f of fields) {
    const v = out[f]
    if (typeof v === 'string' && rev.has(v)) out[f] = rev.get(v)
  }
  return out
}

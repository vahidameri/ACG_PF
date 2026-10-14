// Free-text content (task titles, notes…) is shown in the UI language: Persian text in the English
// UI is translated to English, and English text in the Persian UI to Persian. Translations come
// from Google (LanguageApp, on the Apps Script server) and are cached in this browser.
// Only the display changes: the Sheet keeps the original text.
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

export type Lang = 'fa' | 'en'
export type TrMap = Record<string, string>
const PERSIAN = /[؀-ۿ]/
const LATIN_WORD = /[A-Za-z]{3,}/
/** Text that needs translating into `to`: Persian for English, English for Persian (links left alone). */
const needs = (v: string, to: Lang) => (to === 'en' ? PERSIAN.test(v) : !PERSIAN.test(v) && LATIN_WORD.test(v) && !/^https?:\/\//.test(v.trim()))
const key = (to: Lang) => `acg.tr.${to}`

export function loadTr(to: Lang): TrMap {
  try {
    return JSON.parse(localStorage.getItem(key(to)) || '{}') || {}
  } catch {
    return {}
  }
}
export function saveTr(to: Lang, m: TrMap) {
  try {
    localStorage.setItem(key(to), JSON.stringify(m))
  } catch {}
}

/** Texts in the data that need a translation into `to` and don't have one yet. */
export function pendingTexts(db: DB, to: Lang, m: TrMap, skip: Set<string>): string[] {
  const out = new Set<string>()
  for (const [s, fields] of Object.entries(TEXT_FIELDS) as [SheetName, string[]][])
    for (const r of db[s] as unknown as Record<string, unknown>[])
      for (const f of fields) {
        const v = r[f]
        if (typeof v === 'string' && v && needs(v, to) && !(v in m) && !skip.has(v) && v.length <= 4000) out.add(v)
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

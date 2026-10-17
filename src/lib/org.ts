// The organisation, set by the program manager in the back office (Config tab, JSON lists):
//   org.titles — job titles (code, Persian, English)
//   org.teams  — teams a person can belong to
//   org.sides  — the working sides that hand work to each other (default: product, design, tech)
// The label maps used across the app are updated in place, so every page follows the settings.
import { JOB_TITLE, JOB_TITLE_OPTIONS, MEETING_SERIES, TEAM_NAMES } from './labels'
import { TRACK, TRACKS, SIDE_COLOR } from './tracks'
import type { T2 } from './i18n'

export interface OrgItem {
  id: string
  fa: string
  en: string
  color?: string
}
export type OrgKind = 'titles' | 'teams' | 'sides' | 'series'
export const ORG_KEYS: Record<OrgKind, string> = { titles: 'org.titles', teams: 'org.teams', sides: 'org.sides', series: 'org.series' }

const fromMap = (m: Record<string, T2>): OrgItem[] => Object.entries(m).map(([id, [fa, en]]) => ({ id, fa, en }))
export const ORG_DEFAULT: Record<OrgKind, OrgItem[]> = {
  titles: fromMap(JOB_TITLE),
  teams: fromMap(TEAM_NAMES),
  series: fromMap(MEETING_SERIES),
  sides: [
    { id: 'product', fa: 'پروداکت', en: 'Product', color: '#8a1c3c' },
    { id: 'design', fa: 'دیزاین', en: 'Design', color: '#7c3aed' },
    { id: 'tech', fa: 'تک', en: 'Tech', color: '#1d6f8a' },
  ],
}

let cur: Record<OrgKind, OrgItem[]> = { ...ORG_DEFAULT }
export const orgList = (k: OrgKind) => cur[k]

function parse(raw: string | undefined, def: OrgItem[]): OrgItem[] {
  try {
    const v = raw ? JSON.parse(raw) : null
    if (Array.isArray(v)) {
      const list = v
        .filter((x) => x && typeof x.id === 'string' && x.id.trim())
        .map((x) => ({ id: String(x.id).trim().toLowerCase(), fa: String(x.fa || x.en || x.id), en: String(x.en || x.fa || x.id), ...(x.color ? { color: String(x.color) } : {}) }))
      if (list.length) return list
    }
  } catch {}
  return def
}

const refill = (target: Record<string, T2>, items: OrgItem[]) => {
  for (const k of Object.keys(target)) delete target[k]
  for (const i of items) target[i.id] = [i.fa, i.en]
}

export function applyOrg(get: (k: string) => string | undefined) {
  cur = {
    titles: parse(get(ORG_KEYS.titles), ORG_DEFAULT.titles),
    teams: parse(get(ORG_KEYS.teams), ORG_DEFAULT.teams),
    sides: parse(get(ORG_KEYS.sides), ORG_DEFAULT.sides),
    series: parse(get(ORG_KEYS.series), ORG_DEFAULT.series),
  }
  refill(MEETING_SERIES as Record<string, T2>, cur.series)
  refill(JOB_TITLE, cur.titles)
  refill(JOB_TITLE_OPTIONS, cur.titles.map((t) => ({ ...t, fa: `${t.fa} · ${t.id.toUpperCase()}`, en: t.en.toUpperCase() === t.id.toUpperCase() ? t.en : `${t.en} · ${t.id.toUpperCase()}` })))
  refill(TEAM_NAMES, cur.teams)
  refill(TRACK as Record<string, T2>, cur.sides)
  TRACKS.splice(0, TRACKS.length, ...cur.sides.map((s) => s.id))
  for (const k of Object.keys(SIDE_COLOR)) delete SIDE_COLOR[k]
  const palette = ['#8a1c3c', '#7c3aed', '#1d6f8a', '#b45309', '#15803d', '#be185d']
  cur.sides.forEach((s, i) => (SIDE_COLOR[s.id] = s.color || palette[i % palette.length]))
}

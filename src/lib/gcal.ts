// Google Calendar (REST, with the signed-in user's token) + matching events to projects/people.
import type { DB, Meeting, MeetingSeries } from './types'
import { addDays } from './jalali'
import { weekStart } from './weeks'

export interface GEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD (local)
  time: string // HH:mm, '' for all-day
  duration: number // minutes
  meetUrl: string
  htmlLink: string
  attendees: string[] // emails
  organizer: string
  description: string
}

const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const pad = (n: number) => String(n).padStart(2, '0')

interface RawEvent {
  id: string
  summary?: string
  description?: string
  htmlLink?: string
  hangoutLink?: string
  status?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: { email?: string; self?: boolean; responseStatus?: string }[]
  organizer?: { email?: string }
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] }
}

function toEvent(e: RawEvent): GEvent | null {
  if (e.status === 'cancelled') return null
  const s = e.start?.dateTime ? new Date(e.start.dateTime) : null
  const en = e.end?.dateTime ? new Date(e.end.dateTime) : null
  const date = s ? `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}` : e.start?.date || ''
  return {
    id: e.id,
    title: e.summary || '(بدون عنوان)',
    date,
    time: s ? `${pad(s.getHours())}:${pad(s.getMinutes())}` : '',
    duration: s && en ? Math.round((en.getTime() - s.getTime()) / 60000) : 0,
    meetUrl: e.hangoutLink || e.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri || '',
    htmlLink: e.htmlLink || '',
    attendees: (e.attendees || []).map((a) => String(a.email || '').toLowerCase()).filter(Boolean),
    organizer: String(e.organizer?.email || '').toLowerCase(),
    description: e.description || '',
  }
}

export async function fetchEvents(token: string, from: string, to: string): Promise<GEvent[]> {
  const q = new URLSearchParams({ timeMin: new Date(from + 'T00:00:00').toISOString(), timeMax: new Date(to + 'T23:59:59').toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' })
  const r = await fetch(`${API}?${q}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`Calendar ${r.status}`)
  const j = (await r.json()) as { items?: RawEvent[] }
  return (j.items || []).map(toEvent).filter(Boolean) as GEvent[]
}

/** Create the calendar event for a meeting, with a Google Meet link, and invite attendees. */
export async function createEvent(token: string, m: Meeting, emails: string[], description: string) {
  const start = new Date(`${m.date}T${m.time || '10:00'}:00`)
  const end = new Date(start.getTime() + (Number(m.duration) || 45) * 60000)
  const body = {
    summary: m.title,
    description,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    attendees: emails.map((email) => ({ email })),
    conferenceData: m.meet_url ? undefined : { createRequest: { requestId: `acg-${m.id}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
  }
  const r = await fetch(`${API}?conferenceDataVersion=1&sendUpdates=all`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`Calendar ${r.status}`)
  return toEvent((await r.json()) as RawEvent)!
}

// ------------------------------------------------------------------ matching
export interface Relation {
  meeting?: Meeting
  projectId: string
  members: string[] // team member names among the attendees
  related: boolean
}

export function relate(e: GEvent, db: DB): Relation {
  const meeting = db.Meetings.find((m) => m.gcal_id && m.gcal_id === e.id)
  const t = e.title.toLowerCase()
  const project = db.Projects.find((p) => t.includes(p.name.toLowerCase()) || (p.code && new RegExp(`\\b${p.code.toLowerCase()}\\b`).test(t)))
  const members = db.Team.filter((m) => m.email && e.attendees.includes(m.email.toLowerCase())).map((m) => m.name)
  return { meeting, projectId: project?.id || '', members, related: !!meeting || !!project || members.length >= 2 }
}

export function seriesFor(e: GEvent, r: Relation): MeetingSeries {
  const t = e.title.toLowerCase()
  if (/weekly|ویکلی/.test(t) && /portfolio|پورتفولیو/.test(t)) return 'portfolio'
  if (/product|پروداکت/.test(t)) return 'product'
  if (/tech|تک/.test(t)) return 'tech'
  if (r.projectId) return 'project'
  if (r.members.length === 2 || /1:1|۱:۱|one.on.one/.test(t)) return 'one_on_one'
  return 'other'
}

// ------------------------------------------------------------------ demo calendar
export function demoEvents(db: DB, lang: 'fa' | 'en'): GEvent[] {
  const x = (fa: string, en: string) => (lang === 'en' ? en : fa)
  const ws = weekStart()
  const W = (w: number, d: number) => addDays(ws, w * 7 + d)
  const mail = (id: string) => db.Team.find((m) => m.id === id)?.email || ''
  const linked: GEvent[] = db.Meetings.filter((m) => m.gcal_id).map((m) => ({
    id: m.gcal_id, title: m.title, date: m.date, time: m.time, duration: Number(m.duration) || 45, meetUrl: m.meet_url, htmlLink: '#',
    attendees: m.attendees.split(',').map((n) => db.Team.find((t) => t.name === n.trim())?.email || '').filter(Boolean), organizer: mail('m1'), description: '',
  }))
  const extra: GEvent[] = [
    { id: 'gx1', title: x('بازبینی اسپرینت Kadiner', 'Kadiner sprint review'), date: W(0, 3), time: '13:00', duration: 60, meetUrl: 'https://meet.google.com/kdn-rev-01', htmlLink: '#', attendees: [mail('m8'), mail('m3'), mail('m1')], organizer: mail('m8'), description: '' },
    { id: 'gx2', title: x('جلسه‌ی ۱:۱ وحید و جلیل', '1:1 Vahid & Jalil'), date: W(0, 4), time: '16:00', duration: 30, meetUrl: '', htmlLink: '#', attendees: [mail('m1'), mail('m2')], organizer: mail('m2'), description: '' },
    { id: 'gx3', title: x('AISN — تماس با تأمین‌کننده‌ی داده', 'AISN — data vendor call'), date: W(1, 0), time: '11:00', duration: 45, meetUrl: 'https://meet.google.com/ais-dat-02', htmlLink: '#', attendees: [mail('m10'), mail('m1')], organizer: mail('m10'), description: '' },
    { id: 'gx4', title: x('ناهار', 'Lunch'), date: W(0, 2), time: '13:30', duration: 60, meetUrl: '', htmlLink: '#', attendees: [], organizer: mail('m1'), description: '' },
    { id: 'gx5', title: x('وقت تمرکز', 'Focus time'), date: W(0, 1), time: '08:30', duration: 90, meetUrl: '', htmlLink: '#', attendees: [], organizer: mail('m1'), description: '' },
  ]
  return [...linked, ...extra]
}

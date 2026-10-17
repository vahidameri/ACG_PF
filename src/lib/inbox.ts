import type { DB } from './types'
import { addDays, daysFromToday, todayISO } from './jalali'
import { isMine } from './access'
import { isAssignee } from './assignees'
import { WEEK_STATE, deliveryDate, weekState } from './cadence'
import { lbl } from './i18n'
import { TRACK } from './tracks'
import { resent, returnedToMe, sentToMe } from './handoffs'
import { L } from './i18n'
import { isTaskOverdue, riskScore } from './metrics'

export interface InboxItem {
  id: string
  kind: 'mention' | 'overdue' | 'followup' | 'milestone' | 'risk' | 'blocked' | 'assigned' | 'remind' | 'deadline' | 'delivery' | 'handoff'
  title: string
  sub: string
  when: string // ISO date or "YYYY-MM-DD HH:mm"
  tone: 'bad' | 'warn' | 'brand'
  target: { sheet: 'Tasks' | 'FollowUps' | 'Risks' | 'Milestones'; id: string } | { href: string }
}

/** Derives the PM's inbox from the data: things that need attention or mention them. */
export function buildInbox(db: DB, me: string): InboxItem[] {
  const out: InboxItem[] = []
  const today = todayISO()
  const pname = (id: string) => db.Projects.find((p) => p.id === id)?.name || ''

  if (me)
    db.Comments.filter((c) => c.author !== me && c.body.includes(`@${me}`)).forEach((c) => {
      const t = c.entity === 'Tasks' ? db.Tasks.find((x) => x.id === c.entity_id)?.title : c.entity === 'FollowUps' ? db.FollowUps.find((x) => x.id === c.entity_id)?.subject : db.Projects.find((x) => x.id === c.entity_id)?.name
      out.push({
        id: `m-${c.id}`, kind: 'mention', tone: 'brand', when: c.created_at,
        title: L(`${c.author} از شما نام برد`, `${c.author} mentioned you`), sub: `${t || ''} — ${c.body.slice(0, 80)}`,
        target: c.entity === 'Projects' ? { href: `/projects/${c.entity_id}` } : { sheet: c.entity as 'Tasks', id: c.entity_id },
      })
    })

  db.Tasks.filter((t) => isAssignee(t, me) && isTaskOverdue(t)).forEach((t) =>
    out.push({ id: `o-${t.id}`, kind: 'overdue', tone: 'bad', when: t.due_date, title: t.title, sub: L(`تسک معوق · ${pname(t.project_id)}`, `Overdue task · ${pname(t.project_id)}`), target: { sheet: 'Tasks', id: t.id } }),
  )
  db.FollowUps.filter((f) => f.status !== 'done' && f.due_date && f.due_date <= today).forEach((f) =>
    out.push({ id: `f-${f.id}`, kind: 'followup', tone: f.due_date < today ? 'bad' : 'warn', when: f.due_date, title: f.subject, sub: L(`پیگیری با ${f.person}`, `Follow up with ${f.person}`), target: { sheet: 'FollowUps', id: f.id } }),
  )
  db.Milestones.filter((m) => m.status !== 'done' && m.planned_date && daysFromToday(m.planned_date) >= 0 && daysFromToday(m.planned_date) <= 3).forEach((m) =>
    out.push({ id: `ms-${m.id}`, kind: 'milestone', tone: 'warn', when: m.planned_date, title: m.title, sub: L(`مایلستون نزدیک · ${pname(m.project_id)}`, `Milestone soon · ${pname(m.project_id)}`), target: { sheet: 'Milestones', id: m.id } }),
  )
  db.Risks.filter((r) => r.status !== 'closed' && riskScore(r) >= 15 && r.due_date && r.due_date < today).forEach((r) =>
    out.push({ id: `r-${r.id}`, kind: 'risk', tone: 'bad', when: r.due_date, title: r.title, sub: L(`مهلت اقدام ریسک گذشته · ${pname(r.project_id)}`, `Risk action overdue · ${pname(r.project_id)}`), target: { sheet: 'Risks', id: r.id } }),
  )
  db.Tasks.filter((t) => t.status === 'blocked' && !isAssignee(t, me)).forEach((t) =>
    out.push({ id: `b-${t.id}`, kind: 'blocked', tone: 'warn', when: t.due_date || today, title: t.title, sub: L(`مسدود · ${t.assignee}`, `Blocked · ${t.assignee}`), target: { sheet: 'Tasks', id: t.id } }),
  )
  // new work handed to me in the last two days
  db.Tasks.filter((t) => isAssignee(t, me) && t.reporter && t.reporter !== me && t.status !== 'done' && t.created_at >= addDays(today, -2)).forEach((t) =>
    out.push({ id: `a-${t.id}`, kind: 'assigned', tone: 'brand', when: t.created_at, title: t.title, sub: L(`${t.reporter} به شما سپرد`, `${t.reporter} assigned it to you`), target: { sheet: 'Tasks', id: t.id } }),
  )
  // follow-up dates and stage dates today, deadlines today or tomorrow — for everyone on the task
  db.Tasks.filter((t) => t.status !== 'done' && t.notify !== 'off' && isMine(t, me)).forEach((t) => {
    if (t.follow_date === today) out.push({ id: `rm-${t.id}`, kind: 'remind', tone: 'warn', when: today, title: t.title, sub: L(`یادآوری پیگیری · ${t.assignee || '—'}`, `Follow-up reminder · ${t.assignee || '—'}`), target: { sheet: 'Tasks', id: t.id } })
    if (t.handoff_date === today || t.test_date === today) out.push({ id: `st-${t.id}`, kind: 'remind', tone: 'warn', when: today, title: t.title, sub: t.handoff_date === today ? L('امروز: تحویل به پروداکت', 'Today: hand-off to product') : L('امروز: زمان تست', 'Today: testing'), target: { sheet: 'Tasks', id: t.id } })
    if (t.deadline && t.deadline >= today && t.deadline <= addDays(today, 1)) out.push({ id: `dl-${t.id}`, kind: 'deadline', tone: 'bad', when: t.deadline, title: t.title, sub: t.deadline === today ? L('ددلاین امروز است', 'Deadline is today') : L('ددلاین فردا است', 'Deadline is tomorrow'), target: { sheet: 'Tasks', id: t.id } })
  })
  // hand-offs: new ones for me (or my side), and mine that came back
  db.Handoffs.forEach((h) => {
    if (sentToMe(h, db, me))
      out.push({ id: `hs-${h.id}`, kind: 'handoff', tone: 'brand', when: h.sent_at, title: h.title, sub: L(`تحویل از ${lbl(TRACK, h.from_side)} · ${h.from_person}`, `Hand-off from ${lbl(TRACK, h.from_side)} · ${h.from_person}`), target: { sheet: 'Tasks', id: h.task_id } })
    else if (returnedToMe(h, me) && !resent(h, db))
      out.push({ id: `hr-${h.id}`, kind: 'handoff', tone: 'bad', when: h.responded_at || h.sent_at, title: h.title, sub: L(`برگشت از ${lbl(TRACK, h.to_side)}: ${h.reply}`, `Returned by ${lbl(TRACK, h.to_side)}: ${h.reply}`), target: { sheet: 'Tasks', id: h.task_id } })
    else if (h.from_person === me && h.status === 'sent' && h.due_date && h.due_date < today)
      out.push({ id: `ho-${h.id}`, kind: 'handoff', tone: 'warn', when: h.due_date, title: h.title, sub: L(`${lbl(TRACK, h.to_side)} هنوز پاسخ نداده`, `${lbl(TRACK, h.to_side)} has not answered yet`), target: { sheet: 'Tasks', id: h.task_id } })
  })
  // weekly delivery day of the projects I lead (leadership sees all of them on the Compass)
  db.Projects.filter((p) => p.owner === me).forEach((p) => {
    const st = weekState(p, db)
    if (st === 'today' || st === 'soon' || st === 'late' || st === 'missed')
      out.push({ id: `dv-${p.id}`, kind: 'delivery', tone: st === 'missed' || st === 'late' ? 'bad' : 'warn', when: deliveryDate(p), title: p.name, sub: L(`تحویل هفتگی · ${lbl(WEEK_STATE, st)}`, `Weekly delivery · ${lbl(WEEK_STATE, st)}`), target: { href: `/projects/${p.id}` } })
  })
  const off = new Set(notifyOff())
  return out.filter((i) => !off.has(i.kind)).sort((a, b) => (a.when < b.when ? 1 : -1))
}

/** In-app notification kinds; the program manager can switch any of them off (Config notify.off). */
export const NOTIFY_KINDS: { id: InboxItem['kind']; label: [string, string] }[] = [
  { id: 'assigned', label: ['تسک تازه برای من', 'New task for me'] },
  { id: 'handoff', label: ['تحویل بین سایدها (رسیده، برگشتی، بی‌پاسخ)', 'Hand-offs (new, returned, unanswered)'] },
  { id: 'remind', label: ['تاریخ پیگیری، تحویل به پروداکت، تست', 'Follow-up, hand-off and testing dates'] },
  { id: 'deadline', label: ['ددلاین امروز و فردا', 'Deadline today or tomorrow'] },
  { id: 'overdue', label: ['تسک معوق', 'Overdue task'] },
  { id: 'delivery', label: ['روز تحویل هفتگی پروژه', 'Weekly delivery day'] },
  { id: 'mention', label: ['نام بردن (@)', 'Mentions (@)'] },
  { id: 'followup', label: ['فالوآپ‌های امروز', 'Follow-ups due'] },
  { id: 'milestone', label: ['مایلستون نزدیک', 'Milestone soon'] },
  { id: 'risk', label: ['ریسک بحرانی', 'Critical risk'] },
  { id: 'blocked', label: ['کار مسدود دیگران', 'Others’ blocked work'] },
]
export const NOTIFY_KEY = 'notify.off'
let offKinds: string[] = []
export const notifyOff = () => offKinds
export const setNotifyOff = (v: string | undefined) => (offKinds = String(v || '').split(',').filter(Boolean))

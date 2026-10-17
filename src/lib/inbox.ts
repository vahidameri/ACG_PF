import type { DB } from './types'
import { addDays, daysFromToday, todayISO } from './jalali'
import { isMine } from './access'
import { deliveryDate, deliveryState } from './cadence'
import { L } from './i18n'
import { isTaskOverdue, riskScore } from './metrics'

export interface InboxItem {
  id: string
  kind: 'mention' | 'overdue' | 'followup' | 'milestone' | 'risk' | 'blocked' | 'assigned' | 'remind' | 'deadline' | 'delivery'
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

  db.Tasks.filter((t) => t.assignee === me && isTaskOverdue(t)).forEach((t) =>
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
  db.Tasks.filter((t) => t.status === 'blocked' && t.assignee !== me).forEach((t) =>
    out.push({ id: `b-${t.id}`, kind: 'blocked', tone: 'warn', when: t.due_date || today, title: t.title, sub: L(`مسدود · ${t.assignee}`, `Blocked · ${t.assignee}`), target: { sheet: 'Tasks', id: t.id } }),
  )
  // new work handed to me in the last two days
  db.Tasks.filter((t) => t.assignee === me && t.reporter && t.reporter !== me && t.status !== 'done' && t.created_at >= addDays(today, -2)).forEach((t) =>
    out.push({ id: `a-${t.id}`, kind: 'assigned', tone: 'brand', when: t.created_at, title: t.title, sub: L(`${t.reporter} به شما سپرد`, `${t.reporter} assigned it to you`), target: { sheet: 'Tasks', id: t.id } }),
  )
  // follow-up dates and stage dates today, deadlines today or tomorrow — for everyone on the task
  db.Tasks.filter((t) => t.status !== 'done' && t.notify !== 'off' && isMine(t, me)).forEach((t) => {
    if (t.follow_date === today) out.push({ id: `rm-${t.id}`, kind: 'remind', tone: 'warn', when: today, title: t.title, sub: L(`یادآوری پیگیری · ${t.assignee || '—'}`, `Follow-up reminder · ${t.assignee || '—'}`), target: { sheet: 'Tasks', id: t.id } })
    if (t.handoff_date === today || t.test_date === today) out.push({ id: `st-${t.id}`, kind: 'remind', tone: 'warn', when: today, title: t.title, sub: t.handoff_date === today ? L('امروز: تحویل به پروداکت', 'Today: hand-off to product') : L('امروز: زمان تست', 'Today: testing'), target: { sheet: 'Tasks', id: t.id } })
    if (t.deadline && t.deadline >= today && t.deadline <= addDays(today, 1)) out.push({ id: `dl-${t.id}`, kind: 'deadline', tone: 'bad', when: t.deadline, title: t.title, sub: t.deadline === today ? L('ددلاین امروز است', 'Deadline is today') : L('ددلاین فردا است', 'Deadline is tomorrow'), target: { sheet: 'Tasks', id: t.id } })
  })
  // weekly delivery day of the projects I lead (leadership sees all of them on the Radar)
  db.Projects.filter((p) => p.owner === me).forEach((p) => {
    const st = deliveryState(p)
    if (st === 'today' || st === 'missed')
      out.push({ id: `dv-${p.id}`, kind: 'delivery', tone: st === 'missed' ? 'bad' : 'warn', when: deliveryDate(p), title: p.name, sub: st === 'today' ? L('امروز روز تحویل هفتگی است', 'Weekly delivery is due today') : L('تحویل هفتگی این هفته ثبت نشده', 'This week’s delivery was not recorded'), target: { href: `/projects/${p.id}` } })
  })
  return out.sort((a, b) => (a.when < b.when ? 1 : -1))
}

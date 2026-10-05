import type { DB } from './types'
import { daysFromToday, todayISO } from './jalali'
import { L } from './i18n'
import { isTaskOverdue, riskScore } from './metrics'

export interface InboxItem {
  id: string
  kind: 'mention' | 'overdue' | 'followup' | 'milestone' | 'risk' | 'blocked'
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
  return out.sort((a, b) => (a.when < b.when ? 1 : -1))
}

import { Link } from 'react-router-dom'
import { Check, Clock, AlarmClockOff, MessageSquare, Phone, Mail, Users2, MoreHorizontal, AlertTriangle, CalendarClock } from 'lucide-react'
import type { FollowUp, Project, Task } from '../lib/types'
import { useStore } from '../lib/store'
import { useEditor } from './Editor'
import { Avatar, Due, HealthDot, PriorityBadge, Progress, TaskStatusBadge, cx, healthText, Chip } from './ui'
import { addDays, fa, fmtDayMonth, todayISO, daysFromToday } from '../lib/jalali'
import { CHANNEL, FOLLOWUP_STATUS, HEALTH, PROJECT_STATUS } from '../lib/labels'
import { projectMetrics } from '../lib/metrics'

export function useProjectName() {
  const { db } = useStore()
  return (id: string) => db.Projects.find((p) => p.id === id)?.name || ''
}

export function TaskRow({ t, showProject = true }: { t: Task; showProject?: boolean }) {
  const { upsert, canEdit, toast } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const done = t.status === 'done'
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return
    await upsert('Tasks', { ...t, status: done ? 'todo' : 'done', completed_at: done ? '' : todayISO() })
    if (!done) toast('تسک انجام شد ✓')
  }
  return (
    <div onClick={() => open('Tasks', t as never)} className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/70 transition">
      <button
        onClick={toggle}
        className={cx(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
          done ? 'border-good bg-good text-white' : 'border-line hover:border-good',
          !canEdit && 'pointer-events-none',
        )}
        aria-label="انجام شد"
      >
        {done && <Check size={12} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cx('truncate text-sm', done && 'line-through text-sub')}>{t.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-sub">
          {showProject && t.project_id && <span className="truncate max-w-[12rem]">{pname(t.project_id)}</span>}
          {t.status === 'blocked' && <TaskStatusBadge s="blocked" />}
          {t.status === 'in_progress' && <TaskStatusBadge s="in_progress" />}
          {t.status === 'review' && <TaskStatusBadge s="review" />}
        </div>
      </div>
      <span className="hidden sm:inline-flex">
        <PriorityBadge p={t.priority} />
      </span>
      <Due iso={t.due_date} done={done} />
      <Avatar name={t.assignee} size="xs" />
    </div>
  )
}

const channelIcon = { meeting: Users2, call: Phone, email: Mail, chat: MessageSquare, other: MoreHorizontal }

export function FollowUpRow({ f, compact }: { f: FollowUp; compact?: boolean }) {
  const { upsert, canEdit, toast } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const Icon = channelIcon[f.channel] || MoreHorizontal
  const overdue = f.status !== 'done' && f.due_date && daysFromToday(f.due_date) < 0

  const act = async (e: React.MouseEvent, patch: Partial<FollowUp>, msg: string) => {
    e.stopPropagation()
    await upsert('FollowUps', { ...f, ...patch })
    toast(msg)
  }

  return (
    <div onClick={() => open('FollowUps', f as never)} className={cx('group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 hover:bg-muted/70 transition', overdue && 'bg-bad/[0.04]')}>
      <div className={cx('mt-0.5 rounded-lg p-1.5', overdue ? 'bg-bad/10 text-bad' : 'bg-muted text-sub')}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cx('text-sm font-medium', f.status === 'done' && 'line-through text-sub')}>{f.subject}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sub">
          <span className="inline-flex items-center gap-1">
            <Avatar name={f.person} size="xs" /> {f.person}
          </span>
          <span>· {CHANNEL[f.channel]}</span>
          {f.project_id && <span>· {pname(f.project_id)}</span>}
          {f.status === 'waiting' && <Chip className="bg-purple-500/10 text-purple-500">{FOLLOWUP_STATUS.waiting}</Chip>}
        </div>
        {!compact && f.notes && <div className="mt-1 text-xs text-sub/90 line-clamp-2">{f.notes}</div>}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Due iso={f.due_date} done={f.status === 'done'} />
        {canEdit && f.status !== 'done' && (
          <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
            <button className="btn-ghost h-7 px-2 text-xs" title="انجام شد" onClick={(e) => act(e, { status: 'done', done_at: todayISO() }, 'فالوآپ بسته شد')}>
              <Check size={14} />
            </button>
            <button className="btn-ghost h-7 px-2 text-xs" title="منتظر پاسخ" onClick={(e) => act(e, { status: 'waiting', due_date: addDays(todayISO(), 2) }, 'منتظر پاسخ — ۲ روز دیگر یادآوری می‌شود')}>
              <Clock size={14} />
            </button>
            <button className="btn-ghost h-7 px-2 text-xs" title="تعویق یک روز" onClick={(e) => act(e, { due_date: addDays(todayISO(), 1) }, 'به فردا موکول شد')}>
              <AlarmClockOff size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProjectCard({ p }: { p: Project }) {
  const { db } = useStore()
  const m = projectMetrics(p, db)
  return (
    <Link to={`/projects/${p.id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HealthDot h={m.health} pulse />
            <span className="text-[11px] font-semibold text-sub" dir="ltr">
              {p.code}
            </span>
          </div>
          <h3 className="mt-1.5 truncate font-semibold group-hover:text-brand transition">{p.name}</h3>
          <p className="mt-0.5 text-xs text-sub line-clamp-1">{p.description}</p>
        </div>
        <PriorityBadge p={p.priority} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-sub">پیشرفت</span>
        <span className="font-semibold num">
          {fa(m.progress)}٪ <span className="text-sub font-normal">/ زمان {fa(m.elapsed)}٪</span>
        </span>
      </div>
      <Progress value={m.progress} h={m.health} marker={m.elapsed} className="mt-1.5" />
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="ددلاین" value={fmtDayMonth(p.end_date)} tone={m.daysLeft < 0 && p.status === 'active' ? 'bad' : undefined} />
        <MiniStat label="تسک باز" value={fa(m.openTasks)} tone={m.overdueTasks ? 'warn' : undefined} />
        <MiniStat label="ریسک باز" value={fa(m.openRisks)} tone={m.highRisks ? 'bad' : undefined} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-sub">
        <span className="inline-flex items-center gap-1.5">
          <Avatar name={p.owner} size="xs" /> {p.owner}
        </span>
        <span className={cx('font-medium', healthText[m.health])}>
          {p.status === 'active' ? HEALTH[m.health] : PROJECT_STATUS[p.status]}
        </span>
      </div>
      {m.health !== 'green' && p.status === 'active' && (
        <div className={cx('mt-2 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px]', m.health === 'red' ? 'bg-bad/10 text-bad' : 'bg-warn/10 text-warn')}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span className="line-clamp-1">{m.reasons.find((r) => r.level !== 'green')?.text}</span>
        </div>
      )}
      {m.nextMilestone && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-sub">
          <CalendarClock size={12} /> مایلستون بعدی: <span className="text-ink/80 truncate">{m.nextMilestone.title}</span> · {fmtDayMonth(m.nextMilestone.planned_date)}
        </div>
      )}
    </Link>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'bad' | 'warn' }) {
  return (
    <div className="rounded-xl bg-muted/70 py-2">
      <div className={cx('text-sm font-semibold num', tone === 'bad' && 'text-bad', tone === 'warn' && 'text-warn')}>{value}</div>
      <div className="text-[10px] text-sub">{label}</div>
    </div>
  )
}

export function money(n: number) {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e9) return `${fa((v / 1e9).toFixed(1).replace('.0', ''))} میلیارد`
  if (Math.abs(v) >= 1e6) return `${fa(Math.round(v / 1e6))} میلیون`
  return fa(v.toLocaleString('en-US'))
}

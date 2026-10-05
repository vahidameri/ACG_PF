import { Link } from 'react-router-dom'
import { Check, Clock, AlarmClockOff, MessageSquare, Phone, Mail, Users2, MoreHorizontal, AlertTriangle, Star, ArrowUpRight } from 'lucide-react'
import type { FollowUp, Project, Task } from '../lib/types'
import { useStore } from '../lib/store'
import { useEditor } from './Editor'
import { Avatar, Due, HealthDot, Progress, cx, healthText, Chip, StatusIcon } from './ui'
import { addDays, fa, fmtDayMonth, todayISO, daysFromToday } from '../lib/jalali'
import { L, lbl, locale } from '../lib/i18n'
import { CHANNEL, FOLLOWUP_STATUS, HEALTH, PROJECT_STATUS } from '../lib/labels'
import { projectMetrics } from '../lib/metrics'
import { usePins } from '../lib/prefs'
import { PersonPicker, PriorityPicker } from './pickers'
import { DatePicker } from './DatePicker'
import { HealthTrend } from './widgets'

export function useProjectName() {
  const { db } = useStore()
  return (id: string) => db.Projects.find((p) => p.id === id)?.name || ''
}

/** Toggle a task done with an undo toast. */
export function useCompleteTask() {
  const { upsert, toast } = useStore()
  return async (t: Task) => {
    const done = t.status === 'done'
    await upsert('Tasks', { ...t, status: done ? 'todo' : 'done', completed_at: done ? '' : todayISO() })
    if (!done) toast(L('تسک انجام شد', 'Task completed'), 'ok', { label: L('بازگردانی', 'Undo'), run: () => upsert('Tasks', t) })
  }
}

export function TaskRow({ t, showProject = true, dense }: { t: Task; showProject?: boolean; dense?: boolean }) {
  const { upsert, canEdit, db } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const complete = useCompleteTask()
  const done = t.status === 'done'
  const nComments = db.Comments.filter((c) => c.entity === 'Tasks' && c.entity_id === t.id).length
  const patch = (p: Partial<Task>) => upsert('Tasks', { ...t, ...p, ...(p.status ? { completed_at: p.status === 'done' ? todayISO() : '' } : {}) })
  return (
    <div onClick={() => open('Tasks', t as never)} className={cx('group flex cursor-pointer items-center gap-2 rounded-xl px-2 transition hover:bg-muted/70', dense ? 'py-1.5' : 'py-2')}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          canEdit && complete(t)
        }}
        className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-surface', !canEdit && 'pointer-events-none')}
        aria-label={L('انجام شد', 'Done')}
        title={L('انجام شد', 'Mark done')}
      >
        <StatusIcon s={done ? 'done' : t.status} size={17} />
      </button>
      <div className="min-w-0 flex-1">
        <div className={cx('truncate text-sm', done && 'text-sub line-through')}>{t.title}</div>
        {(showProject && t.project_id) || nComments ? (
          <div className="mt-0.5 flex items-center gap-2 text-[0.6875rem] text-sub">
            {showProject && t.project_id && <span className="max-w-[14rem] truncate">{pname(t.project_id)}</span>}
            {nComments > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare size={11} /> {fa(nComments)}
              </span>
            )}
          </div>
        ) : null}
      </div>
      <span className="hidden @sm:inline-flex">
        <PriorityPicker value={t.priority} onChange={(p) => patch({ priority: p })} label={false} />
      </span>
      <span className="hidden min-w-[4.5rem] justify-end @md:inline-flex" onClick={(e) => e.stopPropagation()}>
        {canEdit ? <DueInline iso={t.due_date} done={done} onChange={(d) => patch({ due_date: d })} /> : <Due iso={t.due_date} done={done} />}
      </span>
      <PersonPicker value={t.assignee} onChange={(a) => patch({ assignee: a })} label={false} />
    </div>
  )
}

function DueInline({ iso, done, onChange }: { iso: string; done: boolean; onChange: (iso: string) => void }) {
  return (
    <span className="relative inline-flex">
      <span className="pointer-events-none absolute inset-0 flex items-center justify-end px-2.5">
        <Due iso={iso} done={done} />
      </span>
      <span className="opacity-0">
        <DatePicker compact value={iso} onChange={onChange} />
      </span>
    </span>
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
    toast(msg, 'ok', { label: L('بازگردانی', 'Undo'), run: () => upsert('FollowUps', f) })
  }

  return (
    <div onClick={() => open('FollowUps', f as never)} className="group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-muted/70">
      <div className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', overdue ? 'bg-bad/10 text-bad' : f.status === 'waiting' ? 'bg-purple-500/10 text-purple-500' : 'bg-muted text-sub')}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cx('text-sm font-medium', f.status === 'done' && 'text-sub line-through')}>{f.subject}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sub">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={f.person} size="xs" /> {f.person}
          </span>
          <span>· {lbl(CHANNEL, f.channel)}</span>
          {f.project_id && <span className="truncate">· {pname(f.project_id)}</span>}
          {f.status === 'waiting' && <Chip className="bg-purple-500/10 text-purple-600 dark:text-purple-300">{lbl(FOLLOWUP_STATUS, 'waiting')}</Chip>}
        </div>
        {!compact && f.notes && <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-sub/90">{f.notes}</div>}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Due iso={f.due_date} done={f.status === 'done'} />
        {canEdit && f.status !== 'done' && (
          <div className="flex gap-0.5 transition @sm:opacity-0 @sm:group-hover:opacity-100">
            <button className="icon-btn h-7 w-7" title={L('انجام شد', 'Done')} onClick={(e) => act(e, { status: 'done', done_at: todayISO() }, L('فالوآپ بسته شد', 'Follow-up closed'))}>
              <Check size={14} />
            </button>
            <button className="icon-btn h-7 w-7" title={L('منتظر پاسخ', 'Waiting')} onClick={(e) => act(e, { status: 'waiting', due_date: addDays(todayISO(), 2) }, L('منتظر پاسخ — ۲ روز دیگر یادآوری می‌شود', 'Waiting — reminder in 2 days'))}>
              <Clock size={14} />
            </button>
            <button className="icon-btn h-7 w-7" title={L('فردا', 'Tomorrow')} onClick={(e) => act(e, { due_date: addDays(todayISO(), 1) }, L('به فردا موکول شد', 'Snoozed to tomorrow'))}>
              <AlarmClockOff size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function PinButton({ id, className }: { id: string; className?: string }) {
  const { isPinned, toggle } = usePins()
  const on = isPinned(id)
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(id)
      }}
      className={cx('icon-btn h-8 w-8', on ? 'text-warn' : 'text-sub/60', className)}
      title={on ? L('برداشتن پین', 'Unpin') : L('پین کردن', 'Pin')}
    >
      <Star size={15} fill={on ? 'currentColor' : 'none'} />
    </button>
  )
}

export function ProjectCard({ p }: { p: Project }) {
  const { db } = useStore()
  const m = projectMetrics(p, db)
  const team = db.Allocations.filter((a) => a.project_id === p.id).map((a) => db.Team.find((x) => x.id === a.member_id)?.name || '').filter(Boolean)
  const issue = m.reasons.find((r) => r.level !== 'green')
  return (
    <Link to={`/projects/${p.id}`} className="card card-hover group flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] font-medium tracking-wider text-sub" dir="ltr">
            {p.code}
          </span>
          <span className={cx('inline-flex items-center gap-1.5 text-[0.6875rem] font-medium', healthText[m.health])}>
            <HealthDot h={m.health} pulse /> {p.status === 'active' ? lbl(HEALTH, m.health) : lbl(PROJECT_STATUS, p.status)}
          </span>
        </div>
        <PinButton id={p.id} className="-me-2 -mt-1.5" />
      </div>
      <h3 className="mt-3 text-[1.0625rem] font-semibold leading-snug tracking-tight">{p.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-sub">{p.description}</p>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="display text-3xl num">
            {fa(m.progress)}
            <span className="text-base text-sub">%</span>
          </div>
          <div className="text-[0.6875rem] text-sub">
            {L('زمان', 'Time')} {fa(m.elapsed)}%
          </div>
        </div>
        <div className="text-end text-[0.6875rem] text-sub">
          <div>{L('ددلاین', 'Deadline')}</div>
          <div className={cx('text-sm font-medium num text-ink', m.daysLeft < 0 && p.status === 'active' && '!text-bad')}>{fmtDayMonth(p.end_date)}</div>
        </div>
      </div>
      <Progress value={m.progress} h={m.health} marker={m.elapsed} className="mt-3" />

      <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line rtl:divide-x-reverse">
        <div className="px-3 py-2">
          <div className="text-[0.625rem] text-sub">{L('تسک‌ها', 'Tasks')}</div>
          <div className="mt-0.5 text-sm font-semibold num">
            {fa(m.doneTasks)}
            <span className="font-normal text-sub">/{fa(m.totalTasks)}</span>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[0.625rem] text-sub">{L('بودجه', 'Budget')}</div>
          <div className={cx('mt-0.5 text-sm font-semibold num', m.budgetUse > 100 ? 'text-bad' : m.budgetUse > m.progress + 20 ? 'text-warn' : '')}>{fa(m.budgetUse)}%</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[0.625rem] text-sub">{L('روند', 'Trend')}</div>
          <div className="mt-1">
            <HealthTrend projectId={p.id} n={4} />
          </div>
        </div>
      </div>

      {issue && p.status === 'active' ? (
        <div className={cx('mt-4 flex items-start gap-2 rounded-xl px-3 py-2 text-[0.6875rem] leading-5', m.health === 'red' ? 'bg-bad/[0.07] text-bad' : 'bg-warn/[0.09] text-warn')}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{issue.text}</span>
        </div>
      ) : m.nextMilestone ? (
        <div className="mt-4 rounded-xl bg-muted/70 px-3 py-2 text-[0.6875rem] text-sub">
          {L('بعدی', 'Next')}: <span className="text-ink">{m.nextMilestone.title}</span> · {fmtDayMonth(m.nextMilestone.planned_date)}
        </div>
      ) : (
        <div className="mt-4" />
      )}

      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-sub">
        <span className="flex items-center gap-2">
          <Avatar name={p.owner} size="xs" /> {p.owner}
        </span>
        <span className="flex items-center gap-3">
          {team.length > 0 && <AvatarStackLite names={team} />}
          <ArrowUpRight size={15} className="text-sub/50 transition group-hover:text-ink rtl:-scale-x-100" />
        </span>
      </div>
    </Link>
  )
}

function AvatarStackLite({ names }: { names: string[] }) {
  return (
    <span className="flex -space-x-1.5 rtl:space-x-reverse">
      {names.slice(0, 3).map((n) => (
        <Avatar key={n} name={n} size="xs" ring />
      ))}
      {names.length > 3 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1 text-[0.5625rem] ring-2 ring-surface">+{fa(names.length - 3)}</span>}
    </span>
  )
}

/** Compact money: 8.5B / ۸٫۵ میلیارد (values are in IRR in the sheet). */
export function money(n: number) {
  const v = Number(n) || 0
  const en = locale.lang === 'en'
  if (Math.abs(v) >= 1e9) {
    const x = (v / 1e9).toFixed(1).replace(/\.0$/, '')
    return en ? `${x}B` : `${fa(x.replace('.', '٫'))} میلیارد`
  }
  if (Math.abs(v) >= 1e6) return en ? `${Math.round(v / 1e6)}M` : `${fa(Math.round(v / 1e6))} میلیون`
  return fa(v.toLocaleString('en-US'))
}

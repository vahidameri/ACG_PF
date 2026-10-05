import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Check, Flag, Plus } from 'lucide-react'
import type { DB, Risk, Sprint, Task, TaskStatus, Update, Milestone } from '../lib/types'
import { useStore } from '../lib/store'
import { useEditor } from './Editor'
import { Avatar, Due, PriorityBadge, cx, HealthBadge, Chip } from './ui'
import { TASK_STATUS, TASK_STATUS_ORDER, MILESTONE_STATUS } from '../lib/labels'
import { burndown, riskScore, sprintCommitted, sprintDonePoints } from '../lib/metrics'
import { fa, fmtDayMonth, fmtDate, todayISO, daysFromToday } from '../lib/jalali'
import { useProjectName } from './shared'

const tooltipStyle = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12, fontFamily: 'Vazirmatn Variable' }
const axisTick = { fontSize: 11, fill: 'rgb(var(--sub))' }

// ---------------- Kanban ----------------
const colAccent: Record<TaskStatus, string> = {
  todo: 'bg-sub',
  in_progress: 'bg-brand',
  review: 'bg-purple-500',
  blocked: 'bg-bad',
  done: 'bg-good',
}

export function Kanban({ tasks, defaults, showProject = true }: { tasks: Task[]; defaults?: Partial<Task>; showProject?: boolean }) {
  const { upsert, canEdit } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<TaskStatus | null>(null)

  const drop = async (s: TaskStatus) => {
    setOver(null)
    const t = tasks.find((x) => x.id === drag)
    setDrag(null)
    if (!t || t.status === s) return
    await upsert('Tasks', { ...t, status: s, completed_at: s === 'done' ? todayISO() : '' })
  }

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-2">
      {TASK_STATUS_ORDER.map((s) => {
        const col = tasks.filter((t) => t.status === s)
        const pts = col.reduce((a, t) => a + (Number(t.points) || 0), 0)
        return (
          <div
            key={s}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(s)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => drop(s)}
            className={cx('flex flex-col rounded-2xl bg-muted/50 p-2 transition min-h-[200px]', over === s && 'ring-2 ring-brand/40 bg-brand/5')}
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className={cx('h-2 w-2 rounded-full', colAccent[s])} />
              <span className="text-sm font-semibold">{TASK_STATUS[s]}</span>
              <span className="text-xs text-sub num">{fa(col.length)}</span>
              {pts > 0 && <span className="text-[11px] text-sub num mr-auto">{fa(pts)} پوینت</span>}
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {col.map((t) => (
                <div
                  key={t.id}
                  draggable={canEdit}
                  onDragStart={() => setDrag(t.id)}
                  onClick={() => open('Tasks', t as never)}
                  className={cx('card cursor-pointer p-3 hover:border-brand/40 transition', drag === t.id && 'opacity-40')}
                >
                  <div className={cx('text-sm leading-6', s === 'done' && 'line-through text-sub')}>{t.title}</div>
                  {showProject && t.project_id && <div className="mt-1 text-[11px] text-sub truncate">{pname(t.project_id)}</div>}
                  {t.status === 'blocked' && t.description && <div className="mt-1 rounded-lg bg-bad/10 px-2 py-1 text-[11px] text-bad">{t.description}</div>}
                  <div className="mt-2.5 flex items-center gap-2">
                    <PriorityBadge p={t.priority} />
                    {Number(t.points) > 0 && <Chip>{fa(t.points)} SP</Chip>}
                    <span className="flex-1" />
                    <Due iso={t.due_date} done={s === 'done'} />
                    <Avatar name={t.assignee} size="xs" />
                  </div>
                </div>
              ))}
              {canEdit && (
                <button onClick={() => open('Tasks', { ...defaults, status: s })} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-sub hover:bg-surface hover:text-ink transition">
                  <Plus size={14} /> افزودن
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------- Sprint charts ----------------
export function BurndownChart({ sprint, db }: { sprint: Sprint; db: DB }) {
  const data = burndown(sprint, db).map((r) => ({ ...r, label: fmtDayMonth(r.day) }))
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id={`bd-${sprint.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" reversed />
          <YAxis tick={axisTick} tickFormatter={(v) => fa(v)} axisLine={false} tickLine={false} width={28} orientation="right" />
          <Tooltip contentStyle={tooltipStyle} />
          <Line dataKey="ideal" name="ایده‌آل" stroke="rgb(var(--sub))" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
          <Area dataKey="actual" name="باقی‌مانده" stroke="rgb(var(--brand))" fill={`url(#bd-${sprint.id})`} strokeWidth={2.5} connectNulls={false} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VelocityChart({ sprints, db }: { sprints: Sprint[]; db: DB }) {
  const data = [...sprints]
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
    .map((s) => ({ name: s.name, تعهد: sprintCommitted(s, db), تحویل: sprintDonePoints(s, db) }))
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} barGap={3}>
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} reversed />
          <YAxis tick={axisTick} tickFormatter={(v) => fa(v)} axisLine={false} tickLine={false} width={28} orientation="right" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--muted))' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="تعهد" fill="rgb(var(--brand) / 0.25)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="تحویل" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendArea({ data, dataKey }: { data: Record<string, unknown>[]; dataKey: string }) {
  return (
    <div className="h-12">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <Area dataKey={dataKey} stroke="rgb(var(--brand))" fill="rgb(var(--brand) / 0.15)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------- Risk matrix ----------------
export function RiskMatrix({ risks, onPick }: { risks: Risk[]; onPick?: (r: Risk) => void }) {
  const cell = (p: number, i: number) => risks.filter((r) => Number(r.probability) === p && Number(r.impact) === i)
  const tone = (s: number) => (s >= 15 ? 'bg-bad/20 hover:bg-bad/30' : s >= 8 ? 'bg-warn/20 hover:bg-warn/30' : 'bg-good/15 hover:bg-good/25')
  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-center">
        <span className="text-[11px] text-sub [writing-mode:vertical-rl] rotate-180">احتمال ←</span>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-5 gap-1.5">
          {[5, 4, 3, 2, 1].map((p) =>
            [1, 2, 3, 4, 5].map((i) => {
              const items = cell(p, i)
              return (
                <div key={`${p}-${i}`} className={cx('relative aspect-[1.4] rounded-lg p-1 transition flex flex-wrap content-start gap-1', tone(p * i))} title={`احتمال ${p} × اثر ${i}`}>
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onPick?.(r)}
                      title={r.title}
                      className={cx('h-5 min-w-5 rounded-full px-1 text-[10px] font-bold text-white shadow-sm', p * i >= 15 ? 'bg-bad' : p * i >= 8 ? 'bg-warn' : 'bg-good')}
                    >
                      {fa(risks.indexOf(r) + 1)}
                    </button>
                  ))}
                </div>
              )
            }),
          )}
        </div>
        <div className="mt-1 text-center text-[11px] text-sub">اثر ←</div>
      </div>
    </div>
  )
}

// ---------------- Milestone timeline ----------------
export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  const { open } = useEditor()
  const { upsert, canEdit, toast } = useStore()
  const sorted = [...milestones].sort((a, b) => (a.planned_date < b.planned_date ? -1 : 1))
  return (
    <ol className="relative mr-3 border-r-2 border-line">
      {sorted.map((m) => {
        const late = m.status !== 'done' && m.planned_date && daysFromToday(m.planned_date) < 0
        const slip = m.actual_date && m.planned_date ? daysFromToday(m.planned_date) - daysFromToday(m.actual_date) : 0
        return (
          <li key={m.id} className="relative mb-4 pr-6 last:mb-0">
            <span
              className={cx(
                'absolute -right-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-surface',
                m.status === 'done' ? 'bg-good' : late || m.status === 'missed' ? 'bg-bad' : m.status === 'in_progress' ? 'bg-brand' : 'bg-line',
              )}
            >
              {m.status === 'done' && <Check size={10} className="text-white" strokeWidth={3} />}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => open('Milestones', m as never)} className="text-sm font-medium hover:text-brand text-right">
                {m.title}
              </button>
              <Chip className={cx(m.status === 'done' ? 'bg-good/10 text-good' : late || m.status === 'missed' ? 'bg-bad/10 text-bad' : m.status === 'in_progress' ? 'bg-brand/10 text-brand' : '')}>
                {late && m.status !== 'missed' ? 'عقب‌افتاده' : MILESTONE_STATUS[m.status]}
              </Chip>
              {canEdit && m.status !== 'done' && (
                <button
                  className="text-[11px] text-sub hover:text-good"
                  onClick={async () => {
                    await upsert('Milestones', { ...m, status: 'done', actual_date: todayISO() })
                    toast('مایلستون انجام شد')
                  }}
                >
                  علامت انجام
                </button>
              )}
            </div>
            <div className="mt-0.5 text-xs text-sub num">
              برنامه: {fmtDate(m.planned_date)}
              {m.actual_date && ` · واقعی: ${fmtDate(m.actual_date)}`}
              {slip > 0 && <span className="text-bad"> ({fa(slip)} روز تأخیر)</span>}
              {m.owner && ` · ${m.owner}`}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------- Weekly update card ----------------
export function UpdateCard({ u, showProject }: { u: Update; showProject?: boolean }) {
  const { open } = useEditor()
  const pname = useProjectName()
  const lines = (s: string) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <div className="card p-5 cursor-pointer hover:border-brand/30 transition" onClick={() => open('Updates', u as never)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={u.author} />
          <div>
            <div className="text-sm font-medium">{showProject ? pname(u.project_id) : u.author}</div>
            <div className="text-[11px] text-sub">
              {showProject && `${u.author} · `}
              {fmtDate(u.week_date, 'long')}
            </div>
          </div>
        </div>
        <HealthBadge h={u.health} />
      </div>
      <p className="mt-3 text-sm leading-7">{u.summary}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          ['انجام‌شده', u.done, 'text-good'],
          ['هفته‌ی بعد', u.next, 'text-brand'],
          ['موانع', u.blockers, 'text-bad'],
        ].map(([l, v, c]) => (
          <div key={l}>
            <div className={cx('text-[11px] font-semibold mb-1', c)}>{l}</div>
            <ul className="space-y-0.5 text-xs text-ink/80">
              {lines(v).length ? lines(v).map((x, i) => <li key={i}>• {x}</li>) : <li className="text-sub">—</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SprintHeader({ s, db }: { s: Sprint; db: DB }) {
  const committed = sprintCommitted(s, db)
  const done = sprintDonePoints(s, db)
  const pct = committed ? Math.round((done / committed) * 100) : 0
  const daysLeft = daysFromToday(s.end_date)
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Flag size={15} className="text-brand" />
        <span className="font-semibold">{s.name}</span>
        <span className="text-sub text-xs">
          {fmtDayMonth(s.start_date)} تا {fmtDayMonth(s.end_date)}
        </span>
      </div>
      <span className="text-xs text-sub">
        هدف: <span className="text-ink">{s.goal || '—'}</span>
      </span>
      <span className="text-xs num">
        <b>{fa(done)}</b> از {fa(committed)} پوینت ({fa(pct)}٪)
      </span>
      {s.status === 'active' && <span className={cx('text-xs', daysLeft < 0 ? 'text-bad' : 'text-sub')}>{daysLeft >= 0 ? `${fa(daysLeft)} روز باقی‌مانده` : 'پایان یافته'}</span>}
    </div>
  )
}

export const riskTone = (r: Risk) => {
  const s = riskScore(r)
  return s >= 15 ? 'bg-bad text-white' : s >= 8 ? 'bg-warn text-white' : 'bg-good text-white'
}

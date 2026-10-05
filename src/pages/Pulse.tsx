import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Band, Card, Overlap, StatStrip, Segmented, cx, HealthDot, Avatar } from '../components/ui'
import { portfolioSummary, type ProjectMetrics } from '../lib/metrics'
import { addDays, daysBetween, fa, fmtDayMonth, relDays, todayISO, fmtDate } from '../lib/jalali'
import { HEALTH, PROJECT_STATUS } from '../lib/labels'
import { L, lbl, locale } from '../lib/i18n'
import { money } from '../components/shared'
import { trackStats, TRACK, trackDot } from '../lib/tracks'
import type { Health, Project } from '../lib/types'

const HC: Record<Health, string> = { green: 'rgb(var(--good))', amber: 'rgb(var(--warn))', red: 'rgb(var(--bad))' }

/** A visual read of where every project stands right now. */
export default function Pulse() {
  const { db } = useStore()
  const s = portfolioSummary(db)
  const [lens, setLens] = useState<'wall' | 'matrix' | 'race'>('wall')
  const live = [...s.live].sort((a, b) => s.metrics.get(a.id)!.score - s.metrics.get(b.id)!.score)

  return (
    <>
      <Band
        eyebrow={<span>{L('پورتفولیو / وضعیت تصویری', 'Portfolio / Visual status')}</span>}
        title={L('نبض پروژه‌ها، در یک نگاه', 'Every project, at a glance')}
        sub={L('رنگ = سلامت · حلقه = پیشرفت · خط روی حلقه = زمان سپری‌شده', 'Colour = health · ring = progress · tick on the ring = time elapsed')}
        actions={<Segmented dark value={lens} onChange={setLens} options={[{ value: 'wall', label: L('دیوار وضعیت', 'Status wall') }, { value: 'matrix', label: L('ماتریس', 'Matrix') }, { value: 'race', label: L('مسابقه‌ی پیشرفت', 'Progress race') }]} />}
      >
        <HealthBar live={live} metrics={s.metrics} />
      </Band>

      <Overlap className="space-y-4">
        {lens === 'wall' && (
          <div className="grid gap-4 @lg:grid-cols-2 @2xl:grid-cols-3 @3xl:grid-cols-4">
            {live.map((p) => (
              <Tile key={p.id} p={p} m={s.metrics.get(p.id)!} />
            ))}
          </div>
        )}
        {lens === 'matrix' && (
          <div className="grid gap-4 @2xl:grid-cols-[1fr_22rem]">
            <Card eyebrow={L('ماتریس پورتفولیو', 'Portfolio matrix')} title={L('زمان در برابر هزینه', 'Schedule vs cost')}>
              <Matrix live={live} metrics={s.metrics} />
            </Card>
            <Card eyebrow={L('راهنما', 'How to read')} title={L('هر حباب یک پروژه است', 'Each bubble is a project')}>
              <ul className="space-y-3 text-sm leading-6 text-ink/80">
                <li>{L('محور افقی: پیشرفت منهای زمان سپری‌شده. راستِ صفر یعنی جلوتر از برنامه.', 'Horizontal: progress minus time elapsed. Right of zero = ahead of schedule.')}</li>
                <li>{L('محور عمودی: پیشرفت منهای مصرف بودجه. بالای صفر یعنی ارزان‌تر از کار انجام‌شده.', 'Vertical: progress minus budget used. Above zero = spending less than delivered.')}</li>
                <li>{L('اندازه‌ی حباب: بودجه. رنگ: سلامت.', 'Bubble size: budget. Colour: health.')}</li>
              </ul>
              <div className="mt-5 space-y-2">
                {live.map((p) => {
                  const m = s.metrics.get(p.id)!
                  return (
                    <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-muted">
                      <HealthDot h={m.health} />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-[0.6875rem] text-sub num" dir="ltr">
                        {m.scheduleGap > 0 ? '+' : ''}
                        {m.scheduleGap} / {m.progress - m.budgetUse > 0 ? '+' : ''}
                        {m.progress - m.budgetUse}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </Card>
          </div>
        )}
        {lens === 'race' && (
          <Card eyebrow={L('مسابقه‌ی پیشرفت', 'Progress race')} title={L('پیشرفت کار در برابر زمان سپری‌شده', 'Delivery vs time elapsed')}>
            <Race live={live} metrics={s.metrics} />
          </Card>
        )}

        <div className="grid gap-4 @2xl:grid-cols-2">
          <Card eyebrow={L('بودجه', 'Budget')} title={L('سهم هر پروژه از بودجه‌ی پورتفولیو', 'Share of portfolio budget')}>
            <BudgetShare live={live} metrics={s.metrics} />
          </Card>
          <Card eyebrow={L('روند', 'Trend')} title={L('نقشه‌ی حرارتی سلامت هفته‌به‌هفته', 'Weekly health heatmap')}>
            <HealthHeat live={live} />
          </Card>
        </div>
      </Overlap>
    </>
  )
}

// ------------------------------------------------------------------ pieces

function HealthBar({ live, metrics }: { live: Project[]; metrics: Map<string, ProjectMetrics> }) {
  const counts = { green: 0, amber: 0, red: 0 } as Record<Health, number>
  live.forEach((p) => counts[metrics.get(p.id)!.health]++)
  const n = Math.max(1, live.length)
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
        {(['red', 'amber', 'green'] as Health[]).map((h) => (
          <div key={h} style={{ width: `${(counts[h] / n) * 100}%`, background: HC[h] }} className="transition-[width] duration-700" />
        ))}
      </div>
      <div className="mt-3">
        <StatStrip
          items={[
            { label: L('در خطر', 'Off track'), value: fa(counts.red), tone: 'red' },
            { label: L('نیازمند توجه', 'At risk'), value: fa(counts.amber), tone: 'amber' },
            { label: L('سالم', 'On track'), value: fa(counts.green), tone: 'green' },
            { label: L('میانگین پیشرفت', 'Avg. progress'), value: `${fa(Math.round(live.reduce((a, p) => a + metrics.get(p.id)!.progress, 0) / n))}%` },
            { label: L('میانگین زمان سپری‌شده', 'Avg. time elapsed'), value: `${fa(Math.round(live.reduce((a, p) => a + metrics.get(p.id)!.elapsed, 0) / n))}%` },
            { label: L('میانگین امتیاز سلامت', 'Avg. health score'), value: fa(Math.round(live.reduce((a, p) => a + metrics.get(p.id)!.score, 0) / n)) },
          ]}
        />
      </div>
    </div>
  )
}

/** Progress ring with an elapsed-time tick. */
function ProgressDial({ progress, elapsed, h, size = 132 }: { progress: number; elapsed: number; h: Health; size?: number }) {
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const ang = (elapsed / 100) * 360 - 90
  const rad = (ang * Math.PI) / 180
  const cx0 = size / 2
  const tick = (k: number) => [cx0 + Math.cos(rad) * (r + k), cx0 + Math.sin(rad) * (r + k)]
  const [x1, y1] = tick(-9)
  const [x2, y2] = tick(9)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx0} cy={cx0} r={r} stroke="rgb(var(--muted))" strokeWidth={10} fill="none" />
      <circle cx={cx0} cy={cx0} r={r} stroke={HC[h]} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress / 100)} transform={`rotate(-90 ${cx0} ${cx0})`} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(var(--ink))" strokeWidth={2.5} strokeLinecap="round" />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-ink" style={{ fontSize: size * 0.22, fontWeight: 700 }}>
        {fa(progress)}%
      </text>
      <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle" className="fill-sub" style={{ fontSize: size * 0.085 }}>
        {L(`زمان ${fa(elapsed)}٪`, `time ${elapsed}%`)}
      </text>
    </svg>
  )
}

function Tile({ p, m }: { p: Project; m: ProjectMetrics }) {
  const { db } = useStore()
  const ms = db.Milestones.filter((x) => x.project_id === p.id).sort((a, b) => (a.planned_date < b.planned_date ? -1 : 1))
  const today = todayISO()
  const span = Math.max(1, daysBetween(p.start_date, p.end_date))
  const pos = (iso: string) => Math.max(0, Math.min(100, (daysBetween(p.start_date, iso) / span) * 100))
  const prod = trackStats(db, 'product', p.id)
  const tech = trackStats(db, 'tech', p.id)
  const glow = m.health === 'red' ? 'rgb(190 32 56 / .10)' : m.health === 'amber' ? 'rgb(176 118 0 / .10)' : 'rgb(22 122 77 / .08)'
  return (
    <Link to={`/projects/${p.id}`} className="card card-hover group relative overflow-hidden p-5" style={{ backgroundImage: `radial-gradient(420px 220px at 100% 0%, ${glow}, transparent 70%)` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[0.6875rem]">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sub" dir="ltr">{p.code}</span>
            <span className="font-medium" style={{ color: HC[m.health] }}>
              {lbl(HEALTH, m.health)}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[1.0625rem] font-semibold leading-snug">{p.name}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-sub">
            <Avatar name={p.owner} size="xs" /> {p.owner}
          </div>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold num" style={{ background: glow, color: HC[m.health] }} title={L('امتیاز سلامت', 'Health score')}>
          {fa(m.score)}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <ProgressDial progress={m.progress} elapsed={m.elapsed} h={m.health} size={120} />
        <dl className="min-w-0 flex-1 space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-sub">{L('ددلاین', 'Deadline')}</dt>
            <dd className={cx('font-medium num', m.daysLeft < 0 && 'text-bad')}>{relDays(p.end_date)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-sub">{L('بودجه', 'Budget')}</dt>
            <dd className={cx('font-medium num', m.budgetUse > 100 && 'text-bad')}>{fa(m.budgetUse)}%</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-sub">{L('ریسک باز', 'Open risks')}</dt>
            <dd className={cx('font-medium num', m.highRisks > 0 && 'text-bad')}>{fa(m.openRisks)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-sub">{L('تسک باز', 'Open tasks')}</dt>
            <dd className="font-medium num">{fa(m.openTasks)}</dd>
          </div>
        </dl>
      </div>

      {/* milestone track with today marker */}
      <div className="relative mt-5 h-6">
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded bg-line" />
        <div className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded" style={{ insetInlineStart: 0, width: `${pos(today)}%`, background: HC[m.health] }} />
        {ms.map((x) => (
          <span
            key={x.id}
            title={`${x.title} · ${fmtDayMonth(x.planned_date)}`}
            className={cx('absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[2px] ring-2 ring-surface', x.status === 'done' ? 'bg-good' : x.planned_date < today ? 'bg-bad' : 'bg-ink/70')}
            style={{ insetInlineStart: `calc(${pos(x.planned_date)}% - 5px)` }}
          />
        ))}
        <span className="absolute top-0 h-6 w-[2px] rounded bg-ink" style={{ insetInlineStart: `${pos(today)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[0.625rem] text-sub num">
        <span>{fmtDayMonth(p.start_date)}</span>
        <span>{fmtDayMonth(p.end_date)}</span>
      </div>

      {(prod.total > 0 || tech.total > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {([['product', prod], ['tech', tech]] as const).map(([tr, st]) => (
            <div key={tr}>
              <div className="mb-1 flex justify-between text-[0.625rem] text-sub">
                <span>{lbl(TRACK, tr)}</span>
                <span className="num">{fa(st.pct)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className={cx('h-full rounded-full', trackDot[tr])} style={{ width: `${st.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {m.reasons[0] && m.health !== 'green' && <div className="mt-4 line-clamp-2 rounded-xl bg-muted/70 px-3 py-2 text-[0.6875rem] leading-5 text-ink/80">{m.reasons[0].text}</div>}
    </Link>
  )
}

function Matrix({ live, metrics }: { live: Project[]; metrics: Map<string, ProjectMetrics> }) {
  const W = 640
  const H = 420
  const pad = 36
  const rtl = locale.lang === 'fa'
  const pts = live.map((p) => {
    const m = metrics.get(p.id)!
    return { p, m, x: m.scheduleGap, y: m.progress - m.budgetUse, b: Number(p.budget) || 0 }
  })
  const lim = Math.max(12, ...pts.map((q) => Math.max(Math.abs(q.x), Math.abs(q.y)))) * 1.3
  const maxB = Math.max(1, ...pts.map((q) => q.b))
  const sx = (v: number) => {
    const t = (v + lim) / (2 * lim)
    return pad + (rtl ? 1 - t : t) * (W - 2 * pad)
  }
  const sy = (v: number) => pad + (1 - (v + lim) / (2 * lim)) * (H - 2 * pad)
  const q = [
    { x: 1, y: 1, t: L('جلوتر و کم‌هزینه', 'Ahead & under cost'), c: 'rgb(var(--good) / .06)' },
    { x: -1, y: 1, t: L('عقب از زمان', 'Behind schedule'), c: 'rgb(var(--warn) / .07)' },
    { x: 1, y: -1, t: L('پرهزینه', 'Over spending'), c: 'rgb(var(--warn) / .07)' },
    { x: -1, y: -1, t: L('عقب و پرهزینه', 'Behind & over cost'), c: 'rgb(var(--bad) / .07)' },
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="portfolio matrix">
      {q.map((k) => {
        const x0 = sx(k.x > 0 ? 0 : -lim)
        const x1 = sx(k.x > 0 ? lim : 0)
        const y0 = sy(k.y > 0 ? lim : 0)
        const y1 = sy(k.y > 0 ? 0 : -lim)
        const left = Math.min(x0, x1)
        return (
          <g key={k.t}>
            <rect x={left} y={y0} width={Math.abs(x1 - x0)} height={y1 - y0} fill={k.c} rx={14} />
            <text x={k.x > 0 !== rtl ? left + Math.abs(x1 - x0) - 12 : left + 12} y={k.y > 0 ? y0 + 22 : y1 - 12} textAnchor={k.x > 0 !== rtl ? 'end' : 'start'} className="fill-sub" style={{ fontSize: 12 }}>
              {k.t}
            </text>
          </g>
        )
      })}
      <line x1={sx(0)} y1={pad} x2={sx(0)} y2={H - pad} stroke="rgb(var(--line-strong))" strokeDasharray="4 4" />
      <line x1={pad} y1={sy(0)} x2={W - pad} y2={sy(0)} stroke="rgb(var(--line-strong))" strokeDasharray="4 4" />
      {pts.map(({ p, m, x, y, b }) => {
        const r = 12 + Math.sqrt(b / maxB) * 26
        return (
          <g key={p.id} className="cursor-pointer" onClick={() => (window.location.hash = `#/projects/${p.id}`)}>
            <circle cx={sx(x)} cy={sy(y)} r={r} fill={HC[m.health]} fillOpacity={0.22} stroke={HC[m.health]} strokeWidth={2}>
              <title>{`${p.name}: ${x}% / ${y}%`}</title>
            </circle>
            <text x={sx(x)} y={sy(y)} textAnchor="middle" dominantBaseline="middle" className="fill-ink" style={{ fontSize: 11, fontWeight: 700 }} direction="ltr">
              {p.code.replace('ACG-', '')}
            </text>
          </g>
        )
      })}
      <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-sub" style={{ fontSize: 11 }}>
        {L('← عقب از زمان  ·  جلوتر از زمان →', '← behind schedule  ·  ahead of schedule →')}
      </text>
    </svg>
  )
}

function Race({ live, metrics }: { live: Project[]; metrics: Map<string, ProjectMetrics> }) {
  const rows = [...live].sort((a, b) => metrics.get(a.id)!.scheduleGap - metrics.get(b.id)!.scheduleGap)
  return (
    <div className="space-y-5">
      {rows.map((p) => {
        const m = metrics.get(p.id)!
        return (
          <Link key={p.id} to={`/projects/${p.id}`} className="group block">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <HealthDot h={m.health} />
                <span className="truncate font-medium group-hover:underline">{p.name}</span>
                <span className="hidden text-xs text-sub @md:inline">· {lbl(PROJECT_STATUS, p.status)}</span>
              </span>
              <span className={cx('shrink-0 text-xs font-semibold num', m.scheduleGap < -10 ? 'text-bad' : m.scheduleGap < 0 ? 'text-warn' : 'text-good')} dir="ltr">
                {m.scheduleGap > 0 ? '+' : ''}
                {m.scheduleGap}%
              </span>
            </div>
            <div className="relative h-7 overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 start-0 rounded-full bg-ink/[0.10]" style={{ width: `${m.elapsed}%` }} />
              <div className="absolute inset-y-1 start-1 rounded-full transition-[width] duration-700" style={{ width: `calc(${m.progress}% - 0.5rem)`, background: HC[m.health] }} />
              <span className="absolute inset-y-0 w-[2px] bg-ink" style={{ insetInlineStart: `${m.elapsed}%` }} />
              <span className="absolute inset-y-0 start-3 flex items-center text-[0.6875rem] font-semibold text-white num">{fa(m.progress)}%</span>
            </div>
          </Link>
        )
      })}
      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3 text-[0.6875rem] text-sub">
        <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-good" /> {L('پیشرفت کار', 'Delivered')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-ink/10" /> {L('زمان سپری‌شده', 'Time elapsed')}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-[2px] bg-ink" /> {L('امروز روی تایم‌لاین پروژه', 'Today on the project timeline')}</span>
      </div>
    </div>
  )
}

function BudgetShare({ live, metrics }: { live: Project[]; metrics: Map<string, ProjectMetrics> }) {
  const total = live.reduce((a, p) => a + (Number(p.budget) || 0), 0) || 1
  const rows = [...live].filter((p) => Number(p.budget) > 0).sort((a, b) => Number(b.budget) - Number(a.budget))
  return (
    <div>
      <div className="flex h-16 gap-1 overflow-hidden rounded-2xl">
        {rows.map((p) => {
          const m = metrics.get(p.id)!
          const w = (Number(p.budget) / total) * 100
          return (
            <Link key={p.id} to={`/projects/${p.id}`} title={`${p.name} · ${money(p.budget)}`} className="relative h-full min-w-[1.5rem] overflow-hidden rounded-xl transition hover:brightness-110" style={{ width: `${w}%`, background: `color-mix(in srgb, ${HC[m.health]} 22%, transparent)` }}>
              <div className="absolute inset-x-0 bottom-0" style={{ height: `${Math.min(100, m.budgetUse)}%`, background: HC[m.health], opacity: 0.75 }} />
              <span className="absolute inset-x-0 top-1.5 truncate px-1.5 text-center font-mono text-[0.625rem] font-semibold text-ink" dir="ltr">
                {p.code.replace('ACG-', '')}
              </span>
            </Link>
          )
        })}
      </div>
      <div className="mt-2 text-[0.6875rem] text-sub">{L('عرض = سهم از بودجه · ارتفاع رنگ = درصد مصرف‌شده', 'Width = share of budget · fill height = % spent')}</div>
      <div className="mt-4 grid gap-x-6 gap-y-2 @md:grid-cols-2">
        {rows.map((p) => {
          const m = metrics.get(p.id)!
          return (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <HealthDot h={m.health} />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-sub num">{money(p.budget)}</span>
              <span className={cx('w-10 text-end font-semibold num', m.budgetUse > 100 && 'text-bad')}>{fa(m.budgetUse)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HealthHeat({ live }: { live: Project[] }) {
  const { db } = useStore()
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(todayISO(), -7 * (5 - i))), [])
  const cell = (pid: string, wk: string) => {
    const end = addDays(wk, 7)
    return db.Updates.filter((u) => u.project_id === pid && u.week_date >= addDays(wk, -1) && u.week_date < end).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))[0]
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="th !px-1" />
            {weeks.map((w) => (
              <th key={w} className="th !px-1 text-center font-normal num">
                {fmtDayMonth(w)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {live.map((p) => (
            <tr key={p.id}>
              <td className="max-w-[10rem] truncate pe-2 text-xs">{p.name}</td>
              {weeks.map((w) => {
                const u = cell(p.id, w)
                return (
                  <td key={w} className="p-0">
                    <div className="h-8 rounded-lg" style={{ background: u ? HC[u.health] : 'rgb(var(--muted))', opacity: u ? 0.85 : 1 }} title={u ? `${fmtDate(u.week_date)} · ${lbl(HEALTH, u.health)} — ${u.summary}` : L('بدون گزارش', 'No update')} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[0.6875rem] text-sub">{L('هر خانه = گزارش هفتگی آن هفته؛ خاکستری یعنی گزارشی ثبت نشده.', 'Each cell is that week’s update; grey means none was posted.')}</div>
    </div>
  )
}

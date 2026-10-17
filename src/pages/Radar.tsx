// Radar (رادار) — the tracking desk of the program manager, the CEO and the heads: every task they
// follow or handed to someone, sorted by what needs a nudge, plus this week's project deliveries.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, Radar as RadarIcon, UserRound } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Avatar, Band, Card, Due, Empty, Overlap, Segmented, StatStrip, StatusIcon, cx } from '../components/ui'
import { DeliveredButton, stateTone } from '../components/DeliveryDay'
import { DAYS, DELIVERY_STATE, deliveryDate, deliveryState, hasDeliveryDay } from '../lib/cadence'
import { bucketOf, isLate, nextDate, tracking, type Bucket } from '../lib/radar'
import { fa, fmtDate, fmtDayMonth, relDays, todayISO } from '../lib/jalali'
import { L, lbl, tr } from '../lib/i18n'
import { usePref } from '../lib/prefs'
import type { Task } from '../lib/types'

const BUCKETS: { id: Bucket; label: () => string; tone: string }[] = [
  { id: 'late', label: () => L('عقب افتاده', 'Late'), tone: 'text-bad' },
  { id: 'today', label: () => L('امروز', 'Today'), tone: 'text-warn' },
  { id: 'blocked', label: () => L('مسدود', 'Blocked'), tone: 'text-bad' },
  { id: 'week', label: () => L('۷ روز آینده', 'Next 7 days'), tone: 'text-ink' },
  { id: 'later', label: () => L('بعداً / بدون تاریخ', 'Later / undated'), tone: 'text-sub' },
]

export default function Radar() {
  const { db, me } = useStore()
  const { open } = useEditor()
  const [scope, setScope] = usePref<'mine' | 'all'>('acg.radar.scope', 'mine')
  const [who, setWho] = useState('')
  const today = todayISO()

  const pool = useMemo(() => db.Tasks.filter((t) => t.status !== 'done' && (scope === 'all' || tracking(t, me))), [db.Tasks, scope, me])
  const list = pool.filter((t) => !who || t.assignee === who)
  const people = useMemo(() => {
    const m = new Map<string, { open: number; late: number }>()
    pool.forEach((t) => {
      const k = t.assignee || ''
      const v = m.get(k) || { open: 0, late: 0 }
      v.open++
      if (isLate(t, today)) v.late++
      m.set(k, v)
    })
    return [...m.entries()].sort((a, b) => b[1].late - a[1].late || b[1].open - a[1].open)
  }, [pool, today])
  const by = (b: Bucket) => list.filter((t) => bucketOf(t, today) === b)

  const deliveries = db.Projects.filter(hasDeliveryDay).sort((a, b) => deliveryDate(a).localeCompare(deliveryDate(b)))
  const dueToday = deliveries.filter((p) => deliveryState(p) === 'today').length
  const missed = deliveries.filter((p) => deliveryState(p) === 'missed').length

  return (
    <>
      <Band
        eyebrow={
          <span className="flex items-center gap-1.5">
            <RadarIcon size={12} /> {L('پیگیری', 'Tracking')}
          </span>
        }
        title={L('رادار', 'Radar')}
        sub={L('هر کاری که پیگیرش هستید یا به کسی سپرده‌اید، و تحویل‌های هفتگی پروژه‌ها — یکجا.', 'Everything you follow or handed to someone, and this week’s project deliveries — in one place.')}
        actions={<Segmented dark value={scope} onChange={setScope} options={[{ value: 'mine', label: L('پیگیری‌های من', 'My tracking') }, { value: 'all', label: L('همه‌ی تیم', 'Whole team') }]} />}
      >
        <StatStrip
          items={[
            { label: L('در رادار', 'On the radar'), value: fa(pool.length) },
            { label: L('عقب افتاده', 'Late'), value: fa(pool.filter((t) => isLate(t, today)).length), tone: pool.some((t) => isLate(t, today)) ? 'red' : undefined },
            { label: L('امروز', 'Today'), value: fa(pool.filter((t) => bucketOf(t, today) === 'today').length), tone: 'amber' },
            { label: L('مسدود', 'Blocked'), value: fa(pool.filter((t) => t.status === 'blocked').length) },
            { label: L('تحویل پروژه امروز', 'Project deliveries today'), value: fa(dueToday), tone: dueToday ? 'amber' : undefined },
            { label: L('تحویل‌نشده این هفته', 'Missed this week'), value: fa(missed), tone: missed ? 'red' : undefined },
          ]}
        />
      </Band>
      <Overlap>
        <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            {people.length > 1 && (
              <div className="card flex flex-wrap items-center gap-1.5 p-3">
                <button aria-pressed={!who} className="chip-btn" onClick={() => setWho('')}>
                  {L('همه', 'Everyone')} · {fa(pool.length)}
                </button>
                {people.map(([name, v]) => (
                  <button key={name || '-'} aria-pressed={who === name && !!name} className="chip-btn inline-flex items-center gap-1.5" onClick={() => setWho(who === name ? '' : name)}>
                    {name ? <Avatar name={name} size="xs" /> : <UserRound size={12} />}
                    {name || L('بدون مسئول', 'Unassigned')} · {fa(v.open)}
                    {v.late > 0 && <span className="text-bad">({fa(v.late)})</span>}
                  </button>
                ))}
              </div>
            )}
            {!list.length ? (
              <Card>
                <Empty text={scope === 'mine' ? L('چیزی در رادار شما نیست. در هر تسک «پیگیری در رادار من» را بزنید، یا تسکی به کسی بسپارید.', 'Nothing on your radar. Press “Track on my Radar” on any task, or hand a task to someone.') : L('تسک بازی نیست', 'No open tasks')} />
              </Card>
            ) : (
              BUCKETS.map((b) => {
                const rows = by(b.id)
                if (!rows.length) return null
                return (
                  <Card key={b.id} pad={false} title={<span className={b.tone}>{b.label()} · {fa(rows.length)}</span>}>
                    <ul className="divide-y divide-line">
                      {rows.map((t) => (
                        <RadarRow key={t.id} t={t} onOpen={() => open('Tasks', t as never)} />
                      ))}
                    </ul>
                  </Card>
                )
              })
            )}
          </div>

          <Card
            eyebrow={
              <span className="flex items-center gap-1.5">
                <PackageCheck size={12} /> {L('این هفته', 'This week')}
              </span>
            }
            title={L('روز تحویل پروژه‌ها', 'Project delivery days')}
            className="self-start"
          >
            {!deliveries.length ? (
              <p className="text-xs leading-6 text-sub">{L('هنوز برای هیچ پروژه‌ای روز تحویل هفتگی تعیین نشده. در ویرایش پروژه «روز تحویل هفتگی» را انتخاب کنید.', 'No project has a weekly delivery day yet. Pick one in the project’s edit form.')}</p>
            ) : (
              <ul className="space-y-2">
                {deliveries.map((p) => {
                  const st = deliveryState(p) || 'upcoming'
                  return (
                    <li key={p.id} className={cx('flex items-center gap-3 rounded-2xl border px-3 py-2.5', st === 'missed' ? 'border-bad/30' : st === 'today' ? 'border-warn/40' : 'border-line')}>
                      <div className="w-12 shrink-0 text-center">
                        <div className="text-[0.625rem] text-sub">{tr(DAYS[Number(p.delivery_day)])}</div>
                        <div className="text-sm font-semibold num">{fmtDayMonth(deliveryDate(p))}</div>
                      </div>
                      <Link to={`/projects/${p.id}`} className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium" dir="auto">{p.name}</div>
                        <div className="truncate text-[0.6875rem] text-sub">{p.owner || '—'}{p.last_delivery ? ` · ${L('آخرین تحویل', 'last')} ${fmtDate(p.last_delivery)}` : ''}</div>
                      </Link>
                      <span className={cx('rounded-full px-2 text-[0.625rem] font-medium leading-5', stateTone[st])}>{lbl(DELIVERY_STATE, st)}</span>
                      <DeliveredButton p={p} small />
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </Overlap>
    </>
  )
}

function RadarRow({ t, onOpen }: { t: Task; onOpen: () => void }) {
  const { db } = useStore()
  const n = nextDate(t)
  const code = db.Projects.find((p) => p.id === t.project_id)?.code
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-5 py-3 text-start transition hover:bg-muted/40">
        <StatusIcon s={t.status} size={15} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{t.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-sub">
            {code && <span className="font-mono uppercase" dir="ltr">{code}</span>}
            {t.area && <span>{t.area}</span>}
            {n && (
              <span className={cx(n.d < todayISO() && 'text-bad')}>
                {n.label} · {relDays(n.d)}
              </span>
            )}
          </div>
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-sub sm:flex">
          <Avatar name={t.assignee} size="xs" /> {t.assignee || L('بدون مسئول', 'Unassigned')}
        </span>
        <Due iso={t.deadline || t.due_date} done={false} />
      </button>
    </li>
  )
}

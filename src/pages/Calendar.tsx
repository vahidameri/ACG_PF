import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Flag, BellRing, Zap } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Band, Card, Overlap, cx, StatusIcon, Segmented, FilterSelect, Toolbar } from '../components/ui'
import {
  fa, todayISO, parseISO, toISO, isoToJalaliParts, jalaliPartsToISO, jalaliMonthLength, weekdayIndex, J_MONTHS, J_MONTHS_EN, G_MONTHS_EN, G_MONTHS_FA,
  dayNum, fmtWeekday, fmtDate, addDays,
} from '../lib/jalali'
import { L, locale } from '../lib/i18n'

type Kind = 'all' | 'tasks' | 'followups' | 'milestones'

/** Month grid of everything with a date: tasks, follow-ups, milestones and sprint spans. */
export default function CalendarPage() {
  const { db, me } = useStore()
  const { open } = useEditor()
  const today = todayISO()
  const jalali = locale.cal === 'jalali'
  const en = locale.lang === 'en'
  const init = () => {
    if (jalali) {
      const p = isoToJalaliParts(today)!
      return { y: p.jy, m: p.jm }
    }
    const d = parseISO(today)!
    return { y: d.getFullYear(), m: d.getMonth() + 1 }
  }
  const [view, setView] = useState(init)
  const [kind, setKind] = useState<Kind>('all')
  const [who, setWho] = useState('')
  const [project, setProject] = useState('')
  const [sel, setSel] = useState(today)

  const { cells, title } = useMemo(() => {
    let days: string[]
    let offset: number
    if (jalali) {
      const len = jalaliMonthLength(view.y, view.m)
      days = Array.from({ length: len }, (_, i) => jalaliPartsToISO(view.y, view.m, i + 1))
      offset = weekdayIndex(parseISO(days[0])!)
    } else {
      const len = new Date(view.y, view.m, 0).getDate()
      days = Array.from({ length: len }, (_, i) => toISO(new Date(view.y, view.m - 1, i + 1)))
      const first = parseISO(days[0])!
      offset = en ? (first.getDay() + 6) % 7 : weekdayIndex(first)
    }
    const lead = Array.from({ length: offset }, (_, i) => addDays(days[0], i - offset))
    const total = Math.ceil((lead.length + days.length) / 7) * 7
    const trail = Array.from({ length: total - lead.length - days.length }, (_, i) => addDays(days[days.length - 1], i + 1))
    const title = jalali ? `${(en ? J_MONTHS_EN : J_MONTHS)[view.m - 1]} ${fa(view.y)}` : `${(en ? G_MONTHS_EN : G_MONTHS_FA)[view.m - 1]} ${fa(view.y)}`
    return { cells: [...lead.map((d) => ({ d, out: true })), ...days.map((d) => ({ d, out: false })), ...trail.map((d) => ({ d, out: true }))], title }
  }, [view, jalali, en])

  const weekdays = en && !jalali ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : en ? ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

  const pass = (pid: string, person?: string) => (!project || pid === project) && (!who || person === who)
  const itemsOn = (d: string) => ({
    tasks: kind === 'all' || kind === 'tasks' ? db.Tasks.filter((t) => t.due_date === d && pass(t.project_id, t.assignee)) : [],
    fus: kind === 'all' || kind === 'followups' ? db.FollowUps.filter((f) => f.due_date === d && f.status !== 'done' && pass(f.project_id)) : [],
    ms: kind === 'all' || kind === 'milestones' ? db.Milestones.filter((m) => m.planned_date === d && pass(m.project_id, m.owner)) : [],
    sprintStarts: kind === 'all' ? db.Sprints.filter((s) => s.start_date === d && pass(s.project_id)) : [],
  })

  const move = (delta: number) => {
    let m = view.m + delta
    let y = view.y
    if (m < 1) {
      m = 12
      y--
    }
    if (m > 12) {
      m = 1
      y++
    }
    setView({ y, m })
  }
  const Prev = locale.lang === 'fa' ? ChevronRight : ChevronLeft
  const Next = locale.lang === 'fa' ? ChevronLeft : ChevronRight
  const selItems = itemsOn(sel)
  const pcode = (id: string) => db.Projects.find((p) => p.id === id)?.code.replace('ACG-', '') || ''
  const people = Array.from(new Set(db.Tasks.map((t) => t.assignee).filter(Boolean)))

  return (
    <>
      <Band
        eyebrow={<span>{L('برنامه‌ریزی / تقویم', 'Planning / Calendar')}</span>}
        title={L('تقویم پورتفولیو', 'Portfolio calendar')}
        sub={L('سررسید تسک‌ها، فالوآپ‌ها، مایلستون‌ها و شروع اسپرینت‌ها در یک نگاه.', 'Task due dates, follow-ups, milestones and sprint starts at a glance.')}
        actions={
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button className="icon-btn text-white/80 hover:bg-white/10 hover:text-white" onClick={() => move(-1)}>
              <Prev size={18} />
            </button>
            <span className="min-w-[9rem] text-center text-sm font-semibold text-white">{title}</span>
            <button className="icon-btn text-white/80 hover:bg-white/10 hover:text-white" onClick={() => move(1)}>
              <Next size={18} />
            </button>
            <button className="btn h-8 bg-white px-3 text-xs text-band" onClick={() => { setView(init()); setSel(today) }}>
              {L('امروز', 'Today')}
            </button>
          </div>
        }
      />
      <Overlap>
        <div className="card mb-4 p-3">
          <Toolbar className="!mb-0">
            <Segmented value={kind} onChange={setKind} options={[{ value: 'all', label: L('همه', 'All') }, { value: 'tasks', label: L('تسک', 'Tasks') }, { value: 'followups', label: L('فالوآپ', 'Follow-ups') }, { value: 'milestones', label: L('مایلستون', 'Milestones') }]} />
            <FilterSelect value={project} onChange={setProject} placeholder={L('همه‌ی پروژه‌ها', 'All projects')} options={db.Projects.map((p) => ({ value: p.id, label: p.name }))} />
            <FilterSelect value={who} onChange={setWho} placeholder={L('همه‌ی افراد', 'Everyone')} options={people.map((p) => ({ value: p, label: p === me ? `${p} (${L('من', 'me')})` : p }))} />
          </Toolbar>
        </div>

        {/* Narrow screens: agenda list of the month's days that have something on them */}
        <div className="space-y-3 @lg:hidden">
          {cells
            .filter((c) => !c.out)
            .map(({ d }) => {
              const it = itemsOn(d)
              const n = it.tasks.length + it.fus.length + it.ms.length + it.sprintStarts.length
              if (!n && d !== today) return null
              return (
                <div key={d} className={cx('card p-4', d === today && 'ring-2 ring-ink')}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="display text-2xl num">{fa(dayNum(d))}</span>
                    <span className="text-sm text-sub">{fmtWeekday(d)}</span>
                    {d === today && <span className="chip ms-auto bg-ink text-surface">{L('امروز', 'Today')}</span>}
                  </div>
                  {n === 0 ? (
                    <div className="text-xs text-sub">{L('برنامه‌ای نیست', 'Nothing scheduled')}</div>
                  ) : (
                    <div className="space-y-0.5">
                      {it.ms.map((m) => <Row key={m.id} onClick={() => open('Milestones', m as never)} icon={<Flag size={14} className="text-bad" />} title={m.title} sub={db.Projects.find((p) => p.id === m.project_id)?.name} />)}
                      {it.sprintStarts.map((x) => <Row key={x.id} icon={<Zap size={14} className="text-brand" />} title={x.name} sub={x.goal} />)}
                      {it.fus.map((f) => <Row key={f.id} onClick={() => open('FollowUps', f as never)} icon={<BellRing size={14} className="text-warn" />} title={f.subject} sub={f.person} />)}
                      {it.tasks.map((t) => <Row key={t.id} onClick={() => open('Tasks', t as never)} icon={<StatusIcon s={t.status} size={14} />} title={t.title} sub={t.assignee} />)}
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        <div className="hidden gap-4 @lg:grid @2xl:grid-cols-[1fr_22rem]">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-line">
              {weekdays.map((w) => (
                <div key={w} className="eyebrow px-3 py-3 text-center">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map(({ d, out }) => {
                const it = itemsOn(d)
                const all = [
                  ...it.ms.map((m) => ({ k: `m${m.id}`, el: <Pill key={m.id} tone={m.status === 'done' ? 'good' : m.planned_date < today ? 'bad' : 'ink'} icon={<Flag size={10} />} text={m.title} onClick={() => open('Milestones', m as never)} /> })),
                  ...it.sprintStarts.map((s) => ({ k: `s${s.id}`, el: <Pill key={s.id} tone="brand" icon={<Zap size={10} />} text={`${s.name} · ${pcode(s.project_id)}`} onClick={() => setSel(d)} /> })),
                  ...it.fus.map((f) => ({ k: `f${f.id}`, el: <Pill key={f.id} tone="warn" icon={<BellRing size={10} />} text={f.subject} onClick={() => open('FollowUps', f as never)} /> })),
                  ...it.tasks.map((t) => ({ k: `t${t.id}`, el: <Pill key={t.id} tone={t.status === 'done' ? 'muted' : 'plain'} icon={<StatusIcon s={t.status} size={10} />} text={t.title} done={t.status === 'done'} onClick={() => open('Tasks', t as never)} /> })),
                ]
                const isToday = d === today
                return (
                  <div
                    key={d}
                    onClick={() => setSel(d)}
                    className={cx('group min-h-[7.75rem] cursor-pointer border-b border-e border-line p-1.5 transition [&:nth-child(7n)]:border-e-0', out && 'bg-muted/40', sel === d && 'bg-brand-soft/20', 'hover:bg-muted/50')}
                  >
                    <div className="mb-1 flex items-center justify-between px-1">
                      <span className={cx('grid h-7 min-w-7 place-items-center rounded-full px-1 text-sm num', isToday ? 'bg-ink font-semibold text-surface' : out ? 'text-sub/50' : 'text-ink/80')}>{fa(dayNum(d))}</span>
                      {all.length > 3 && <span className="text-[0.625rem] text-sub num">+{fa(all.length - 3)}</span>}
                    </div>
                    <div className="space-y-0.5">{all.slice(0, 3).map((x) => x.el)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <Card eyebrow={fmtWeekday(sel)} title={fmtDate(sel, 'long')}>
            {selItems.tasks.length + selItems.fus.length + selItems.ms.length + selItems.sprintStarts.length === 0 ? (
              <div className="py-8 text-center text-sm text-sub">{L('برای این روز چیزی ثبت نشده', 'Nothing scheduled')}</div>
            ) : (
              <div className="space-y-5">
                {selItems.ms.length > 0 && (
                  <Group title={L('مایلستون', 'Milestones')}>
                    {selItems.ms.map((m) => (
                      <Row key={m.id} onClick={() => open('Milestones', m as never)} icon={<Flag size={14} className="text-bad" />} title={m.title} sub={db.Projects.find((p) => p.id === m.project_id)?.name} />
                    ))}
                  </Group>
                )}
                {selItems.sprintStarts.length > 0 && (
                  <Group title={L('شروع اسپرینت', 'Sprint starts')}>
                    {selItems.sprintStarts.map((s) => (
                      <Row key={s.id} icon={<Zap size={14} className="text-brand" />} title={s.name} sub={s.goal} />
                    ))}
                  </Group>
                )}
                {selItems.fus.length > 0 && (
                  <Group title={L('فالوآپ', 'Follow-ups')}>
                    {selItems.fus.map((f) => (
                      <Row key={f.id} onClick={() => open('FollowUps', f as never)} icon={<BellRing size={14} className="text-warn" />} title={f.subject} sub={f.person} />
                    ))}
                  </Group>
                )}
                {selItems.tasks.length > 0 && (
                  <Group title={L('تسک', 'Tasks')}>
                    {selItems.tasks.map((t) => (
                      <Row key={t.id} onClick={() => open('Tasks', t as never)} icon={<StatusIcon s={t.status} size={14} />} title={t.title} sub={t.assignee} />
                    ))}
                  </Group>
                )}
              </div>
            )}
          </Card>
        </div>
      </Overlap>
    </>
  )
}

const pillTone = {
  ink: 'bg-ink text-surface',
  bad: 'bg-bad text-white',
  good: 'bg-good/15 text-good',
  brand: 'bg-brand-soft/60 text-ink',
  warn: 'bg-warn/15 text-warn',
  plain: 'bg-surface border border-line text-ink',
  muted: 'bg-muted text-sub',
}
function Pill({ tone, icon, text, onClick, done }: { tone: keyof typeof pillTone; icon: React.ReactNode; text: string; onClick: () => void; done?: boolean }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={text}
      className={cx('flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-start text-[0.6875rem] leading-4 transition hover:brightness-95', pillTone[tone])}
    >
      <span className="shrink-0">{icon}</span>
      <span className={cx('truncate', done && 'line-through')}>{text}</span>
    </button>
  )
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
function Row({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-muted">
      <span className="mt-0.5">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm leading-5">{title}</span>
        {sub && <span className="block truncate text-[0.6875rem] text-sub">{sub}</span>}
      </span>
    </button>
  )
}

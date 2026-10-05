import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Band, Overlap, Segmented, Toolbar, FilterSelect, HealthDot, cx, healthColor, Avatar } from '../components/ui'
import { projectMetrics } from '../lib/metrics'
import { addDays, daysBetween, fa, fmtDate, isoToJalaliParts, jalaliPartsToISO, J_MONTHS, J_MONTHS_EN, G_MONTHS_EN, G_MONTHS_FA, parseISO, toISO, todayISO } from '../lib/jalali'
import { PROJECT_STATUS, options } from '../lib/labels'
import { L, locale, useI18n } from '../lib/i18n'

type Zoom = 'q' | 'h' | 'y' | 'all'

// Month boundaries in the active calendar.
function monthStart(iso: string) {
  if (locale.cal === 'jalali') {
    const j = isoToJalaliParts(iso)!
    return jalaliPartsToISO(j.jy, j.jm, 1)
  }
  const d = parseISO(iso)!
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1))
}
function nextMonth(iso: string) {
  if (locale.cal === 'jalali') {
    const j = isoToJalaliParts(iso)!
    return j.jm === 12 ? jalaliPartsToISO(j.jy + 1, 1, 1) : jalaliPartsToISO(j.jy, j.jm + 1, 1)
  }
  const d = parseISO(iso)!
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}
function isYearStart(iso: string) {
  return locale.cal === 'jalali' ? isoToJalaliParts(iso)!.jm === 1 : parseISO(iso)!.getMonth() === 0
}
function monthLabel(iso: string, withYear: boolean) {
  const en = locale.lang === 'en'
  if (locale.cal === 'jalali') {
    const j = isoToJalaliParts(iso)!
    return `${(en ? J_MONTHS_EN : J_MONTHS)[j.jm - 1]}${withYear ? ` ${fa(j.jy)}` : ''}`
  }
  const d = parseISO(iso)!
  return `${(en ? G_MONTHS_EN : G_MONTHS_FA)[d.getMonth()]}${withYear ? ` ${fa(d.getFullYear())}` : ''}`
}

export default function Roadmap() {
  const { db } = useStore()
  const { lang } = useI18n()
  const { open } = useEditor()
  const [zoom, setZoom] = useState<Zoom>('h')
  const [status, setStatus] = useState('')
  const [cat, setCat] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const today = todayISO()

  const projects = db.Projects.filter((p) => p.start_date && p.end_date && (status ? p.status === status : p.status !== 'cancelled') && (!cat || p.category === cat)).sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
  const cats = Array.from(new Set(db.Projects.map((p) => p.category).filter(Boolean)))

  const { from, to, months } = useMemo(() => {
    let f: string, t: string
    if (zoom === 'all') {
      f = projects.reduce((m, p) => (p.start_date < m ? p.start_date : m), today)
      t = projects.reduce((m, p) => (p.end_date > m ? p.end_date : m), today)
    } else {
      const span = zoom === 'q' ? 90 : zoom === 'h' ? 180 : 365
      f = addDays(today, -Math.round(span * 0.3))
      t = addDays(today, Math.round(span * 0.7))
    }
    const from = monthStart(f)
    const to = nextMonth(t)
    const months: { label: string; start: string; days: number }[] = []
    let cur = from
    while (cur < to) {
      const n = nextMonth(cur)
      months.push({ label: monthLabel(cur, months.length === 0 || isYearStart(cur)), start: cur, days: daysBetween(cur, n) })
      cur = n
    }
    return { from, to, months }
  }, [zoom, projects, today])

  const total = Math.max(1, daysBetween(from, to))
  const pos = (iso: string) => (Math.max(0, Math.min(total, daysBetween(from, iso))) / total) * 100
  const todayPos = pos(today)

  return (
    <>
      <Band eyebrow={<span>{L('پورتفولیو / رودمپ', 'Portfolio / Roadmap')}</span>} title={L('رودمپ پورتفولیو', 'Portfolio roadmap')} sub={L('تایم‌لاین همه‌ی پروژه‌ها و مایلستون‌ها. خط قرمز، امروز است.', 'Every project and milestone on one timeline. The red line is today.')} />
      <Overlap>
        <div className="card mb-4 p-3">
          <Toolbar className="!mb-0">
            <Segmented value={zoom} onChange={setZoom} options={[{ value: 'q', label: L('سه‌ماهه', 'Quarter') }, { value: 'h', label: L('شش‌ماهه', 'Half') }, { value: 'y', label: L('سالانه', 'Year') }, { value: 'all', label: L('کل', 'All') }]} />
            <FilterSelect value={status} onChange={setStatus} placeholder={L('همه‌ی وضعیت‌ها', 'Any status')} options={options(PROJECT_STATUS, lang)} />
            <FilterSelect value={cat} onChange={setCat} placeholder={L('دسته', 'Category')} options={cats.map((c) => ({ value: c, label: c }))} />
            <div className="ms-auto flex items-center gap-4 text-xs text-sub">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-good" /> {L('انجام‌شده', 'Done')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-ink" /> {L('آینده', 'Upcoming')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-bad" /> {L('معوق', 'Overdue')}</span>
            </div>
          </Toolbar>
        </div>

        <div className="card overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="flex border-b border-line">
              <div className="eyebrow w-72 shrink-0 border-e border-line px-5 py-3.5">{L('پروژه', 'Project')}</div>
              <div className="relative flex flex-1">
                {months.map((m) => (
                  <div key={m.start} className="truncate border-e border-line/70 px-2 py-3.5 text-xs text-sub last:border-e-0" style={{ width: `${(m.days / total) * 100}%` }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {projects.map((p) => {
              const m = projectMetrics(p, db)
              const ms = db.Milestones.filter((x) => x.project_id === p.id).sort((a, b) => (a.planned_date < b.planned_date ? -1 : 1))
              const s = pos(p.start_date)
              const e = pos(p.end_date)
              const visible = p.end_date >= from && p.start_date <= to
              const isOpen = expanded[p.id]
              return (
                <div key={p.id} className="border-b border-line last:border-b-0">
                  <div className="flex items-stretch transition hover:bg-muted/30">
                    <div className="flex w-72 shrink-0 items-center gap-2.5 border-e border-line px-3 py-3">
                      <button className="icon-btn h-7 w-7" onClick={() => setExpanded((x) => ({ ...x, [p.id]: !x[p.id] }))}>
                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} className="rtl:rotate-180" />}
                      </button>
                      <HealthDot h={m.health} />
                      <div className="min-w-0 flex-1">
                        <Link to={`/projects/${p.id}`} className="block truncate text-sm font-medium hover:underline">
                          {p.name}
                        </Link>
                        <div className="text-[11px] text-sub num">{fa(m.progress)}% · {p.owner}</div>
                      </div>
                      <Avatar name={p.owner} size="xs" />
                    </div>
                    <div className="relative flex-1 py-3">
                      <Grid months={months} total={total} />
                      {todayPos > 0 && todayPos < 100 && <div className="absolute inset-y-0 z-10 w-[2px] bg-bad/70" style={{ insetInlineStart: `${todayPos}%` }} />}
                      {visible && (
                        <div
                          className="absolute top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded-full bg-ink/[0.06] ring-1 ring-inset ring-line-strong"
                          style={{ insetInlineStart: `${s}%`, width: `${Math.max(0.8, e - s)}%` }}
                          title={`${p.name}: ${fmtDate(p.start_date)} — ${fmtDate(p.end_date)}`}
                        >
                          <div className={cx('h-full opacity-85', healthColor[m.health])} style={{ width: `${m.progress}%` }} />
                        </div>
                      )}
                      {ms.map((x) => {
                        if (x.planned_date < from || x.planned_date > to) return null
                        const late = x.status !== 'done' && x.planned_date < today
                        return (
                          <button
                            key={x.id}
                            onClick={() => open('Milestones', x as never)}
                            title={`${x.title} · ${fmtDate(x.planned_date)}`}
                            className={cx('absolute top-1/2 z-20 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[3px] ring-2 ring-surface transition hover:scale-125', x.status === 'done' ? 'bg-good' : late ? 'bg-bad' : 'bg-ink')}
                            style={{ insetInlineStart: `calc(${pos(x.planned_date)}% - 6px)` }}
                          />
                        )
                      })}
                    </div>
                  </div>
                  {isOpen &&
                    ms.map((x) => {
                      const late = x.status !== 'done' && x.planned_date < today
                      return (
                        <div key={x.id} className="flex items-stretch bg-muted/30">
                          <div className="w-72 shrink-0 border-e border-line py-2 pe-3 ps-14">
                            <button onClick={() => open('Milestones', x as never)} className="block truncate text-start text-xs hover:underline">
                              {x.title}
                            </button>
                            <div className={cx('text-[10px] num', late ? 'text-bad' : 'text-sub')}>{fmtDate(x.planned_date)}</div>
                          </div>
                          <div className="relative flex-1">
                            <Grid months={months} total={total} />
                            {x.planned_date >= from && x.planned_date <= to && (
                              <span className={cx('absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[2px]', x.status === 'done' ? 'bg-good' : late ? 'bg-bad' : 'bg-ink')} style={{ insetInlineStart: `calc(${pos(x.planned_date)}% - 5px)` }} />
                            )}
                            {x.actual_date && x.actual_date !== x.planned_date && x.actual_date >= from && x.actual_date <= to && (
                              <span
                                className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-bad/50"
                                style={{ insetInlineStart: `${Math.min(pos(x.planned_date), pos(x.actual_date))}%`, width: `${Math.abs(pos(x.actual_date) - pos(x.planned_date))}%` }}
                                title={L('جابه‌جایی نسبت به برنامه', 'Slip vs plan')}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </div>
      </Overlap>
    </>
  )
}

function Grid({ months, total }: { months: { start: string; days: number }[]; total: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex">
      {months.map((m) => (
        <div key={m.start} className="border-e border-line/50 last:border-e-0" style={{ width: `${(m.days / total) * 100}%` }} />
      ))}
    </div>
  )
}

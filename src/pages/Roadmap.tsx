import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { PageHeader, Segmented, Toolbar, FilterSelect, HealthDot, cx, healthColor } from '../components/ui'
import { projectMetrics } from '../lib/metrics'
import { addDays, daysBetween, fa, fmtDate, isoToJalaliParts, jalaliPartsToISO, J_MONTHS, todayISO } from '../lib/jalali'
import { PROJECT_STATUS } from '../lib/labels'

type Zoom = 'q' | 'h' | 'y' | 'all'

export default function Roadmap() {
  const { db } = useStore()
  const { open } = useEditor()
  const [zoom, setZoom] = useState<Zoom>('h')
  const [status, setStatus] = useState('')
  const [cat, setCat] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const today = todayISO()

  const projects = db.Projects.filter((p) => p.start_date && p.end_date && (status ? p.status === status : p.status !== 'cancelled') && (!cat || p.category === cat)).sort((a, b) =>
    a.start_date < b.start_date ? -1 : 1,
  )
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
    // snap to Jalali month boundaries
    const fj = isoToJalaliParts(f)!
    const from = jalaliPartsToISO(fj.jy, fj.jm, 1)
    const tj = isoToJalaliParts(t)!
    const nm = tj.jm === 12 ? { jy: tj.jy + 1, jm: 1 } : { jy: tj.jy, jm: tj.jm + 1 }
    const to = jalaliPartsToISO(nm.jy, nm.jm, 1)
    const months: { label: string; start: string; days: number }[] = []
    let cur = { jy: fj.jy, jm: fj.jm }
    while (jalaliPartsToISO(cur.jy, cur.jm, 1) < to) {
      const start = jalaliPartsToISO(cur.jy, cur.jm, 1)
      const n = cur.jm === 12 ? { jy: cur.jy + 1, jm: 1 } : { jy: cur.jy, jm: cur.jm + 1 }
      const end = jalaliPartsToISO(n.jy, n.jm, 1)
      months.push({ label: `${J_MONTHS[cur.jm - 1]}${cur.jm === 1 || months.length === 0 ? ` ${fa(cur.jy)}` : ''}`, start, days: daysBetween(start, end) })
      cur = n
    }
    return { from, to, months }
  }, [zoom, projects, today])

  const total = Math.max(1, daysBetween(from, to))
  const pos = (iso: string) => (Math.max(0, Math.min(total, daysBetween(from, iso))) / total) * 100
  const todayPos = pos(today)

  return (
    <>
      <PageHeader title="رودمپ پورتفولیو" sub="تایم‌لاین همه‌ی پروژه‌ها با مایلستون‌ها — خط عمودی، امروز است" />
      <Toolbar>
        <Segmented
          value={zoom}
          onChange={setZoom}
          options={[
            { value: 'q', label: 'سه ماهه' },
            { value: 'h', label: 'شش ماهه' },
            { value: 'y', label: 'سالانه' },
            { value: 'all', label: 'کل' },
          ]}
        />
        <FilterSelect value={status} onChange={setStatus} placeholder="همه‌ی وضعیت‌ها" options={Object.entries(PROJECT_STATUS).map(([value, label]) => ({ value, label }))} />
        <FilterSelect value={cat} onChange={setCat} placeholder="دسته" options={cats.map((c) => ({ value: c, label: c }))} />
        <div className="mr-auto flex items-center gap-4 text-xs text-sub">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-good" /> انجام‌شده</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-brand" /> آینده</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-bad" /> عقب‌افتاده</span>
        </div>
      </Toolbar>

      <div className="card overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="flex border-b border-line">
            <div className="w-64 shrink-0 border-l border-line px-4 py-3 text-xs font-semibold text-sub">پروژه</div>
            <div className="relative flex flex-1">
              {months.map((m) => (
                <div key={m.start} className="border-l border-line/70 px-2 py-3 text-xs text-sub last:border-l-0" style={{ width: `${(m.days / total) * 100}%` }}>
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
                <div className="flex items-stretch hover:bg-muted/30 transition">
                  <div className="flex w-64 shrink-0 items-center gap-2 border-l border-line px-3 py-3">
                    <button className="text-sub hover:text-ink" onClick={() => setExpanded((x) => ({ ...x, [p.id]: !x[p.id] }))}>
                      {isOpen ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}
                    </button>
                    <HealthDot h={m.health} />
                    <div className="min-w-0">
                      <Link to={`/projects/${p.id}`} className="block truncate text-sm font-medium hover:text-brand">
                        {p.name}
                      </Link>
                      <div className="text-[11px] text-sub">
                        {fa(m.progress)}٪ · {p.owner}
                      </div>
                    </div>
                  </div>
                  <div className="relative flex-1 py-3">
                    <Grid months={months} total={total} />
                    {todayPos > 0 && todayPos < 100 && <div className="absolute inset-y-0 z-10 w-px bg-bad/70" style={{ right: `${todayPos}%` }} />}
                    {visible && (
                      <div
                        className="absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-lg bg-muted ring-1 ring-line"
                        style={{ right: `${s}%`, width: `${Math.max(0.8, e - s)}%` }}
                        title={`${p.name}: ${fmtDate(p.start_date)} تا ${fmtDate(p.end_date)}`}
                      >
                        <div className={cx('h-full opacity-80', healthColor[m.health])} style={{ width: `${m.progress}%` }} />
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
                          className={cx('absolute top-1/2 z-20 h-3 w-3 -translate-y-1/2 translate-x-1/2 rotate-45 ring-2 ring-surface', x.status === 'done' ? 'bg-good' : late ? 'bg-bad' : 'bg-brand')}
                          style={{ right: `${pos(x.planned_date)}%` }}
                        />
                      )
                    })}
                  </div>
                </div>
                {isOpen &&
                  ms.map((x) => {
                    const late = x.status !== 'done' && x.planned_date < today
                    return (
                      <div key={x.id} className="flex items-stretch bg-muted/20">
                        <div className="w-64 shrink-0 border-l border-line py-2 pr-12 pl-3">
                          <button onClick={() => open('Milestones', x as never)} className="block truncate text-xs text-right hover:text-brand">
                            {x.title}
                          </button>
                          <div className={cx('text-[10px]', late ? 'text-bad' : 'text-sub')}>{fmtDate(x.planned_date)}</div>
                        </div>
                        <div className="relative flex-1">
                          <Grid months={months} total={total} />
                          {x.planned_date >= from && x.planned_date <= to && (
                            <span className={cx('absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rotate-45', x.status === 'done' ? 'bg-good' : late ? 'bg-bad' : 'bg-brand')} style={{ right: `${pos(x.planned_date)}%` }} />
                          )}
                          {x.actual_date && x.actual_date !== x.planned_date && x.actual_date >= from && x.actual_date <= to && (
                            <span
                              className="absolute top-1/2 h-px -translate-y-1/2 bg-bad/60"
                              style={{ right: `${Math.min(pos(x.planned_date), pos(x.actual_date))}%`, width: `${Math.abs(pos(x.actual_date) - pos(x.planned_date))}%` }}
                              title="جابجایی نسبت به برنامه"
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
    </>
  )
}

function Grid({ months, total }: { months: { start: string; days: number }[]; total: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex">
      {months.map((m) => (
        <div key={m.start} className="border-l border-line/40 last:border-l-0" style={{ width: `${(m.days / total) * 100}%` }} />
      ))}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { J_MONTHS, J_WEEKDAYS, fa, fmtDate, isoToJalaliParts, jalaliMonthLength, jalaliPartsToISO, parseISO, todayISO, weekdayIndex, addDays } from '../lib/jalali'
import { cx } from './ui'

/** Jalali date picker. value/onChange are ISO Gregorian (YYYY-MM-DD). */
export function DatePicker({ value, onChange, placeholder = 'انتخاب تاریخ' }: { value: string; onChange: (iso: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const base = isoToJalaliParts(value || todayISO())!
  const [view, setView] = useState({ jy: base.jy, jm: base.jm })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const p = isoToJalaliParts(value || todayISO())!
    setView({ jy: p.jy, jm: p.jm })
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const first = parseISO(jalaliPartsToISO(view.jy, view.jm, 1))!
  const offset = weekdayIndex(first)
  const len = jalaliMonthLength(view.jy, view.jm)
  const today = todayISO()
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)]

  const move = (delta: number) => {
    let jm = view.jm + delta
    let jy = view.jy
    if (jm < 1) {
      jm = 12
      jy--
    }
    if (jm > 12) {
      jm = 1
      jy++
    }
    setView({ jy, jm })
  }

  const pick = (iso: string) => {
    onChange(iso)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="input flex items-center justify-between text-right">
        <span className={cx('num', !value && 'text-sub/70')}>{value ? fmtDate(value, 'long') : placeholder}</span>
        <span className="flex items-center gap-1 text-sub">
          {value && (
            <span
              role="button"
              className="rounded p-0.5 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
            >
              <X size={14} />
            </span>
          )}
          <CalendarDays size={16} />
        </span>
      </button>
      {open && (
        <div className="absolute inset-x-0 z-30 mt-1.5 min-w-[15rem] rounded-2xl border border-line bg-surface p-3 shadow-pop fade-in">
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="btn-ghost h-8 w-8 px-0" onClick={() => move(-1)}>
              <ChevronRight size={16} />
            </button>
            <div className="text-sm font-semibold">
              {J_MONTHS[view.jm - 1]} {fa(view.jy)}
            </div>
            <button type="button" className="btn-ghost h-8 w-8 px-0" onClick={() => move(1)}>
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {J_WEEKDAYS.map((w) => (
              <div key={w} className="text-[11px] text-sub py-1">
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const iso = jalaliPartsToISO(view.jy, view.jm, d)
              const sel = iso === value
              const isToday = iso === today
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => pick(iso)}
                  className={cx(
                    'h-8 rounded-lg text-sm num transition',
                    sel ? 'bg-brand text-white font-semibold' : isToday ? 'ring-1 ring-brand text-brand font-semibold' : 'hover:bg-muted',
                    i % 7 === 6 && !sel && 'text-bad/80',
                  )}
                >
                  {fa(d)}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
            {[
              ['امروز', 0],
              ['فردا', 1],
              ['۳ روز', 3],
              ['یک هفته', 7],
              ['دو هفته', 14],
            ].map(([l, n]) => (
              <button type="button" key={l} className="chip bg-muted text-sub hover:text-ink hover:bg-line" onClick={() => pick(addDays(today, n as number))}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

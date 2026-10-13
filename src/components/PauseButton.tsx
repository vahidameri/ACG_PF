import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { Project } from '../lib/types'
import { useStore } from '../lib/store'
import { useAuto } from '../lib/automations'
import { Popover, cx } from './ui'
import { L } from '../lib/i18n'
import { addDays, daysBetween, fa, fmtDayMonth, fmtDate, todayISO } from '../lib/jalali'
import { fte } from '../lib/capacity'

/** Pause / resume a project. Pausing frees the team's capacity; resuming can shift the plan. */
export function PauseButton({ p, dark, compact }: { p: Project; dark?: boolean; compact?: boolean }) {
  const { db, canEdit } = useStore()
  const auto = useAuto()
  const [reason, setReason] = useState('')
  if (!canEdit || (p.status !== 'active' && p.status !== 'on_hold' && p.status !== 'planning')) return null
  const paused = p.status === 'on_hold'
  const t = todayISO()
  const allocs = db.Allocations.filter((a) => a.project_id === p.id && (!a.end_date || a.end_date >= t))
  const freed = allocs.reduce((s, a) => s + Number(a.percent || 0), 0)
  const people = new Set(allocs.map((a) => a.member_id)).size
  const days = p.paused_at ? Math.max(0, daysBetween(p.paused_at, t)) : 0
  const cls = dark
    ? 'btn h-10 border border-white/15 text-white hover:bg-white/10'
    : cx('btn-outline btn-sm', paused ? 'border-good/40 text-good' : '')
  return (
    <Popover
      width={300}
      align="end"
      trigger={({ toggle }) => (
        <button
          className={cx(cls, compact && '!h-8 !w-8 !p-0 justify-center')}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggle()
          }}
          title={paused ? L('ادامه‌ی پروژه', 'Resume project') : L('توقف پروژه', 'Pause project')}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
          {!compact && (paused ? L('ادامه', 'Resume') : L('توقف', 'Pause'))}
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-3 p-2.5" onClick={(e) => e.stopPropagation()}>
          {paused ? (
            <>
              <div className="text-sm font-semibold">{L(`ادامه‌ی ${p.name}`, `Resume ${p.name}`)}</div>
              <p className="text-xs leading-5 text-sub">
                {L(`${fa(days)} روز متوقف بوده`, `Paused for ${days} days`)}
                {p.pause_reason && ` — ${p.pause_reason}`}.
                {auto.on('pause_shift') && days > 0 && p.end_date && L(` ددلاین از ${fmtDayMonth(p.end_date)} به ${fmtDate(addDays(p.end_date, days))} می‌رود و مایلستون‌ها و تحویل‌های باز هم همین‌قدر جابجا می‌شوند.`, ` The deadline moves from ${fmtDayMonth(p.end_date)} to ${fmtDate(addDays(p.end_date, days))}, and open milestones and deliverables shift by the same amount.`)}
                {L(` ${fa(people)} نفر دوباره ${fa(fte(freed))} FTE روی پروژه می‌گذارند.`, ` ${people} people put ${fte(freed)} FTE back on it.`)}
              </p>
              <button className="btn-primary btn-sm w-full" onClick={() => (auto.resume(p), close())}>
                <Play size={14} /> {L('ادامه‌ی پروژه', 'Resume project')}
              </button>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold">{L(`توقف ${p.name}`, `Pause ${p.name}`)}</div>
              <p className="text-xs leading-5 text-sub">{L(`${fa(people)} نفر و ${fa(fte(freed))} FTE ظرفیت آزاد می‌شود و در صفحه‌ی ظرفیت دیده می‌شود. تخصیص‌ها حذف نمی‌شوند و با ادامه برمی‌گردند.`, `${people} people and ${fte(freed)} FTE are freed (visible on Capacity). Allocations are kept and come back on resume.`)}</p>
              <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={L('دلیل توقف (برای گزارش مدیریت)', 'Reason (for the leadership report)')} />
              <button className="btn-primary btn-sm w-full" onClick={() => (auto.pause(p, reason.trim()), close())}>
                <Pause size={14} /> {L('توقف پروژه', 'Pause project')}
              </button>
            </>
          )}
        </div>
      )}
    </Popover>
  )
}

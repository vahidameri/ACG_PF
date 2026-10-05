import { useEffect, type ReactNode } from 'react'
import { X, Inbox } from 'lucide-react'
import type { Health, Priority, TaskStatus } from '../lib/types'
import { HEALTH, PRIORITY, TASK_STATUS } from '../lib/labels'
import { daysFromToday, fa, fmtDayMonth, relDays } from '../lib/jalali'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export const healthColor: Record<Health, string> = { green: 'bg-good', amber: 'bg-warn', red: 'bg-bad' }
export const healthText: Record<Health, string> = { green: 'text-good', amber: 'text-warn', red: 'text-bad' }
export const healthSoft: Record<Health, string> = {
  green: 'bg-good/10 text-good',
  amber: 'bg-warn/12 text-warn',
  red: 'bg-bad/10 text-bad',
}

export function Card({ children, className, title, action, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {action}
        </header>
      )}
      <div className={cx(pad && 'px-5 pb-5', !title && pad && 'pt-5')}>{children}</div>
    </section>
  )
}

export function HealthDot({ h, pulse }: { h: Health; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
      {pulse && h === 'red' && <span className={cx('absolute inset-0 rounded-full opacity-60 animate-ping', healthColor[h])} />}
      <span className={cx('relative inline-flex h-2.5 w-2.5 rounded-full', healthColor[h])} />
    </span>
  )
}

export function HealthBadge({ h }: { h: Health }) {
  return (
    <span className={cx('chip', healthSoft[h])}>
      <HealthDot h={h} />
      {HEALTH[h]}
    </span>
  )
}

const prioStyle: Record<Priority, string> = {
  critical: 'bg-bad/10 text-bad',
  high: 'bg-warn/12 text-warn',
  medium: 'bg-brand/10 text-brand',
  low: 'bg-muted text-sub',
}
export function PriorityBadge({ p }: { p: Priority }) {
  return <span className={cx('chip', prioStyle[p] || prioStyle.medium)}>{PRIORITY[p] || p}</span>
}

const statusStyle: Record<TaskStatus, string> = {
  todo: 'bg-muted text-sub',
  in_progress: 'bg-brand/10 text-brand',
  review: 'bg-purple-500/10 text-purple-500',
  blocked: 'bg-bad/10 text-bad',
  done: 'bg-good/10 text-good',
}
export function TaskStatusBadge({ s }: { s: TaskStatus }) {
  return <span className={cx('chip', statusStyle[s])}>{TASK_STATUS[s]}</span>
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('chip bg-muted text-sub', className)}>{children}</span>
}

export function Due({ iso, done }: { iso: string; done?: boolean }) {
  if (!iso) return <span className="text-sub text-xs">—</span>
  const d = daysFromToday(iso)
  const cls = done ? 'text-sub' : d < 0 ? 'text-bad font-semibold' : d <= 2 ? 'text-warn font-medium' : 'text-sub'
  return (
    <span className={cx('text-xs whitespace-nowrap num', cls)} title={relDays(iso)}>
      {fmtDayMonth(iso)}
      {!done && d <= 2 && <span className="mr-1 opacity-80 hidden sm:inline">({relDays(iso)})</span>}
    </span>
  )
}

export function Progress({ value, h, className, marker }: { value: number; h?: Health; className?: string; marker?: number }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div className={cx('relative h-1.5 w-full rounded-full bg-muted overflow-visible', className)}>
      <div className={cx('h-full rounded-full transition-all duration-500', h ? healthColor[h] : 'bg-brand')} style={{ width: `${v}%` }} />
      {marker !== undefined && (
        <div className="absolute -top-1 h-3.5 w-0.5 rounded bg-ink/50" style={{ right: `${Math.max(0, Math.min(100, marker))}%` }} title={`زمان سپری‌شده: ${fa(Math.round(marker))}٪`} />
      )}
    </div>
  )
}

const avatarPalette = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500']
export function Avatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' | 'md' }) {
  if (!name) return null
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const s = size === 'xs' ? 'h-5 w-5 text-[10px]' : size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs'
  return (
    <span title={name} className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', s, avatarPalette[h % avatarPalette.length])}>
      {name.replace('دکتر ', '').trim().charAt(0)}
    </span>
  )
}

export function Person({ name }: { name: string }) {
  if (!name) return <span className="text-sub text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Avatar name={name} size="xs" />
      <span className="truncate">{name}</span>
    </span>
  )
}

export function Stat({ label, value, sub, icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: Health | 'brand' }) {
  const toneCls = tone === 'brand' ? 'bg-brand/10 text-brand' : tone ? healthSoft[tone] : 'bg-muted text-sub'
  return (
    <div className="card p-4 flex items-start gap-3">
      {icon && <div className={cx('rounded-xl p-2.5', toneCls)}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs text-sub">{label}</div>
        <div className="mt-0.5 text-2xl font-bold num tracking-tight">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-sub">{sub}</div>}
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] fade-in" onClick={onClose} />
      <div className={cx('relative h-full w-full bg-surface shadow-pop flex flex-col slide-in border-r border-line', wide ? 'max-w-3xl' : 'max-w-xl')}>
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="font-semibold">{title}</h2>
          <button className="btn-ghost h-8 w-8 px-0" onClick={onClose} aria-label="بستن">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-line px-6 py-3 flex items-center gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

export function Empty({ text = 'موردی برای نمایش نیست', icon }: { text?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-sub gap-2">
      <div className="rounded-2xl bg-muted p-3">{icon || <Inbox size={20} />}</div>
      <div className="text-sm">{text}</div>
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-sub mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-muted p-1 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx('px-3 h-7 rounded-lg text-xs font-medium transition whitespace-nowrap', value === o.value ? 'bg-surface shadow-sm text-ink' : 'text-sub hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-1 border-b border-line overflow-x-auto no-print">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx('relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition', value === t.value ? 'text-brand' : 'text-sub hover:text-ink')}
        >
          {t.label}
          {t.count !== undefined && <span className="mr-1.5 rounded-full bg-muted px-1.5 text-[11px] text-sub num">{fa(t.count)}</span>}
          {value === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}
        </button>
      ))}
    </div>
  )
}

export function Ring({ value, size = 56, stroke = 6, h }: { value: number; size?: number; stroke?: number; h?: Health }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  const color = h === 'red' ? 'rgb(var(--bad))' : h === 'amber' ? 'rgb(var(--warn))' : h === 'green' ? 'rgb(var(--good))' : 'rgb(var(--brand))'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <span className="absolute text-xs font-bold num">{fa(Math.round(v))}٪</span>
    </div>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-4 no-print">{children}</div>
}

export function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cx('input h-9 w-auto min-w-[8rem] pl-8', value && 'border-brand/50 text-brand')}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

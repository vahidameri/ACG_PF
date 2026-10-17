import { PackageCheck } from 'lucide-react'
import type { Project } from '../lib/types'
import { useStore } from '../lib/store'
import { can } from '../lib/access'
import { DAYS, DELIVERY_STATE, deliveryDate, deliveryState, type DeliveryState } from '../lib/cadence'
import { uid } from '../lib/api'
import { L, lbl, tr } from '../lib/i18n'
import { fmtDate, todayISO } from '../lib/jalali'
import { cx } from './ui'

export const stateTone: Record<DeliveryState, string> = {
  done: 'bg-good/10 text-good',
  today: 'bg-warn/15 text-warn',
  upcoming: 'bg-muted text-sub',
  missed: 'bg-bad/10 text-bad',
}

export function DeliveryBadge({ p, dark }: { p: Project; dark?: boolean }) {
  const st = deliveryState(p)
  if (!st) return null
  return (
    <span className={cx('inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[0.6875rem] font-medium', dark ? 'bg-white/10 text-white' : stateTone[st])}>
      <PackageCheck size={12} /> {tr(DAYS[Number(p.delivery_day)])} · {lbl(DELIVERY_STATE, st)}
    </span>
  )
}

/** The lead (or leadership) records this week's delivery. */
export function DeliveredButton({ p, dark, small }: { p: Project; dark?: boolean; small?: boolean }) {
  const { canEdit, access, me, upsert, toast } = useStore()
  const st = deliveryState(p)
  if (!st || st === 'done' || !canEdit || !(can.manage(access) || p.owner === me)) return null
  const record = async () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    await upsert('Projects', { ...p, last_delivery: todayISO() })
    await upsert('Comments', { id: uid('C'), entity: 'Projects', entity_id: p.id, author: me, body: L(`✅ تحویل هفتگی ثبت شد (روز تحویل: ${fmtDate(deliveryDate(p))})`, `✅ Weekly delivery recorded (delivery day: ${fmtDate(deliveryDate(p))})`), created_at: `${todayISO()} ${pad(d.getHours())}:${pad(d.getMinutes())}` })
    toast(L(`تحویل هفتگی ${p.name} ثبت شد`, `${p.name}: weekly delivery recorded`))
  }
  return (
    <button className={dark ? 'btn h-10 bg-white text-band' : cx('btn-tonal', small ? 'btn-sm h-8' : 'btn-sm')} onClick={(e) => (e.preventDefault(), e.stopPropagation(), record())}>
      <PackageCheck size={14} /> {L('تحویل شد', 'Delivered')}
    </button>
  )
}

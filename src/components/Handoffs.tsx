// Hand-offs between sides: send a task to another side, accept it or send it back, send it again.
import { useState } from 'react'
import { Check, CornerUpLeft, Send, Repeat } from 'lucide-react'
import type { Handoff, Task } from '../lib/types'
import { useStore } from '../lib/store'
import { uid } from '../lib/api'
import { L, lbl } from '../lib/i18n'
import { TRACK, TRACKS, sideSoft, trackOf } from '../lib/tracks'
import { ageDays, canRespond, forTask, isOpen, nextRound, resent } from '../lib/handoffs'
import { fa, fmtDayMonth, nowStamp, relDays, todayISO } from '../lib/jalali'
import { Avatar, Due, cx } from './ui'
import { DatePicker } from './DatePicker'
import { useEditor } from './Editor'

export const HANDOFF_STATUS = {
  sent: ['منتظر پاسخ', 'Awaiting reply'],
  accepted: ['پذیرفته شد', 'Accepted'],
  returned: ['برگشت خورد', 'Returned'],
} as const

export function SideChip({ side }: { side: string }) {
  if (!side) return <span className="text-[0.6875rem] text-sub">—</span>
  return (
    <span className="chip side-soft" style={sideSoft(side)}>
      {lbl(TRACK, side)}
    </span>
  )
}

/** "from product to design" — written out, so the direction reads the same in Persian and English. */
export function Flow({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-[0.6875rem] text-sub">
      {L('از', 'From')} <SideChip side={from} /> {L('به', 'to')} <SideChip side={to} />
    </span>
  )
}

/** Accept / return buttons for one pass. */
export function HandoffActions({ h, compact }: { h: Handoff; compact?: boolean }) {
  const { db, me, access, upsert, toast, canEdit } = useStore()
  const [returning, setReturning] = useState(false)
  const [reply, setReply] = useState('')
  if (!canEdit || !canRespond(h, db, me, access)) return null
  const answer = async (status: 'accepted' | 'returned') => {
    await upsert('Handoffs', { ...h, status, reply: reply.trim(), responded_at: nowStamp(), to_person: h.to_person || me })
    toast(status === 'accepted' ? L('تحویل پذیرفته شد', 'Hand-off accepted') : L('برگشت داده شد', 'Sent back'))
    setReturning(false)
    setReply('')
  }
  if (returning)
    return (
      <form className="mt-2 flex gap-1.5" onSubmit={(e) => (e.preventDefault(), reply.trim() && answer('returned'))} onClick={(e) => e.stopPropagation()}>
        <input autoFocus className="input h-8 flex-1 text-xs" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={L('چرا برمی‌گردد؟ چه چیزی کم است؟', 'Why is it coming back? What is missing?')} />
        <button className="btn-danger btn-sm h-8" disabled={!reply.trim()}>
          {L('برگشت', 'Return')}
        </button>
      </form>
    )
  return (
    <div className={cx('flex gap-1.5', compact ? '' : 'mt-2')} onClick={(e) => e.stopPropagation()}>
      <button className="btn-tonal btn-sm h-8" onClick={() => answer('accepted')}>
        <Check size={13} /> {L('پذیرفتم', 'Accept')}
      </button>
      <button className="btn-outline btn-sm h-8" onClick={() => setReturning(true)}>
        <CornerUpLeft size={13} /> {L('برگشت', 'Return')}
      </button>
    </div>
  )
}

/** The hand-off history of a task, and the form to pass it on. Lives in the task sheet. */
export function HandoffSection({ task }: { task: Task }) {
  const { db, me, upsert, toast, canEdit } = useStore()
  const list = forTask(db, task.id)
  const from = trackOf(task, db) || TRACKS[0]
  const last = list[list.length - 1]
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState(TRACKS.find((t) => t !== from) || '')
  const [who, setWho] = useState('')
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const people = db.Team.filter((m) => String(m.active) !== 'false' && (!to || m.track === to))
  const send = async (fromSide: string, toSide: string, toPerson: string, n: string, d: string) => {
    const h: Handoff = {
      id: uid('H'), task_id: task.id, project_id: task.project_id, title: task.title, from_side: fromSide, to_side: toSide, from_person: me, to_person: toPerson,
      status: 'sent', round: nextRound(db, task.id, fromSide, toSide), sent_at: nowStamp(), due_date: d, responded_at: '', note: n, reply: '',
    }
    await upsert('Handoffs', h)
    toast(L(`به ${lbl(TRACK, toSide)} تحویل شد`, `Handed to ${lbl(TRACK, toSide)}`))
  }
  // a returned pass I sent can go again (same direction, next round)
  const again = last && last.status === 'returned' && last.from_person === me
  return (
    <div className="mt-8">
      <div className="eyebrow mb-3 flex items-center gap-2">
        <Repeat size={13} /> {L('تحویل بین واحدها (رفت و برگشت)', 'Hand-offs between units')}
      </div>
      {list.length > 0 && (
        <ol className="space-y-2">
          {list.map((h) => (
            <li key={h.id} className={cx('rounded-2xl border px-3 py-2.5', h.status === 'returned' ? 'border-bad/25 bg-bad/[0.03]' : h.status === 'accepted' ? 'border-good/25 bg-good/[0.03]' : 'border-warn/30 bg-warn/[0.04]')}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-[0.625rem] text-sub">{L(`دور ${fa(h.round || 1)}`, `R${h.round || 1}`)}</span>
                <Flow from={h.from_side} to={h.to_side} />
                <span className="text-sub">{h.from_person}{h.to_person ? L(` به ${h.to_person}`, ` to ${h.to_person}`) : ''}</span>
                <span className="ms-auto text-[0.6875rem] font-medium">{lbl(HANDOFF_STATUS, h.status)}</span>
              </div>
              <div className="mt-1 text-[0.6875rem] text-sub">
                {fmtDayMonth(h.sent_at.slice(0, 10))}
                {h.due_date && ` · ${L('مهلت', 'due')} ${relDays(h.due_date)}`}
                {` · ${isOpen(h) ? L(`${fa(ageDays(h))} روز در انتظار`, `waiting ${ageDays(h)}d`) : L(`پاسخ در ${fa(ageDays(h))} روز`, `answered in ${ageDays(h)}d`)}`}
              </div>
              {h.note && <div className="mt-1.5 text-xs leading-6">{h.note}</div>}
              {h.reply && <div className={cx('mt-1.5 rounded-lg px-2 py-1 text-xs leading-6', h.status === 'returned' ? 'bg-bad/[0.07] text-bad' : 'bg-good/[0.07] text-good')}>{h.reply}</div>}
              <HandoffActions h={h} />
            </li>
          ))}
        </ol>
      )}
      {canEdit && again && (
        <button className="btn-primary btn-sm mt-2" onClick={() => send(last.from_side, last.to_side, last.to_person, note || L('اصلاح شد، دوباره بررسی شود', 'Fixed — please check again'), last.due_date)}>
          <Send size={13} className="rtl:-scale-x-100" /> {L(`ارسال دوباره به ${lbl(TRACK, last.to_side)} (دور ${fa(nextRound(db, task.id, last.from_side, last.to_side))})`, `Send again to ${lbl(TRACK, last.to_side)} (round ${nextRound(db, task.id, last.from_side, last.to_side)})`)}
        </button>
      )}
      {canEdit &&
        (open ? (
          <form
            className="mt-3 space-y-2 rounded-2xl border border-line p-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!to) return
              await send(from, to, who, note.trim(), due)
              setOpen(false)
              setNote('')
              setWho('')
              setDue('')
            }}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <SideChip side={from} />
              <span className="text-sub">{L('به', 'to')}</span>
              {TRACKS.filter((t) => t !== from).map((t) => (
                <button type="button" key={t} onClick={() => (setTo(t), setWho(''))} className={cx('h-8 rounded-full border px-3 transition', to === t ? 'border-ink bg-ink text-surface' : 'border-line text-sub hover:text-ink')}>
                  {lbl(TRACK, t)}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="input h-9 text-xs" value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">{L(`هر کسی از ${lbl(TRACK, to)}`, `Anyone in ${lbl(TRACK, to)}`)}</option>
                {people.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              <DatePicker value={due} onChange={setDue} />
            </div>
            <textarea className="input text-xs" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L('چه چیزی تحویل می‌شود؟ لینک فایل، نکته‌ها…', 'What is handed over? Links, notes…')} />
            <div className="flex gap-2">
              <button className="btn-primary btn-sm" disabled={!to}>
                <Send size={13} className="rtl:-scale-x-100" /> {L('تحویل', 'Hand off')}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
                {L('انصراف', 'Cancel')}
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setOpen(true)} className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2 text-xs text-sub hover:border-ink/30 hover:text-ink">
            <Send size={13} className="rtl:-scale-x-100" /> {L('تحویل به واحد دیگر', 'Hand off to another unit')}
          </button>
        ))}
    </div>
  )
}

/** One pass as a card on the hand-off board. */
export function HandoffCard({ h, onOpen }: { h: Handoff; onOpen: () => void }) {
  const { db } = useStore()
  const code = db.Projects.find((p) => p.id === h.project_id)?.code
  const late = isOpen(h) && h.due_date && h.due_date < todayISO()
  return (
    <div onClick={onOpen} className={cx('cursor-pointer rounded-2xl border bg-surface p-3 shadow-sm transition hover:shadow-float', late ? 'border-bad/30' : 'border-line')}>
      <div className="flex items-center gap-2">
        <Flow from={h.from_side} to={h.to_side} />
        {Number(h.round) > 1 && <span className="rounded-full bg-warn/15 px-1.5 text-[0.625rem] font-medium leading-5 text-warn">{L(`دور ${fa(h.round)}`, `R${h.round}`)}</span>}
        {code && <span className="ms-auto font-mono text-[0.625rem] uppercase text-sub" dir="ltr">{code}</span>}
      </div>
      <div className="mt-2 text-sm leading-6">{h.title}</div>
      {h.status === 'returned' && h.reply && <div className="mt-1 line-clamp-2 rounded-lg bg-bad/[0.07] px-2 py-1 text-[0.6875rem] leading-5 text-bad">{h.reply}</div>}
      <div className="mt-2 flex items-center gap-1.5 text-[0.6875rem] text-sub">
        <Avatar name={h.from_person} size="xs" />
        <span className="truncate">{h.from_person}</span>
        <span>{L('به', 'to')}</span>
        {h.to_person ? <Avatar name={h.to_person} size="xs" /> : null}
        <span className="truncate">{h.to_person || L('هر کسی', 'anyone')}</span>
        <span className="flex-1" />
        {isOpen(h) ? <span className={cx(late && 'text-bad')}>{L(`${fa(ageDays(h))} روز`, `${ageDays(h)}d`)}</span> : <Due iso={h.due_date} done />}
      </div>
      {isOpen(h) && <HandoffActions h={h} />}
    </div>
  )
}

/** Board of passes: waiting, returned (not yet sent again), accepted lately. */
export function HandoffBoard({ projectId, side }: { projectId?: string; side?: string }) {
  const { db } = useStore()
  const { open } = useTaskOpener()
  const today = todayISO()
  const all = db.Handoffs.filter((h) => (!projectId || h.project_id === projectId) && (!side || h.from_side === side || h.to_side === side))
  const cols: { id: string; title: string; tone: string; rows: Handoff[] }[] = [
    { id: 'sent', title: L('منتظر پاسخ', 'Awaiting reply'), tone: 'text-warn', rows: all.filter((h) => h.status === 'sent').sort((a, b) => (a.sent_at < b.sent_at ? -1 : 1)) },
    { id: 'returned', title: L('برگشت خورده (منتظر ارسال دوباره)', 'Returned (to send again)'), tone: 'text-bad', rows: all.filter((h) => h.status === 'returned' && !resent(h, db)) },
    { id: 'accepted', title: L('پذیرفته‌شده · ۱۴ روز اخیر', 'Accepted · last 14 days'), tone: 'text-good', rows: all.filter((h) => h.status === 'accepted' && ageDays({ ...h, sent_at: h.responded_at || h.sent_at, responded_at: today }) <= 14).sort((a, b) => (a.responded_at < b.responded_at ? 1 : -1)) },
  ]
  return (
    <div className="grid gap-3 @2xl:grid-cols-3">
      {cols.map((c) => (
        <div key={c.id} className="flex min-h-[12rem] flex-col rounded-3xl bg-muted/60 p-2">
          <div className={cx('px-2.5 py-2 text-sm font-semibold', c.tone)}>
            {c.title} · {fa(c.rows.length)}
          </div>
          <div className="flex flex-col gap-2">
            {c.rows.map((h) => (
              <HandoffCard key={h.id} h={h} onOpen={() => open(h.task_id)} />
            ))}
            {!c.rows.length && <div className="px-3 py-6 text-center text-xs text-sub">{L('موردی نیست', 'Nothing here')}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function useTaskOpener() {
  const { db } = useStore()
  const { open } = useEditor()
  return { open: (id: string) => { const t = db.Tasks.find((x) => x.id === id); if (t) open('Tasks', t as never) } }
}

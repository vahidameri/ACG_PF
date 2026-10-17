// Back office → Telegram: read a Telegram Desktop export (JSON), match each group to a project and each
// sender to a person, then turn the messages that matter into tasks, follow-ups, decisions or project notes.
import { useMemo, useState } from 'react'
import { CheckSquare, FileUp, Gavel, ListTodo, MessageSquareText, Send, StickyNote } from 'lucide-react'
import { useStore } from '../lib/store'
import { uid } from '../lib/api'
import { parseExport, titleOf, type TgChat, type TgMessage } from '../lib/telegram'
import { L } from '../lib/i18n'
import { fa, fmtDayMonth, todayISO } from '../lib/jalali'
import { Card, Empty, cx } from './ui'

const PEOPLE_KEY = 'tg.people'
const PROJECTS_KEY = 'tg.projects'
const doneKey = (chatId: string) => `tg.done.${chatId}`
const json = <T,>(v: string | undefined, d: T): T => {
  try {
    return v ? (JSON.parse(v) as T) : d
  } catch {
    return d
  }
}
const norm = (s: string) => s.toLowerCase().replace(/[\s‌_.-]+/g, '')

export function TelegramImport() {
  const { db, setting, setSetting, upsert, toast, me } = useStore()
  const [chats, setChats] = useState<TgChat[]>([])
  const [err, setErr] = useState('')
  const [chat, setChat] = useState('')
  const [who, setWho] = useState('')
  const [q, setQ] = useState('')
  const [hideDone, setHideDone] = useState(true)
  const [minLen, setMinLen] = useState(15)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(200)
  const [busy, setBusy] = useState(false)

  const peopleMap = json<Record<string, string>>(setting(PEOPLE_KEY), {})
  const projectMap = json<Record<string, string>>(setting(PROJECTS_KEY), {})
  const done = (chatId: string) => new Set(String(setting(doneKey(chatId), '')).split(',').filter(Boolean))

  // best guesses: a group named after a project, a sender named like a person
  const guessProject = (c: TgChat) => projectMap[c.id] ?? db.Projects.find((p) => norm(c.name).includes(norm(p.name)) || (p.code && norm(c.name).includes(norm(p.code))))?.id ?? ''
  const guessPerson = (sender: string) => {
    if (!sender) return ''
    if (peopleMap[sender] !== undefined) return peopleMap[sender]
    const s = norm(sender)
    const hit = db.Team.filter((m) => [m.name, m.name_en, m.username].filter(Boolean).some((n) => norm(String(n)) === s))
    if (hit.length === 1) return hit[0].name
    const near = db.Team.filter((m) => [m.name, m.name_en].filter((n) => n && norm(String(n)).length >= 4).some((n) => s.includes(norm(String(n))) || (s.length >= 4 && norm(String(n)).includes(s))))
    return near.length === 1 ? near[0].name : ''
  }

  const read = async (files: FileList | null) => {
    setErr('')
    const out: TgChat[] = []
    for (const f of Array.from(files || [])) {
      try {
        out.push(...parseExport(JSON.parse(await f.text())))
      } catch {
        setErr(L(`«${f.name}» خروجی JSON تلگرام نیست. در تلگرام دسکتاپ: ⋮ ← Export chat history ← Format: JSON`, `“${f.name}” is not a Telegram JSON export. In Telegram Desktop: ⋮ → Export chat history → Format: JSON`))
      }
    }
    setChats((c) => [...c.filter((x) => !out.some((o) => o.id === x.id)), ...out])
    setPicked(new Set())
  }

  const all = useMemo(() => chats.flatMap((c) => c.messages), [chats])
  const senders = useMemo(() => [...new Set(all.map((m) => m.from).filter(Boolean))].sort(), [all])
  const doneSets = useMemo(() => Object.fromEntries(chats.map((c) => [c.id, done(c.id)])), [chats, setting]) // eslint-disable-line react-hooks/exhaustive-deps
  const list = all
    .filter((m) => (!chat || m.chatId === chat) && (!who || m.from === who) && (!q || m.text.includes(q)) && m.text.length >= minLen && (!hideDone || !doneSets[m.chatId]?.has(m.key)))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const markDone = async (rows: TgMessage[]) => {
    const by = new Map<string, string[]>()
    rows.forEach((m) => by.set(m.chatId, [...(by.get(m.chatId) || []), m.key]))
    for (const [cid, keys] of by) await setSetting(doneKey(cid), [...new Set([...done(cid), ...keys])].join(','))
  }

  const make = async (kind: 'task' | 'followup' | 'decision' | 'note') => {
    const rows = all.filter((m) => picked.has(m.key))
    if (!rows.length) return
    setBusy(true)
    try {
      for (const m of rows) {
        const c = chats.find((x) => x.id === m.chatId)!
        const pid = guessProject(c)
        const person = guessPerson(m.from)
        const day = m.date.slice(0, 10) || todayISO()
        const source = L(`از تلگرام · ${m.chat} · ${m.from} · ${day}`, `From Telegram · ${m.chat} · ${m.from} · ${day}`)
        if (kind === 'task')
          await upsert('Tasks', {
            id: uid('T'), project_id: pid, sprint_id: '', title: titleOf(m.text), description: `${m.text}\n\n— ${source}`, assignee: person, reporter: me, status: 'todo', priority: 'medium',
            due_date: '', points: 0, tags: 'telegram', created_at: day, completed_at: '', track: '', depends_on: '', meeting_id: '', private: '',
          } as never)
        else if (kind === 'followup')
          await upsert('FollowUps', { id: uid('F'), project_id: pid, subject: titleOf(m.text), person: person || m.from, channel: 'chat', due_date: todayISO(), status: 'open', priority: 'medium', notes: `${m.text}\n\n— ${source}`, created_at: day, done_at: '', owner: me })
        else if (kind === 'decision')
          await upsert('Risks', { id: uid('R'), project_id: pid, title: titleOf(m.text), type: 'decision', probability: 3, impact: 3, owner: person, mitigation: `${m.text}\n\n— ${source}`, status: 'closed', due_date: day })
        else if (pid) await upsert('Comments', { id: uid('C'), entity: 'Projects', entity_id: pid, author: person || m.from, body: `${m.text}\n\n— ${source}`, created_at: `${day} ${m.date.slice(11, 16) || '00:00'}` })
      }
      await markDone(rows)
      toast(L(`${fa(rows.length)} پیام وارد اطلس شد`, `${rows.length} messages imported`))
      setPicked(new Set())
    } finally {
      setBusy(false)
    }
  }

  const toggle = (k: string) =>
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  return (
    <div className="space-y-4">
      <Card eyebrow={<span className="flex items-center gap-1.5"><Send size={12} className="rtl:-scale-x-100" /> Telegram</span>} title={L('ورود از گروه‌های تلگرام', 'Import from Telegram groups')}>
        <ol className="mb-4 list-decimal space-y-1 ps-5 text-xs leading-6 text-sub">
          <li>{L('در تلگرام دسکتاپ گروه را باز کنید ← ⋮ ← Export chat history.', 'In Telegram Desktop open the group → ⋮ → Export chat history.')}</li>
          <li>{L('Format را روی JSON بگذارید (عکس و فایل لازم نیست) ← Export.', 'Set Format to JSON (no photos or files needed) → Export.')}</li>
          <li>{L('فایل result.json هر گروه را این‌جا بیاورید؛ چند فایل با هم هم می‌شود.', 'Bring each group’s result.json here; several at once is fine.')}</li>
        </ol>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-4 py-6 text-sm text-sub transition hover:border-ink/30 hover:text-ink">
          <FileUp size={18} /> {L('انتخاب فایل‌های result.json', 'Choose result.json files')}
          <input type="file" accept=".json,application/json" multiple className="hidden" onChange={(e) => read(e.target.files)} />
        </label>
        {err && <p className="mt-2 text-xs text-bad">{err}</p>}
      </Card>

      {chats.length > 0 && (
        <div className="grid gap-4 @3xl:grid-cols-2">
          <Card eyebrow={L('گروه ← پروژه', 'Group → project')} title={L(`${fa(chats.length)} گروه`, `${chats.length} groups`)}>
            <ul className="space-y-2">
              {chats.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <MessageSquareText size={14} className="shrink-0 text-sub" />
                  <span className="min-w-0 flex-1 truncate text-sm" dir="auto">{c.name}</span>
                  <span className="text-[0.6875rem] text-sub num">{fa(c.messages.length)}</span>
                  <select className="input h-9 w-44 text-xs" value={guessProject(c)} onChange={(e) => setSetting(PROJECTS_KEY, JSON.stringify({ ...projectMap, [c.id]: e.target.value }))}>
                    <option value="">{L('— بدون پروژه —', '— No project —')}</option>
                    {db.Projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </Card>
          <Card eyebrow={L('فرستنده ← نفر', 'Sender → person')} title={L(`${fa(senders.length)} فرستنده`, `${senders.length} senders`)}>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {senders.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm" dir="auto">{s}</span>
                  <select className="input h-9 w-44 text-xs" value={guessPerson(s)} onChange={(e) => setSetting(PEOPLE_KEY, JSON.stringify({ ...peopleMap, [s]: e.target.value }))}>
                    <option value="">{L('— کسی نیست —', '— Nobody —')}</option>
                    {db.Team.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {chats.length > 0 && (
        <Card pad={false}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <select className="input h-9 w-44 text-xs" value={chat} onChange={(e) => setChat(e.target.value)}>
              <option value="">{L('همه‌ی گروه‌ها', 'All groups')}</option>
              {chats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input h-9 w-40 text-xs" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">{L('همه‌ی فرستنده‌ها', 'All senders')}</option>
              {senders.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="input h-9 w-48 text-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('جستجو در متن…', 'Search text…')} />
            <select className="input h-9 w-36 text-xs" value={minLen} onChange={(e) => setMinLen(Number(e.target.value))}>
              {[0, 15, 40, 100].map((n) => <option key={n} value={n}>{n ? L(`حداقل ${fa(n)} حرف`, `${n}+ characters`) : L('همه‌ی پیام‌ها', 'Every message')}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-sub">
              <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> {L('واردشده‌ها را نشان نده', 'Hide imported')}
            </label>
            <span className="ms-auto text-xs text-sub">{L(`${fa(list.length)} پیام`, `${list.length} messages`)}</span>
          </div>
          {picked.size > 0 && (
            <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 shadow-float">
              <span className="text-sm font-medium">{L(`${fa(picked.size)} پیام انتخاب شد`, `${picked.size} selected`)}</span>
              <span className="flex-1" />
              <button disabled={busy} className="btn-primary btn-sm" onClick={() => make('task')}><ListTodo size={14} /> {L('تسک', 'Tasks')}</button>
              <button disabled={busy} className="btn-outline btn-sm" onClick={() => make('followup')}><CheckSquare size={14} /> {L('پیگیری', 'Follow-ups')}</button>
              <button disabled={busy} className="btn-outline btn-sm" onClick={() => make('decision')}><Gavel size={14} /> {L('تصمیم', 'Decisions')}</button>
              <button disabled={busy} className="btn-outline btn-sm" onClick={() => make('note')} title={L('روی پروژه‌ی همان گروه', 'On the group’s project')}><StickyNote size={14} /> {L('یادداشت پروژه', 'Project notes')}</button>
              <button className="btn-ghost btn-sm" onClick={() => setPicked(new Set())}>{L('لغو', 'Clear')}</button>
            </div>
          )}
          {!list.length ? (
            <Empty text={L('پیامی با این فیلترها نیست', 'No messages match')} />
          ) : (
            <ul className="divide-y divide-line">
              {list.slice(0, limit).map((m) => {
                const isDone = doneSets[m.chatId]?.has(m.key)
                return (
                  <li key={m.key} className={cx('flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-muted/40', picked.has(m.key) && 'bg-brand-soft/20', isDone && 'opacity-50')} onClick={() => toggle(m.key)}>
                    <input type="checkbox" className="mt-1" checked={picked.has(m.key)} onChange={() => toggle(m.key)} onClick={(e) => e.stopPropagation()} aria-label={L('انتخاب', 'Select')} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-sub">
                        <b className="text-ink" dir="auto">{m.from || '—'}</b>
                        {guessPerson(m.from) && guessPerson(m.from) !== m.from && <span>({guessPerson(m.from)})</span>}
                        <span dir="auto">{m.chat}</span>
                        <span className="num">{fmtDayMonth(m.date.slice(0, 10))} {m.date.slice(11, 16)}</span>
                        {m.reply && <span>{L('پاسخ', 'reply')}</span>}
                        {isDone && <span className="text-good">{L('وارد شده', 'imported')}</span>}
                      </div>
                      <div className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-sm leading-6" dir="auto">{m.text}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {list.length > limit && (
            <button className="block w-full border-t border-line py-3 text-center text-xs text-sub hover:text-ink" onClick={() => setLimit((n) => n + 200)}>
              {L(`نمایش ${fa(Math.min(200, list.length - limit))} پیام دیگر`, `Show ${Math.min(200, list.length - limit)} more`)}
            </button>
          )}
        </Card>
      )}
    </div>
  )
}

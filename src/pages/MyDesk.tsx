import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Sun, Send, Copy, Lightbulb, ListChecks, BellRing, Hourglass, CalendarRange, UserCheck, ArrowLeft } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Card, Empty, PageHeader, Avatar, cx, Segmented, Chip } from '../components/ui'
import { FollowUpRow, TaskRow, useProjectName } from '../components/shared'
import { addDays, daysFromToday, fa, fmtDate, todayISO, daysBetween } from '../lib/jalali'
import { isTaskOverdue, projectMetrics, riskScore } from '../lib/metrics'
import { uid } from '../lib/api'
import { PRIORITY_ORDER } from '../lib/labels'
import type { Task } from '../lib/types'

const byDue = (a: { due_date: string; priority?: string }, b: { due_date: string; priority?: string }) =>
  (a.due_date || '9999') < (b.due_date || '9999') ? -1 : (a.due_date || '9999') > (b.due_date || '9999') ? 1 : (PRIORITY_ORDER[a.priority as never] ?? 2) - (PRIORITY_ORDER[b.priority as never] ?? 2)

interface Suggestion {
  key: string
  text: string
  action: string
  run: () => void
  tone: 'bad' | 'warn' | 'brand'
}

export default function MyDesk() {
  const { db, me, upsert, toast, canEdit } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const today = todayISO()
  const weekEnd = addDays(today, 7)

  // ---------- Quick capture ----------
  const [kind, setKind] = useState<'task' | 'followup'>('task')
  const [text, setText] = useState('')
  const [proj, setProj] = useState('')
  const [due, setDue] = useState(0)
  const [who, setWho] = useState('')

  const capture = async () => {
    const t = text.trim()
    if (!t) return
    const dueDate = addDays(today, due)
    if (kind === 'task') {
      await upsert('Tasks', {
        id: uid('T'), project_id: proj, sprint_id: '', title: t, description: '', assignee: who || me, reporter: me, status: 'todo', priority: 'medium',
        due_date: dueDate, points: 0, tags: '', created_at: today, completed_at: '',
      })
      toast(`تسک برای ${who || 'شما'} ثبت شد`)
    } else {
      await upsert('FollowUps', {
        id: uid('F'), project_id: proj, subject: t, person: who, channel: 'meeting', due_date: dueDate, status: 'open', priority: 'medium', notes: '', created_at: today, done_at: '',
      })
      toast('فالوآپ ثبت شد')
    }
    setText('')
  }

  const people = useMemo(() => Array.from(new Set(db.Team.map((m) => m.name))), [db.Team])

  // ---------- My lists ----------
  const myOpen = db.Tasks.filter((t) => t.assignee === me && t.status !== 'done')
  const myToday = myOpen.filter((t) => t.due_date && t.due_date <= today).sort(byDue)
  const myWeek = myOpen.filter((t) => t.due_date > today && t.due_date <= weekEnd).sort(byDue)
  const myLater = myOpen.filter((t) => !t.due_date || t.due_date > weekEnd).sort(byDue)
  const doneToday = db.Tasks.filter((t) => t.assignee === me && t.status === 'done' && t.completed_at?.slice(0, 10) === today)

  const fuOpen = db.FollowUps.filter((f) => f.status !== 'done')
  const fuDue = fuOpen.filter((f) => f.status === 'open' && f.due_date <= today).sort(byDue)
  const fuWaiting = fuOpen.filter((f) => f.status === 'waiting').sort(byDue)
  const fuUpcoming = fuOpen.filter((f) => f.status === 'open' && f.due_date > today).sort(byDue)

  // ---------- People to nudge ----------
  const nudge = useMemo(() => {
    const map = new Map<string, Task[]>()
    db.Tasks.filter((t) => t.assignee && t.assignee !== me && (isTaskOverdue(t) || t.status === 'blocked')).forEach((t) => {
      map.set(t.assignee, [...(map.get(t.assignee) || []), t])
    })
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [db.Tasks, me])

  const copyNudge = (person: string, tasks: Task[]) => {
    const lines = tasks.map((t) => `• ${t.title}${t.project_id ? ` (${pname(t.project_id)})` : ''} — ${t.status === 'blocked' ? 'مسدود' : `سررسید ${fmtDate(t.due_date)}`}`)
    const msg = `سلام ${person} عزیز،\nلطفاً وضعیت موارد زیر را به‌روز کنید و اگر مانعی هست اطلاع بدهید:\n${lines.join('\n')}\nممنون 🙏`
    navigator.clipboard?.writeText(msg).then(
      () => toast('متن یادآوری کپی شد — در پیام‌رسان بچسبانید'),
      () => toast('کپی انجام نشد', 'err'),
    )
  }

  // ---------- Assistant suggestions (rule-based) ----------
  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = []
    db.Projects.filter((p) => p.status === 'active').forEach((p) => {
      const last = db.Updates.filter((u) => u.project_id === p.id).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))[0]
      const age = last ? daysBetween(last.week_date, today) : 999
      if (age > 7)
        out.push({ key: `upd-${p.id}`, tone: 'warn', text: `«${p.name}» ${last ? `${fa(age)} روز است` : 'هنوز'} گزارش هفتگی ندارد`, action: 'ثبت گزارش', run: () => open('Updates', { project_id: p.id, author: p.owner }) })
      const m = projectMetrics(p, db)
      if (m.health === 'red' && !db.FollowUps.some((f) => f.project_id === p.id && f.status !== 'done' && f.person === p.sponsor))
        out.push({ key: `esc-${p.id}`, tone: 'bad', text: `«${p.name}» در خطر است؛ با اسپانسر (${p.sponsor}) هماهنگی ثبت نشده`, action: 'فالوآپ با اسپانسر', run: () => open('FollowUps', { project_id: p.id, person: p.sponsor, subject: `بررسی وضعیت ${p.name} و تصمیمات لازم`, priority: 'high' }) })
    })
    db.Milestones.filter((ms) => ms.status !== 'done' && daysFromToday(ms.planned_date) >= 0 && daysFromToday(ms.planned_date) <= 5).forEach((ms) => {
      const open = db.Tasks.filter((t) => t.project_id === ms.project_id && t.status !== 'done' && t.due_date && t.due_date <= ms.planned_date).length
      if (open) out.push({ key: `ms-${ms.id}`, tone: 'warn', text: `مایلستون «${ms.title}» ${fa(daysFromToday(ms.planned_date))} روز دیگر است و ${fa(open)} تسک باز دارد`, action: 'مشاهده', run: () => (window.location.hash = `#/projects/${ms.project_id}`) })
    })
    db.Risks.filter((r) => r.status !== 'closed' && riskScore(r) >= 15 && r.due_date && r.due_date < today).forEach((r) =>
      out.push({ key: `rk-${r.id}`, tone: 'bad', text: `مهلت اقدام برای ریسک «${r.title}» گذشته است`, action: 'به‌روزرسانی', run: () => open('Risks', r as never) }),
    )
    fuWaiting
      .filter((f) => f.created_at && daysBetween(f.created_at, today) >= 5)
      .forEach((f) => out.push({ key: `fw-${f.id}`, tone: 'brand', text: `${fa(daysBetween(f.created_at, today))} روز منتظر پاسخ «${f.person}» درباره‌ی «${f.subject}» هستید — شاید وقت اسکالیشن است`, action: 'ویرایش', run: () => open('FollowUps', f as never) }))
    return out.slice(0, 8)
  }, [db, today, open, fuWaiting])

  const [tab, setTab] = useState<'today' | 'week' | 'later'>('today')
  const list = tab === 'today' ? myToday : tab === 'week' ? myWeek : myLater
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : 'عصر بخیر'
  const overdueCount = myToday.filter((t) => t.due_date < today).length + fuDue.filter((f) => f.due_date < today).length

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sun size={22} className="text-warn" /> {greet}{me ? `، ${me}` : ''}
          </span>
        }
        sub={`${fmtDate(today, 'long')} · ${fa(myToday.length)} تسک و ${fa(fuDue.length)} فالوآپ برای امروز${overdueCount ? ` (${fa(overdueCount)} مورد عقب‌افتاده)` : ''} · ${fa(doneToday.length)} کار امروز انجام شد`}
      />

      {canEdit && (
        <div className="card p-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: 'task', label: 'تسک' },
                { value: 'followup', label: 'فالوآپ' },
              ]}
            />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && capture()}
              placeholder={kind === 'task' ? 'چه کاری باید انجام شود؟ (Enter برای ثبت)' : 'چه چیزی را از چه کسی باید پیگیری کنید؟'}
              className="input flex-1 min-w-[14rem] border-transparent bg-muted/60 focus:bg-surface"
            />
            <select value={who} onChange={(e) => setWho(e.target.value)} className="input h-10 w-auto">
              <option value="">{kind === 'task' ? 'مسئول: خودم' : 'از چه کسی؟'}</option>
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select value={proj} onChange={(e) => setProj(e.target.value)} className="input h-10 w-auto max-w-[12rem]">
              <option value="">بدون پروژه</option>
              {db.Projects.filter((p) => p.status !== 'completed' && p.status !== 'cancelled').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select value={due} onChange={(e) => setDue(Number(e.target.value))} className="input h-10 w-auto">
              <option value={0}>امروز</option>
              <option value={1}>فردا</option>
              <option value={3}>۳ روز دیگر</option>
              <option value={7}>هفته‌ی بعد</option>
              <option value={14}>دو هفته</option>
            </select>
            <button className="btn-primary h-10" onClick={capture} disabled={!text.trim()}>
              <Send size={15} /> ثبت
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="min-w-0 space-y-4 xl:col-span-3">
          <Card
            pad={false}
            title={<span className="flex items-center gap-2"><ListChecks size={16} className="text-brand" /> کارهای من</span>}
            action={
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'today', label: `امروز و معوق (${fa(myToday.length)})` },
                  { value: 'week', label: `این هفته (${fa(myWeek.length)})` },
                  { value: 'later', label: `بعداً (${fa(myLater.length)})` },
                ]}
              />
            }
          >
            <div className="p-2">
              {list.length === 0 ? <Empty text={tab === 'today' ? 'برای امروز کاری باقی نمانده ✨' : 'موردی نیست'} /> : list.map((t) => <TaskRow key={t.id} t={t} />)}
              {tab === 'today' && doneToday.length > 0 && (
                <div className="mt-2 border-t border-line pt-2">
                  <div className="px-3 pb-1 text-[11px] text-sub">انجام‌شده امروز</div>
                  {doneToday.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card pad={false} title={<span className="flex items-center gap-2"><BellRing size={16} className="text-bad" /> فالوآپ‌های امروز و معوق</span>} action={<Link to="/followups" className="text-xs text-brand flex items-center gap-1">همه <ArrowLeft size={12} /></Link>}>
            <div className="p-2">{fuDue.length === 0 ? <Empty text="فالوآپ سررسیدشده‌ای ندارید" /> : fuDue.map((f) => <FollowUpRow key={f.id} f={f} />)}</div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card pad={false} title={<span className="flex items-center gap-2"><Hourglass size={16} className="text-purple-500" /> منتظر پاسخ</span>}>
              <div className="p-2">{fuWaiting.length === 0 ? <Empty /> : fuWaiting.map((f) => <FollowUpRow key={f.id} f={f} compact />)}</div>
            </Card>
            <Card pad={false} title={<span className="flex items-center gap-2"><CalendarRange size={16} className="text-brand" /> فالوآپ‌های پیش رو</span>}>
              <div className="p-2">{fuUpcoming.length === 0 ? <Empty /> : fuUpcoming.slice(0, 6).map((f) => <FollowUpRow key={f.id} f={f} compact />)}</div>
            </Card>
          </div>
        </div>

        <div className="min-w-0 space-y-4 xl:col-span-2">
          <Card title={<span className="flex items-center gap-2"><Lightbulb size={16} className="text-warn" /> پیشنهادهای دستیار</span>}>
            {suggestions.length === 0 ? (
              <Empty text="همه‌چیز مرتب است" icon={<Sparkles size={20} />} />
            ) : (
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div key={s.key} className={cx('flex items-start gap-3 rounded-xl border p-3', s.tone === 'bad' ? 'border-bad/25 bg-bad/[0.04]' : s.tone === 'warn' ? 'border-warn/25 bg-warn/[0.05]' : 'border-brand/20 bg-brand/[0.04]')}>
                    <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', s.tone === 'bad' ? 'bg-bad' : s.tone === 'warn' ? 'bg-warn' : 'bg-brand')} />
                    <div className="flex-1 text-sm leading-6">{s.text}</div>
                    {canEdit && (
                      <button className="btn-outline h-7 px-2.5 text-xs" onClick={s.run}>
                        {s.action}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><UserCheck size={16} className="text-brand" /> از چه کسی پیگیری کنم؟</span>}>
            {nudge.length === 0 ? (
              <Empty text="هیچ تسک معوق یا مسدودی در تیم نیست" />
            ) : (
              <div className="space-y-3">
                {nudge.map(([person, tasks]) => (
                  <div key={person} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={person} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{person}</div>
                        <div className="text-[11px] text-sub">
                          {fa(tasks.filter((t) => isTaskOverdue(t)).length)} معوق · {fa(tasks.filter((t) => t.status === 'blocked').length)} مسدود
                        </div>
                      </div>
                      <button className="btn-ghost h-8 px-2 text-xs" onClick={() => copyNudge(person, tasks)} title="کپی پیام یادآوری">
                        <Copy size={14} /> پیام یادآوری
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {tasks.slice(0, 4).map((t) => (
                        <li key={t.id}>
                          <button onClick={() => open('Tasks', t as never)} className="flex w-full items-center gap-2 text-right text-xs hover:text-brand">
                            <span className={cx('h-1.5 w-1.5 rounded-full', t.status === 'blocked' ? 'bg-bad' : 'bg-warn')} />
                            <span className="flex-1 truncate">{t.title}</span>
                            {t.status === 'blocked' ? <Chip className="bg-bad/10 text-bad">مسدود</Chip> : <span className="text-bad num">{fa(-daysFromToday(t.due_date))} روز</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

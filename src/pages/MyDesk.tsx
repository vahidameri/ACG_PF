import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Copy, Lightbulb, UserCheck, ListChecks, BellRing, Hourglass, CalendarRange, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Band, Card, Empty, Overlap, Avatar, cx, Segmented, StatStrip, Chip } from '../components/ui'
import { FollowUpRow, TaskRow, useProjectName } from '../components/shared'
import { PersonPicker, ProjectPicker } from '../components/pickers'
import { addDays, daysFromToday, fa, fmtDate, todayISO, daysBetween } from '../lib/jalali'
import { isTaskOverdue, projectMetrics, riskScore } from '../lib/metrics'
import { uid } from '../lib/api'
import { PRIORITY_ORDER } from '../lib/labels'
import { L } from '../lib/i18n'
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
      toast(L(`تسک برای ${who || 'شما'} ثبت شد`, `Task added for ${who || 'you'}`))
    } else {
      await upsert('FollowUps', {
        id: uid('F'), project_id: proj, subject: t, person: who, channel: 'meeting', due_date: dueDate, status: 'open', priority: 'medium', notes: '', created_at: today, done_at: '',
      })
      toast(L('فالوآپ ثبت شد', 'Follow-up added'))
    }
    setText('')
  }

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

  const nudge = useMemo(() => {
    const map = new Map<string, Task[]>()
    db.Tasks.filter((t) => t.assignee && t.assignee !== me && (isTaskOverdue(t) || t.status === 'blocked')).forEach((t) => map.set(t.assignee, [...(map.get(t.assignee) || []), t]))
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [db.Tasks, me])

  const copyNudge = (person: string, tasks: Task[]) => {
    const lines = tasks.map((t) => `• ${t.title}${t.project_id ? ` (${pname(t.project_id)})` : ''} — ${t.status === 'blocked' ? L('مسدود', 'blocked') : `${L('سررسید', 'due')} ${fmtDate(t.due_date)}`}`)
    const msg = L(
      `سلام ${person} عزیز،\nلطفاً وضعیت موارد زیر را به‌روز کنید و اگر مانعی هست اطلاع بدهید:\n${lines.join('\n')}\nممنون 🙏`,
      `Hi ${person},\nCould you update the status of the items below and flag any blockers?\n${lines.join('\n')}\nThanks 🙏`,
    )
    navigator.clipboard?.writeText(msg).then(
      () => toast(L('متن یادآوری کپی شد — در پیام‌رسان بچسبانید', 'Reminder copied — paste it in your messenger')),
      () => toast(L('کپی انجام نشد', 'Copy failed'), 'err'),
    )
  }

  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = []
    db.Projects.filter((p) => p.status === 'active').forEach((p) => {
      const last = db.Updates.filter((u) => u.project_id === p.id).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))[0]
      const age = last ? daysBetween(last.week_date, today) : 999
      if (age > 7)
        out.push({
          key: `upd-${p.id}`, tone: 'warn',
          text: last ? L(`«${p.name}» ${fa(age)} روز است گزارش هفتگی ندارد`, `“${p.name}” has no weekly update for ${age} days`) : L(`«${p.name}» هنوز گزارش هفتگی ندارد`, `“${p.name}” has no weekly update yet`),
          action: L('ثبت گزارش', 'Write update'), run: () => open('Updates', { project_id: p.id, author: p.owner }),
        })
      const m = projectMetrics(p, db)
      if (m.health === 'red' && !db.FollowUps.some((f) => f.project_id === p.id && f.status !== 'done' && f.person === p.sponsor))
        out.push({
          key: `esc-${p.id}`, tone: 'bad',
          text: L(`«${p.name}» در خطر است و با اسپانسر (${p.sponsor}) هماهنگی ثبت نشده`, `“${p.name}” is off track with no sync logged with the sponsor (${p.sponsor})`),
          action: L('فالوآپ با اسپانسر', 'Follow up with sponsor'),
          run: () => open('FollowUps', { project_id: p.id, person: p.sponsor, subject: L(`بررسی وضعیت ${p.name} و تصمیمات لازم`, `Review ${p.name} status and decisions`), priority: 'high' }),
        })
    })
    db.Milestones.filter((ms) => ms.status !== 'done' && daysFromToday(ms.planned_date) >= 0 && daysFromToday(ms.planned_date) <= 5).forEach((ms) => {
      const n = db.Tasks.filter((t) => t.project_id === ms.project_id && t.status !== 'done' && t.due_date && t.due_date <= ms.planned_date).length
      if (n)
        out.push({
          key: `ms-${ms.id}`, tone: 'warn',
          text: L(`مایلستون «${ms.title}» ${fa(daysFromToday(ms.planned_date))} روز دیگر است و ${fa(n)} تسک باز دارد`, `Milestone “${ms.title}” is in ${daysFromToday(ms.planned_date)} days with ${n} open tasks`),
          action: L('مشاهده', 'View'), run: () => (window.location.hash = `#/projects/${ms.project_id}`),
        })
    })
    db.Risks.filter((r) => r.status !== 'closed' && riskScore(r) >= 15 && r.due_date && r.due_date < today).forEach((r) =>
      out.push({ key: `rk-${r.id}`, tone: 'bad', text: L(`مهلت اقدام برای ریسک «${r.title}» گذشته است`, `Action date passed for risk “${r.title}”`), action: L('به‌روزرسانی', 'Update'), run: () => open('Risks', r as never) }),
    )
    fuWaiting
      .filter((f) => f.created_at && daysBetween(f.created_at, today) >= 5)
      .forEach((f) =>
        out.push({
          key: `fw-${f.id}`, tone: 'brand',
          text: L(`${fa(daysBetween(f.created_at, today))} روز منتظر «${f.person}» برای «${f.subject}» هستید — وقت اسکالیشن؟`, `Waiting ${daysBetween(f.created_at, today)} days on ${f.person} for “${f.subject}” — escalate?`),
          action: L('باز کردن', 'Open'), run: () => open('FollowUps', f as never),
        }),
      )
    return out.slice(0, 8)
  }, [db, today, open, fuWaiting])

  const [tab, setTab] = useState<'today' | 'week' | 'later'>('today')
  const list = tab === 'today' ? myToday : tab === 'week' ? myWeek : myLater
  const hour = new Date().getHours()
  const greet = hour < 12 ? L('صبح بخیر', 'Good morning') : hour < 17 ? L('روز بخیر', 'Good afternoon') : L('عصر بخیر', 'Good evening')
  const overdue = myToday.filter((t) => t.due_date < today).length + fuDue.filter((f) => f.due_date < today).length

  return (
    <>
      <Band eyebrow={<><span>{L('فضای کار', 'Workspace')}</span><span className="opacity-40">/</span><span className="num">{fmtDate(today, 'long')}</span></>} title={<>{greet}{me ? <span className="text-band-sub">{L('، ', ', ')}{me}</span> : null}</>}
        sub={L('هرچه امروز نیاز به اقدام شما دارد، اینجاست.', 'Everything that needs you today, in one place.')}>
        <StatStrip
          items={[
            { label: L('تسک امروز و معوق', 'Tasks today & overdue'), value: fa(myToday.length) },
            { label: L('فالوآپ سررسیدشده', 'Follow-ups due'), value: fa(fuDue.length), tone: fuDue.length ? 'amber' : undefined },
            { label: L('منتظر پاسخ', 'Waiting on others'), value: fa(fuWaiting.length) },
            { label: L('عقب‌افتاده', 'Overdue'), value: fa(overdue), tone: overdue ? 'red' : 'green' },
            { label: L('این هفته', 'This week'), value: fa(myWeek.length) },
            { label: L('انجام‌شده امروز', 'Done today'), value: fa(doneToday.length), tone: doneToday.length ? 'green' : undefined },
          ]}
        />
      </Band>

      <Overlap className="space-y-4">
        {canEdit && (
          <div className="card p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented value={kind} onChange={setKind} options={[{ value: 'task', label: L('تسک', 'Task') }, { value: 'followup', label: L('فالوآپ', 'Follow-up') }]} />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && capture()}
                placeholder={kind === 'task' ? L('چه کاری باید انجام شود؟ Enter برای ثبت', 'What needs doing? Press Enter') : L('چه چیزی را از چه کسی پیگیری کنید؟', 'What do you need to chase, and from whom?')}
                className="h-11 min-w-[14rem] flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-sub/70"
              />
              <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted/70 p-1">
                <PersonPicker value={who} onChange={setWho} placeholder={kind === 'task' ? L('خودم', 'Me') : L('با چه کسی؟', 'With whom?')} />
                <ProjectPicker value={proj} onChange={setProj} />
                <select value={due} onChange={(e) => setDue(Number(e.target.value))} className="h-8 rounded-full bg-transparent px-2 text-xs outline-none hover:bg-surface">
                  <option value={0}>{L('امروز', 'Today')}</option>
                  <option value={1}>{L('فردا', 'Tomorrow')}</option>
                  <option value={3}>{L('۳ روز دیگر', 'In 3 days')}</option>
                  <option value={7}>{L('هفته‌ی بعد', 'Next week')}</option>
                  <option value={14}>{L('دو هفته', 'In 2 weeks')}</option>
                </select>
              </div>
              <button className="btn-primary h-11 px-5" onClick={capture} disabled={!text.trim()}>
                <Send size={15} className="rtl:-scale-x-100" /> {L('ثبت', 'Add')}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-5">
          <div className="min-w-0 space-y-4 xl:col-span-3">
            <Card
              pad={false}
              eyebrow={<span className="flex items-center gap-1.5"><ListChecks size={12} /> {L('کارهای من', 'My work')}</span>}
              title={L(`${fa(myOpen.length)} تسک باز`, `${myOpen.length} open tasks`)}
              action={
                <Segmented
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'today', label: `${L('امروز', 'Today')} · ${fa(myToday.length)}` },
                    { value: 'week', label: `${L('این هفته', 'Week')} · ${fa(myWeek.length)}` },
                    { value: 'later', label: `${L('بعداً', 'Later')} · ${fa(myLater.length)}` },
                  ]}
                />
              }
            >
              <div className="px-3 pb-3">
                {list.length === 0 ? <Empty text={tab === 'today' ? L('برای امروز کاری باقی نمانده', 'Nothing left for today') : L('موردی نیست', 'Nothing here')} icon={<Sparkles size={22} />} /> : list.map((t) => <TaskRow key={t.id} t={t} />)}
                {tab === 'today' && doneToday.length > 0 && (
                  <div className="mt-2 border-t border-line pt-2">
                    <div className="eyebrow px-2 pb-1">{L('انجام‌شده امروز', 'Done today')}</div>
                    {doneToday.map((t) => (
                      <TaskRow key={t.id} t={t} dense />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card pad={false} eyebrow={<span className="flex items-center gap-1.5"><BellRing size={12} /> {L('فالوآپ', 'Follow-ups')}</span>} title={L('امروز و معوق', 'Due today & overdue')} action={<Link to="/followups" className="text-xs font-medium text-sub hover:text-ink">{L('همه', 'All')} →</Link>}>
              <div className="px-2 pb-2">{fuDue.length === 0 ? <Empty text={L('فالوآپ سررسیدشده‌ای ندارید', 'No follow-ups due')} /> : fuDue.map((f) => <FollowUpRow key={f.id} f={f} />)}</div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card pad={false} eyebrow={<span className="flex items-center gap-1.5"><Hourglass size={12} /> {L('منتظر', 'Waiting')}</span>} title={L('منتظر پاسخ دیگران', 'Waiting on others')}>
                <div className="px-2 pb-2">{fuWaiting.length === 0 ? <Empty /> : fuWaiting.map((f) => <FollowUpRow key={f.id} f={f} compact />)}</div>
              </Card>
              <Card pad={false} eyebrow={<span className="flex items-center gap-1.5"><CalendarRange size={12} /> {L('پیش رو', 'Upcoming')}</span>} title={L('فالوآپ‌های بعدی', 'Next follow-ups')}>
                <div className="px-2 pb-2">{fuUpcoming.length === 0 ? <Empty /> : fuUpcoming.slice(0, 6).map((f) => <FollowUpRow key={f.id} f={f} compact />)}</div>
              </Card>
            </div>
          </div>

          <div className="min-w-0 space-y-4 xl:col-span-2">
            <section className="relative overflow-hidden rounded-2xl bg-band p-5 text-on-band shadow-card">
              <div className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[#1D4F61]/60 blur-3xl" />
              <div className="relative">
                <div className="eyebrow !text-band-sub flex items-center gap-1.5">
                  <Lightbulb size={12} /> {L('دستیار', 'Assistant')}
                </div>
                <h3 className="mt-1 text-[15px] font-semibold">{L('پیشنهادهای امروز', 'Today’s suggestions')}</h3>
                {suggestions.length === 0 ? (
                  <p className="mt-4 text-sm text-band-sub">{L('همه‌چیز مرتب است.', 'All clear.')}</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {suggestions.map((s) => (
                      <div key={s.key} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <span className={cx('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', s.tone === 'bad' ? 'bg-[#ff8a9a]' : s.tone === 'warn' ? 'bg-[#f5c565]' : 'bg-[#C1D6DE]')} />
                        <div className="flex-1 text-[13px] leading-6 text-white/85">{s.text}</div>
                        {canEdit && (
                          <button className="btn h-7 shrink-0 bg-white px-3 text-[11px] text-band" onClick={s.run}>
                            {s.action}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <Card eyebrow={<span className="flex items-center gap-1.5"><UserCheck size={12} /> {L('پیگیری تیم', 'Team nudges')}</span>} title={L('از چه کسی پیگیری کنم؟', 'Who should I nudge?')}>
              {nudge.length === 0 ? (
                <Empty text={L('هیچ تسک معوق یا مسدودی در تیم نیست', 'No overdue or blocked work on the team')} />
              ) : (
                <div className="space-y-2.5">
                  {nudge.map(([person, tasks]) => (
                    <div key={person} className="rounded-2xl border border-line p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={person} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{person}</div>
                          <div className="text-[11px] text-sub">
                            {L(`${fa(tasks.filter(isTaskOverdue).length)} معوق · ${fa(tasks.filter((t) => t.status === 'blocked').length)} مسدود`, `${tasks.filter(isTaskOverdue).length} overdue · ${tasks.filter((t) => t.status === 'blocked').length} blocked`)}
                          </div>
                        </div>
                        <button className="btn-outline btn-sm" onClick={() => copyNudge(person, tasks)}>
                          <Copy size={13} /> {L('پیام', 'Message')}
                        </button>
                      </div>
                      <ul className="mt-2.5 space-y-1">
                        {tasks.slice(0, 4).map((t) => (
                          <li key={t.id}>
                            <button onClick={() => open('Tasks', t as never)} className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-start text-xs hover:bg-muted">
                              <span className={cx('h-1.5 w-1.5 rounded-full', t.status === 'blocked' ? 'bg-bad' : 'bg-warn')} />
                              <span className="flex-1 truncate">{t.title}</span>
                              {t.status === 'blocked' ? <Chip className="bg-bad/10 text-bad">{L('مسدود', 'Blocked')}</Chip> : <span className="text-bad num">{L(`${fa(-daysFromToday(t.due_date))} روز`, `${-daysFromToday(t.due_date)}d`)}</span>}
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
      </Overlap>
    </>
  )
}

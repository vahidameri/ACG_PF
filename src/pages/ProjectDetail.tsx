import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Pencil, Plus, Target, Send, Crown, User } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor, type EditableSheet } from '../components/Editor'
import { Band, Card, Empty, HealthBadge, Overlap, Progress, StatStrip, Tabs, cx, healthText, Avatar, Chip, Segmented } from '../components/ui'
import { projectMetrics, riskScore } from '../lib/metrics'
import { fa, fmtDate, relDays, timeAgo } from '../lib/jalali'
import { PROJECT_STATUS, RISK_STATUS, RISK_TYPE, SCOPE_STATUS, SPRINT_STATUS, PRIORITY } from '../lib/labels'
import { L, lbl } from '../lib/i18n'
import { money, TaskRow, FollowUpRow, PinButton } from '../components/shared'
import { BurndownChart, Kanban, MilestoneList, RiskMatrix, SprintHeader, UpdateCard, VelocityChart, riskTone, ActivityFeed, HealthTrend, RagStrip } from '../components/widgets'
import { buildActivity } from '../lib/activity'
import { assess } from '../lib/rag'
import { renderMentions, stampToDate } from '../components/ItemSheet'
import { uid } from '../lib/api'
import { todayISO } from '../lib/jalali'

type Tab = 'overview' | 'scope' | 'milestones' | 'sprints' | 'tasks' | 'risks' | 'updates' | 'team'

export default function ProjectDetail() {
  const { id } = useParams()
  const { db, canEdit, upsert, me } = useStore()
  const { open } = useEditor()
  const [tab, setTab] = useState<Tab>('overview')
  const [taskView, setTaskView] = useState<'board' | 'list'>('board')
  const [note, setNote] = useState('')
  const p = db.Projects.find((x) => x.id === id)
  if (!p) return <Empty text={L('پروژه پیدا نشد', 'Project not found')} />

  const m = projectMetrics(p, db)
  const scope = db.Scope.filter((s) => s.project_id === p.id)
  const ms = db.Milestones.filter((x) => x.project_id === p.id)
  const sprints = db.Sprints.filter((s) => s.project_id === p.id).sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
  const tasks = db.Tasks.filter((t) => t.project_id === p.id)
  const risks = db.Risks.filter((r) => r.project_id === p.id).sort((a, b) => riskScore(b) - riskScore(a))
  const updates = db.Updates.filter((u) => u.project_id === p.id).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))
  const fus = db.FollowUps.filter((f) => f.project_id === p.id && f.status !== 'done')
  const allocs = db.Allocations.filter((a) => a.project_id === p.id)
  const notes = db.Comments.filter((c) => c.entity === 'Projects' && c.entity_id === p.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const AddBtn = ({ sheet, label, extra }: { sheet: EditableSheet; label: string; extra?: Record<string, unknown> }) =>
    canEdit ? (
      <button className="btn-outline btn-sm" onClick={() => open(sheet, { project_id: p.id, ...extra })}>
        <Plus size={14} /> {label}
      </button>
    ) : null

  const postNote = async () => {
    if (!note.trim()) return
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    await upsert('Comments', { id: uid('C'), entity: 'Projects', entity_id: p.id, author: me, body: note.trim(), created_at: `${todayISO()} ${pad(d.getHours())}:${pad(d.getMinutes())}` })
    setNote('')
  }

  return (
    <>
      <Band
        eyebrow={
          <>
            <Link to="/projects" className="flex items-center gap-1 hover:text-white">
              <ArrowRight size={12} className="ltr:rotate-180" /> {L('پروژه‌ها', 'Projects')}
            </Link>
            <span className="opacity-40">/</span>
            <span dir="ltr">{p.code}</span>
            <span className="opacity-40">/</span>
            <span>{lbl(PROJECT_STATUS, p.status)}</span>
            {p.phase && (
              <>
                <span className="opacity-40">/</span>
                <span>{p.phase}</span>
              </>
            )}
          </>
        }
        title={p.name}
        sub={
          <>
            {p.description}
            {p.objective && (
              <span className="mt-3 flex items-center gap-2 text-white/80">
                <Target size={14} /> {p.objective}
              </span>
            )}
          </>
        }
        actions={
          <>
            <span className="rounded-full bg-white/10 p-0.5">
              <PinButton id={p.id} className="text-white/70 hover:bg-white/10" />
            </span>
            {canEdit && (
              <button className="btn h-10 bg-white text-band" onClick={() => open('Projects', p as never)}>
                <Pencil size={15} /> {L('ویرایش', 'Edit')}
              </button>
            )}
          </>
        }
      >
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-band-sub">
          <span className="flex items-center gap-2">
            <User size={14} /> {L('مدیر', 'Lead')}: <span className="text-white">{p.owner}</span>
          </span>
          <span className="flex items-center gap-2">
            <Crown size={14} /> {L('اسپانسر', 'Sponsor')}: <span className="text-white">{p.sponsor}</span>
          </span>
          <span className="num">
            {fmtDate(p.start_date)} → {fmtDate(p.end_date)}
          </span>
        </div>
        <StatStrip
          items={[
            { label: L('پیشرفت', 'Progress'), value: `${fa(m.progress)}%`, tone: m.health },
            { label: L('زمان سپری‌شده', 'Time elapsed'), value: `${fa(m.elapsed)}%` },
            { label: m.daysLeft >= 0 ? L('تا ددلاین', 'To deadline') : L('از ددلاین گذشته', 'Past deadline'), value: fa(Math.abs(m.daysLeft)), tone: m.daysLeft < 0 ? 'red' : undefined, sub: L('روز', 'days') },
            { label: L('مصرف بودجه', 'Budget used'), value: `${fa(m.budgetUse)}%`, tone: m.budgetUse > 100 ? 'red' : undefined, sub: `${money(p.spent)} / ${money(p.budget)}` },
            { label: L('تسک باز', 'Open tasks'), value: fa(m.openTasks), sub: L(`${fa(m.overdueTasks)} معوق · ${fa(m.blockedTasks)} مسدود`, `${m.overdueTasks} overdue · ${m.blockedTasks} blocked`) },
            { label: L('ریسک باز', 'Open risks'), value: fa(m.openRisks), tone: m.highRisks ? 'red' : undefined, sub: L(`${fa(m.highRisks)} بحرانی`, `${m.highRisks} critical`) },
          ]}
        />
      </Band>

      <Overlap>
        <div className="card overflow-hidden">
          <div className="px-3">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: L('خلاصه', 'Overview') },
                { value: 'tasks', label: L('تسک‌ها', 'Tasks'), count: m.openTasks },
                { value: 'milestones', label: L('مایلستون‌ها', 'Milestones'), count: ms.length },
                { value: 'sprints', label: L('اسپرینت‌ها', 'Sprints'), count: sprints.length },
                { value: 'scope', label: L('اسکوپ', 'Scope'), count: scope.length },
                { value: 'risks', label: L('ریسک‌ها', 'Risks'), count: m.openRisks },
                { value: 'updates', label: L('گزارش‌ها', 'Updates'), count: updates.length },
                { value: 'team', label: L('تیم', 'Team'), count: allocs.length },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 fade-in" key={tab}>
          {tab === 'overview' && (
            <div className="grid gap-4 @xl:grid-cols-3">
              <Card eyebrow={L('تحلیل خودکار', 'Automatic analysis')} title={L('چرا این وضعیت؟', 'Why this status?')}>
                <div className="mb-4 flex items-end gap-3">
                  <div className={cx('display text-5xl num', healthText[m.health])}>{fa(m.score)}</div>
                  <div className="pb-1.5 text-xs leading-5 text-sub">
                    {L('امتیاز سلامت از ۱۰۰', 'Health score / 100')}
                    <br />
                    <HealthBadge h={m.health} />
                  </div>
                </div>
                <div className="mb-4">
                  <RagStrip a={assess(p, db)} />
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-[0.6875rem] text-sub">
                    <span>{L('پیشرفت', 'Progress')} {fa(m.progress)}%</span>
                    <span>{L('زمان', 'Time')} {fa(m.elapsed)}%</span>
                  </div>
                  <Progress value={m.progress} h={m.health} marker={m.elapsed} className="h-2" />
                </div>
              </Card>
              <Card eyebrow={L('رودمپ', 'Roadmap')} title={L('مایلستون‌ها', 'Milestones')} action={<AddBtn sheet="Milestones" label={L('مایلستون', 'Milestone')} />}>
                {ms.length ? <MilestoneList milestones={ms} /> : <Empty />}
              </Card>
              <div className="min-w-0 space-y-4">
                {m.activeSprint && (
                  <Card eyebrow={L('اسپرینت جاری', 'Current sprint')} title={<SprintHeader s={m.activeSprint} db={db} />}>
                    <BurndownChart sprint={m.activeSprint} db={db} height={180} />
                  </Card>
                )}
                <Card pad={false} eyebrow={L('پیگیری', 'Chasing')} title={L('فالوآپ‌های باز', 'Open follow-ups')} action={<AddBtn sheet="FollowUps" label={L('فالوآپ', 'Follow-up')} />}>
                  <div className="px-2 pb-2">{fus.length ? fus.map((f) => <FollowUpRow key={f.id} f={f} compact />) : <Empty />}</div>
                </Card>
              </div>
              <div className="min-w-0 @xl:col-span-2">
                {updates[0] ? (
                  <>
                    <div className="eyebrow mb-2 px-1">{L('آخرین گزارش وضعیت', 'Latest status update')}</div>
                    <UpdateCard u={updates[0]} />
                  </>
                ) : (
                  <Card>
                    <Empty text={L('هنوز گزارشی ثبت نشده', 'No updates yet')} action={<AddBtn sheet="Updates" label={L('گزارش هفتگی', 'Weekly update')} extra={{ author: p.owner, health: m.health }} />} />
                  </Card>
                )}
              </div>
              <Card eyebrow={L('یادداشت‌ها', 'Notes')} title={L('گفتگوی پروژه', 'Project discussion')}>
                {canEdit && (
                  <div className="mb-4 flex items-end gap-2 rounded-2xl border border-line p-2 focus-within:border-ink/30">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && postNote()}
                      rows={2}
                      placeholder={L('یادداشت برای تیم و مدیریت… (Ctrl+Enter)', 'Note for the team and leadership… (Ctrl+Enter)')}
                      className="flex-1 resize-none bg-transparent px-1 text-sm outline-none"
                    />
                    <button className="btn-primary btn-sm h-9 w-9 px-0" onClick={postNote} disabled={!note.trim()}>
                      <Send size={14} className="rtl:-scale-x-100" />
                    </button>
                  </div>
                )}
                <div className="space-y-4">
                  {notes.length === 0 && <div className="text-xs text-sub">{L('یادداشتی نیست', 'No notes yet')}</div>}
                  {notes.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={c.author} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 text-sm">
                          <span className="font-medium">{c.author}</span>
                          <span className="text-[0.6875rem] text-sub">{timeAgo(stampToDate(c.created_at))}</span>
                        </div>
                        <div className="mt-0.5 text-sm leading-7 text-ink/85">{renderMentions(c.body, db.Team.map((t) => t.name))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="@xl:col-span-2" eyebrow={L('فعالیت', 'Activity')} title={L('آنچه اخیراً در این پروژه گذشت', 'What happened recently')}>
                <ActivityFeed items={buildActivity(db, p.id, 10)} showProject={false} />
              </Card>
              <Card eyebrow={L('مشخصات', 'Key facts')} title={L('پروژه در یک نگاه', 'At a glance')}>
                <dl className="space-y-3 text-sm">
                  {[
                    [L('دسته', 'Category'), p.category],
                    [L('فاز', 'Phase'), p.phase],
                    [L('اولویت', 'Priority'), lbl(PRIORITY, p.priority)],
                    [L('شروع', 'Start'), fmtDate(p.start_date, 'long')],
                    [L('ددلاین', 'Deadline'), `${fmtDate(p.end_date, 'long')} · ${relDays(p.end_date)}`],
                    [L('مایلستون بعدی', 'Next milestone'), m.nextMilestone ? `${m.nextMilestone.title} · ${relDays(m.nextMilestone.planned_date)}` : '—'],
                    [L('اسپرینت جاری', 'Current sprint'), m.activeSprint ? m.activeSprint.name : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                      <dt className="shrink-0 text-sub">{k}</dt>
                      <dd className="text-end font-medium num">{v || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-[0.6875rem] text-sub">
                    <span>{L('هزینه‌شده', 'Spent')} {money(p.spent)}</span>
                    <span>{L('بودجه', 'Budget')} {money(p.budget)}</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className={cx('h-full rounded-full', m.budgetUse > 100 ? 'bg-bad' : 'bg-ink')} style={{ width: `${Math.min(100, m.budgetUse)}%` }} />
                    <div className="absolute inset-y-0 w-[2px] bg-good" style={{ insetInlineStart: `${m.progress}%` }} title={L('پیشرفت', 'Progress')} />
                  </div>
                  <div className="mt-1.5 text-[0.6875rem] text-sub">{L('خط سبز = پیشرفت کار؛ اگر نوار از آن جلوتر باشد، هزینه از کار جلو افتاده.', 'Green line = progress; if the bar runs past it, spend is ahead of delivery.')}</div>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
                  <span className="text-xs text-sub">{L('روند سلامت (گزارش‌ها)', 'Health trend (updates)')}</span>
                  <HealthTrend projectId={p.id} n={6} />
                </div>
              </Card>
            </div>
          )}

          {tab === 'tasks' && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <Segmented value={taskView} onChange={setTaskView} options={[{ value: 'board', label: L('بورد', 'Board') }, { value: 'list', label: L('لیست', 'List') }]} />
                <AddBtn sheet="Tasks" label={L('تسک', 'Task')} extra={{ sprint_id: m.activeSprint?.id || '' }} />
              </div>
              {taskView === 'board' ? (
                <Kanban tasks={tasks} defaults={{ project_id: p.id, sprint_id: m.activeSprint?.id || '' }} showProject={false} />
              ) : (
                <Card pad={false}>
                  <div className="p-2">{tasks.length ? tasks.map((t) => <TaskRow key={t.id} t={t} showProject={false} />) : <Empty />}</div>
                </Card>
              )}
            </>
          )}

          {tab === 'milestones' && (
            <Card eyebrow={L('رودمپ پروژه', 'Project roadmap')} title={L('مایلستون‌ها', 'Milestones')} action={<AddBtn sheet="Milestones" label={L('مایلستون', 'Milestone')} />}>
              {ms.length ? <MilestoneList milestones={ms} /> : <Empty />}
            </Card>
          )}

          {tab === 'sprints' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <AddBtn sheet="Sprints" label={L('اسپرینت جدید', 'New sprint')} />
              </div>
              {sprints.length === 0 && (
                <Card>
                  <Empty text={L('این پروژه اسپرینت ندارد', 'No sprints for this project')} />
                </Card>
              )}
              {sprints.length > 1 && (
                <Card eyebrow="Velocity" title={L('تعهد در برابر تحویل', 'Committed vs delivered')}>
                  <VelocityChart sprints={sprints} db={db} />
                </Card>
              )}
              <div className="grid gap-4 @lg:grid-cols-2">
                {sprints.map((s) => (
                  <Card
                    key={s.id}
                    title={<SprintHeader s={s} db={db} />}
                    action={
                      <span className="flex items-center gap-1">
                        <Chip className={s.status === 'active' ? 'bg-ink text-surface' : ''}>{lbl(SPRINT_STATUS, s.status)}</Chip>
                        {canEdit && (
                          <button className="icon-btn h-8 w-8" onClick={() => open('Sprints', s as never)}>
                            <Pencil size={13} />
                          </button>
                        )}
                      </span>
                    }
                  >
                    {s.status !== 'planned' ? <BurndownChart sprint={s} db={db} height={170} /> : <Empty text={L('هنوز شروع نشده', 'Not started')} />}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === 'scope' && (
            <div className="grid gap-4 @lg:grid-cols-2">
              {(['in', 'out'] as const).map((type) => (
                <Card key={type} eyebrow={L('اسکوپ', 'Scope')} title={type === 'in' ? L('داخل اسکوپ', 'In scope') : L('خارج از اسکوپ', 'Out of scope')} action={<AddBtn sheet="Scope" label={L('آیتم', 'Item')} extra={{ type }} />}>
                  <div className="space-y-2">
                    {scope
                      .filter((s) => s.type === type)
                      .map((s) => (
                        <button key={s.id} onClick={() => open('Scope', s as never)} className="w-full rounded-2xl border border-line p-3.5 text-start transition hover:border-line-strong">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cx('text-sm', s.status === 'removed' && 'text-sub line-through')}>{s.item}</span>
                            <Chip className={cx(s.status === 'delivered' && 'bg-good/10 text-good', s.status === 'changed' && 'bg-warn/10 text-warn', s.status === 'in_progress' && 'bg-brand-soft/50 text-ink')}>{lbl(SCOPE_STATUS, s.status)}</Chip>
                          </div>
                          {s.change_note && (
                            <div className="mt-1 text-xs text-sub">
                              {s.change_note} · {fmtDate(s.date)}
                            </div>
                          )}
                        </button>
                      ))}
                    {!scope.some((s) => s.type === type) && <Empty />}
                  </div>
                </Card>
              ))}
              <Card className="@lg:col-span-2" eyebrow="Change log" title={L('تغییرات اسکوپ', 'Scope changes')}>
                {scope.filter((s) => s.status === 'changed' || s.status === 'removed').length === 0 ? (
                  <Empty text={L('تغییری در اسکوپ ثبت نشده', 'No scope changes logged')} />
                ) : (
                  <div className="divide-y divide-line">
                    {scope
                      .filter((s) => s.status === 'changed' || s.status === 'removed')
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                          <span className="w-24 text-xs text-sub num">{fmtDate(s.date)}</span>
                          <Chip className={s.status === 'removed' ? 'bg-bad/10 text-bad' : 'bg-warn/10 text-warn'}>{lbl(SCOPE_STATUS, s.status)}</Chip>
                          <span className="font-medium">{s.item}</span>
                          <span className="text-xs text-sub">— {s.change_note}</span>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'risks' && (
            <div className="grid gap-4 @lg:grid-cols-5">
              <Card className="@lg:col-span-2" eyebrow={L('ماتریس', 'Matrix')} title={L('احتمال × اثر', 'Probability × impact')}>
                <RiskMatrix risks={risks.filter((r) => r.status !== 'closed')} onPick={(r) => open('Risks', r as never)} />
              </Card>
              <Card className="@lg:col-span-3" eyebrow="RAID" title={L('ریسک، مسئله، وابستگی و تصمیم', 'Risks, issues, dependencies, decisions')} action={<AddBtn sheet="Risks" label={L('مورد جدید', 'New item')} />}>
                <div className="space-y-2">
                  {risks.map((r, i) => (
                    <button key={r.id} onClick={() => open('Risks', r as never)} className={cx('flex w-full items-start gap-3 rounded-2xl border border-line p-3.5 text-start transition hover:border-line-strong', r.status === 'closed' && 'opacity-60')}>
                      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold num', riskTone(r))}>{fa(riskScore(r))}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <span className="text-sub num">#{fa(i + 1)}</span> {r.title}
                          <Chip>{lbl(RISK_TYPE, r.type)}</Chip>
                          <Chip>{lbl(RISK_STATUS, r.status)}</Chip>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-sub">{r.mitigation}</div>
                        <div className="mt-1 text-[0.6875rem] text-sub">
                          {r.owner} · {relDays(r.due_date)}
                        </div>
                      </div>
                    </button>
                  ))}
                  {!risks.length && <Empty />}
                </div>
              </Card>
            </div>
          )}

          {tab === 'updates' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <AddBtn sheet="Updates" label={L('گزارش هفتگی جدید', 'New weekly update')} extra={{ author: p.owner, health: m.health }} />
              </div>
              {updates.length ? (
                updates.map((u) => <UpdateCard key={u.id} u={u} />)
              ) : (
                <Card>
                  <Empty text={L('هنوز گزارشی ثبت نشده', 'No updates yet')} />
                </Card>
              )}
            </div>
          )}

          {tab === 'team' && (
            <Card eyebrow={L('تیم', 'Team')} title={L('اعضا و درصد تخصیص', 'Members & allocation')} action={<AddBtn sheet="Allocations" label={L('تخصیص', 'Allocation')} />}>
              <div className="grid gap-3 @sm:grid-cols-2 @lg:grid-cols-3">
                {allocs.map((a) => {
                  const mem = db.Team.find((x) => x.id === a.member_id)
                  if (!mem) return null
                  const total = db.Allocations.filter((x) => x.member_id === mem.id).reduce((s, x) => s + Number(x.percent), 0)
                  const memTasks = tasks.filter((t) => t.assignee === mem.name && t.status !== 'done').length
                  return (
                    <button key={a.id} onClick={() => open('Allocations', a as never)} className="flex items-center gap-3 rounded-2xl border border-line p-4 text-start transition hover:border-line-strong">
                      <Avatar name={mem.name} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{mem.name}</div>
                        <div className="text-xs text-sub">
                          {mem.role} · {L(`${fa(memTasks)} تسک باز`, `${memTasks} open tasks`)}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={Number(a.percent)} />
                          <span className="text-xs num">{fa(a.percent)}%</span>
                        </div>
                        {total > 100 && <div className="mt-1 text-[0.6875rem] text-bad">{L(`مجموع تخصیص ${fa(total)}٪ — بیش از ظرفیت`, `Total ${total}% — over capacity`)}</div>}
                      </div>
                    </button>
                  )
                })}
                {!allocs.length && <Empty />}
              </div>
            </Card>
          )}
        </div>
      </Overlap>
    </>
  )
}

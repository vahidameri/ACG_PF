import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Pencil, Plus, Target, CalendarDays, Wallet, User, Crown, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Card, Empty, HealthBadge, PriorityBadge, Progress, Ring, Tabs, cx, healthText, Avatar, Chip, Segmented } from '../components/ui'
import { projectMetrics, riskScore } from '../lib/metrics'
import { fa, fmtDate, relDays } from '../lib/jalali'
import { PROJECT_STATUS, RISK_STATUS, RISK_TYPE, SCOPE_STATUS, SPRINT_STATUS } from '../lib/labels'
import { money, TaskRow, FollowUpRow } from '../components/shared'
import { BurndownChart, Kanban, MilestoneList, RiskMatrix, SprintHeader, UpdateCard, VelocityChart, riskTone } from '../components/widgets'

type Tab = 'overview' | 'scope' | 'milestones' | 'sprints' | 'tasks' | 'risks' | 'updates' | 'team'

export default function ProjectDetail() {
  const { id } = useParams()
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const [tab, setTab] = useState<Tab>('overview')
  const [taskView, setTaskView] = useState<'board' | 'list'>('board')
  const p = db.Projects.find((x) => x.id === id)
  if (!p) return <Empty text="پروژه پیدا نشد" />

  const m = projectMetrics(p, db)
  const scope = db.Scope.filter((s) => s.project_id === p.id)
  const ms = db.Milestones.filter((x) => x.project_id === p.id)
  const sprints = db.Sprints.filter((s) => s.project_id === p.id).sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
  const tasks = db.Tasks.filter((t) => t.project_id === p.id)
  const risks = db.Risks.filter((r) => r.project_id === p.id).sort((a, b) => riskScore(b) - riskScore(a))
  const updates = db.Updates.filter((u) => u.project_id === p.id).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))
  const fus = db.FollowUps.filter((f) => f.project_id === p.id && f.status !== 'done')
  const allocs = db.Allocations.filter((a) => a.project_id === p.id)

  const AddBtn = ({ sheet, label, extra }: { sheet: Parameters<typeof open>[0]; label: string; extra?: Record<string, unknown> }) =>
    canEdit ? (
      <button className="btn-outline h-8 text-xs" onClick={() => open(sheet, { project_id: p.id, ...extra })}>
        <Plus size={14} /> {label}
      </button>
    ) : null

  return (
    <>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-xs text-sub hover:text-brand no-print">
        <ArrowRight size={14} /> همه‌ی پروژه‌ها
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Ring value={m.progress} size={84} stroke={8} h={m.health} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-sub" dir="ltr">
                {p.code}
              </span>
              <HealthBadge h={m.health} />
              <PriorityBadge p={p.priority} />
              <Chip>{PROJECT_STATUS[p.status]}</Chip>
              {p.phase && <Chip>فاز: {p.phase}</Chip>}
              {p.health_override && <Chip className="bg-warn/10 text-warn">سلامت دستی</Chip>}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{p.name}</h1>
            <p className="mt-1 text-sm text-sub">{p.description}</p>
            {p.objective && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand/5 px-2.5 py-1 text-xs text-brand">
                <Target size={13} /> {p.objective}
              </div>
            )}
          </div>
          {canEdit && (
            <button className="btn-outline no-print" onClick={() => open('Projects', p as never)}>
              <Pencil size={15} /> ویرایش
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 md:grid-cols-3 xl:grid-cols-6">
          <Meta icon={User} label="مدیر پروژه" value={<span className="flex items-center gap-1.5"><Avatar name={p.owner} size="xs" />{p.owner}</span>} />
          <Meta icon={Crown} label="اسپانسر" value={p.sponsor} />
          <Meta icon={CalendarDays} label="شروع" value={fmtDate(p.start_date)} />
          <Meta icon={CalendarDays} label="ددلاین" value={<span>{fmtDate(p.end_date)} <span className={cx('text-xs', m.daysLeft < 0 ? 'text-bad' : 'text-sub')}>({relDays(p.end_date)})</span></span>} />
          <Meta icon={Wallet} label="بودجه" value={money(p.budget)} />
          <Meta icon={Wallet} label="هزینه‌شده" value={<span className={m.budgetUse > 100 ? 'text-bad' : ''}>{money(p.spent)} ({fa(m.budgetUse)}٪)</span>} />
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-sub">
            <span>پیشرفت {fa(m.progress)}٪</span>
            <span>زمان سپری‌شده {fa(m.elapsed)}٪</span>
          </div>
          <Progress value={m.progress} h={m.health} marker={m.elapsed} className="h-2" />
        </div>
      </div>

      <div className="mt-5">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'خلاصه' },
            { value: 'scope', label: 'اسکوپ', count: scope.length },
            { value: 'milestones', label: 'مایلستون‌ها', count: ms.length },
            { value: 'sprints', label: 'اسپرینت‌ها', count: sprints.length },
            { value: 'tasks', label: 'تسک‌ها', count: m.openTasks },
            { value: 'risks', label: 'ریسک‌ها', count: m.openRisks },
            { value: 'updates', label: 'گزارش‌ها', count: updates.length },
            { value: 'team', label: 'تیم', count: allocs.length },
          ]}
        />
      </div>

      <div className="mt-5">
        {tab === 'overview' && (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="چرا این وضعیت؟ (تحلیل خودکار سلامت)">
              <div className="flex items-center gap-3 mb-3">
                <div className={cx('text-3xl font-black num', healthText[m.health])}>{fa(m.score)}</div>
                <div className="text-xs text-sub leading-5">امتیاز سلامت از ۱۰۰<br />بر اساس زمان، مایلستون، ریسک، بودجه و اسپرینت</div>
              </div>
              <ul className="space-y-2">
                {m.reasons.map((r, i) => (
                  <li key={i} className={cx('flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm', r.level === 'red' ? 'bg-bad/[0.07] text-bad' : r.level === 'amber' ? 'bg-warn/[0.08] text-warn' : 'bg-good/[0.07] text-good')}>
                    {r.level === 'green' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
                    {fa(r.text)}
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="تسک باز" v={m.openTasks} />
                <Mini label="معوق" v={m.overdueTasks} bad={m.overdueTasks > 0} />
                <Mini label="مسدود" v={m.blockedTasks} bad={m.blockedTasks > 0} />
              </div>
            </Card>
            <Card title="مایلستون‌ها" action={<AddBtn sheet="Milestones" label="مایلستون" />}>
              {ms.length ? <MilestoneList milestones={ms} /> : <Empty />}
            </Card>
            <div className="space-y-4">
              {m.activeSprint && (
                <Card title="اسپرینت جاری">
                  <SprintHeader s={m.activeSprint} db={db} />
                  <BurndownChart sprint={m.activeSprint} db={db} />
                </Card>
              )}
              <Card title="فالوآپ‌های باز" pad={false} action={<AddBtn sheet="FollowUps" label="فالوآپ" />}>
                <div className="p-2">{fus.length ? fus.map((f) => <FollowUpRow key={f.id} f={f} compact />) : <Empty />}</div>
              </Card>
            </div>
            {updates[0] && (
              <div className="xl:col-span-3">
                <div className="mb-2 text-sm font-semibold">آخرین گزارش وضعیت</div>
                <UpdateCard u={updates[0]} />
              </div>
            )}
          </div>
        )}

        {tab === 'scope' && (
          <div className="grid gap-4 lg:grid-cols-2">
            {(['in', 'out'] as const).map((type) => (
              <Card key={type} title={type === 'in' ? 'داخل اسکوپ' : 'خارج از اسکوپ'} action={<AddBtn sheet="Scope" label="آیتم" extra={{ type }} />}>
                <div className="space-y-2">
                  {scope
                    .filter((s) => s.type === type)
                    .map((s) => (
                      <button key={s.id} onClick={() => open('Scope', s as never)} className="w-full rounded-xl border border-line p-3 text-right hover:border-brand/30 transition">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cx('text-sm', s.status === 'removed' && 'line-through text-sub')}>{s.item}</span>
                          <Chip className={cx(s.status === 'delivered' && 'bg-good/10 text-good', s.status === 'changed' && 'bg-warn/10 text-warn', s.status === 'in_progress' && 'bg-brand/10 text-brand')}>{SCOPE_STATUS[s.status]}</Chip>
                        </div>
                        {s.change_note && <div className="mt-1 text-xs text-sub">{s.change_note} · {fmtDate(s.date)}</div>}
                      </button>
                    ))}
                  {!scope.some((s) => s.type === type) && <Empty />}
                </div>
              </Card>
            ))}
            <Card className="lg:col-span-2" title="تغییرات اسکوپ (Scope Change Log)">
              {scope.filter((s) => s.status === 'changed' || s.status === 'removed').length === 0 ? (
                <Empty text="تغییری در اسکوپ ثبت نشده" />
              ) : (
                <div className="divide-y divide-line">
                  {scope
                    .filter((s) => s.status === 'changed' || s.status === 'removed')
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .map((s) => (
                      <div key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="text-xs text-sub num w-20">{fmtDate(s.date)}</span>
                        <Chip className={s.status === 'removed' ? 'bg-bad/10 text-bad' : 'bg-warn/10 text-warn'}>{SCOPE_STATUS[s.status]}</Chip>
                        <span className="font-medium">{s.item}</span>
                        <span className="text-sub text-xs">— {s.change_note}</span>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === 'milestones' && (
          <Card title="مایلستون‌ها و رودمپ پروژه" action={<AddBtn sheet="Milestones" label="مایلستون" />}>
            {ms.length ? <MilestoneList milestones={ms} /> : <Empty />}
          </Card>
        )}

        {tab === 'sprints' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <AddBtn sheet="Sprints" label="اسپرینت جدید" />
            </div>
            {sprints.length === 0 && <Empty text="این پروژه اسپرینت ندارد" />}
            {sprints.length > 1 && (
              <Card title="Velocity (تعهد در برابر تحویل)">
                <VelocityChart sprints={sprints} db={db} />
              </Card>
            )}
            {sprints.map((s) => (
              <Card key={s.id} title={<SprintHeader s={s} db={db} />} action={<span className="flex items-center gap-2"><Chip className={s.status === 'active' ? 'bg-brand/10 text-brand' : ''}>{SPRINT_STATUS[s.status]}</Chip>{canEdit && <button className="btn-ghost h-7 px-2 text-xs" onClick={() => open('Sprints', s as never)}><Pencil size={13} /></button>}</span>}>
                {s.status !== 'planned' && <BurndownChart sprint={s} db={db} />}
              </Card>
            ))}
          </div>
        )}

        {tab === 'tasks' && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <Segmented value={taskView} onChange={setTaskView} options={[{ value: 'board', label: 'بورد' }, { value: 'list', label: 'لیست' }]} />
              <AddBtn sheet="Tasks" label="تسک" extra={{ sprint_id: m.activeSprint?.id || '' }} />
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

        {tab === 'risks' && (
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2" title="ماتریس ریسک">
              <RiskMatrix risks={risks.filter((r) => r.status !== 'closed')} onPick={(r) => open('Risks', r as never)} />
            </Card>
            <Card className="lg:col-span-3" title="ثبت ریسک‌ها، مسائل، وابستگی‌ها و تصمیم‌ها (RAID)" action={<AddBtn sheet="Risks" label="مورد جدید" />}>
              <div className="space-y-2">
                {risks.map((r, i) => (
                  <button key={r.id} onClick={() => open('Risks', r as never)} className={cx('flex w-full items-start gap-3 rounded-xl border border-line p-3 text-right hover:border-brand/30', r.status === 'closed' && 'opacity-60')}>
                    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold num', riskTone(r))}>{fa(riskScore(r))}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="text-sub num">#{fa(i + 1)}</span> {r.title}
                        <Chip>{RISK_TYPE[r.type]}</Chip>
                        <Chip>{RISK_STATUS[r.status]}</Chip>
                      </div>
                      <div className="mt-1 text-xs text-sub">{r.mitigation}</div>
                      <div className="mt-1 text-[11px] text-sub">مالک: {r.owner} · مهلت: {fmtDate(r.due_date)}</div>
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
              <AddBtn sheet="Updates" label="گزارش هفتگی جدید" extra={{ author: p.owner, health: m.health }} />
            </div>
            {updates.length ? updates.map((u) => <UpdateCard key={u.id} u={u} />) : <Empty text="هنوز گزارشی ثبت نشده" />}
          </div>
        )}

        {tab === 'team' && (
          <Card title="اعضای تیم و درصد تخصیص" action={<AddBtn sheet="Allocations" label="تخصیص" />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allocs.map((a) => {
                const mem = db.Team.find((x) => x.id === a.member_id)
                if (!mem) return null
                const total = db.Allocations.filter((x) => x.member_id === mem.id).reduce((s, x) => s + Number(x.percent), 0)
                const memTasks = tasks.filter((t) => t.assignee === mem.name && t.status !== 'done').length
                return (
                  <button key={a.id} onClick={() => open('Allocations', a as never)} className="flex items-center gap-3 rounded-xl border border-line p-3 text-right hover:border-brand/30">
                    <Avatar name={mem.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{mem.name}</div>
                      <div className="text-xs text-sub">{mem.role} · {fa(memTasks)} تسک باز</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={Number(a.percent)} />
                        <span className="text-xs num">{fa(a.percent)}٪</span>
                      </div>
                      {total > 100 && <div className="mt-1 text-[11px] text-bad">مجموع تخصیص: {fa(total)}٪ (بیش از ظرفیت)</div>}
                    </div>
                  </button>
                )
              })}
              {!allocs.length && <Empty />}
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

function Meta({ icon: Icon, label, value }: { icon: typeof User; label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] text-sub">
        <Icon size={12} /> {label}
      </div>
      <div className="mt-1 text-sm font-medium num">{value || '—'}</div>
    </div>
  )
}

function Mini({ label, v, bad }: { label: string; v: number; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/70 py-2">
      <div className={cx('text-lg font-bold num', bad && 'text-bad')}>{fa(v)}</div>
      <div className="text-[10px] text-sub">{label}</div>
    </div>
  )
}

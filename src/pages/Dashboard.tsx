import { Link } from 'react-router-dom'
import { Briefcase, TrendingUp, Wallet, Flag, ShieldAlert, Gavel, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store'
import { portfolioSummary, riskScore } from '../lib/metrics'
import { Card, Empty, HealthBadge, HealthDot, PageHeader, Progress, Stat, cx, Avatar, healthText, Segmented } from '../components/ui'
import { fa, fmtDate, fmtDayMonth, relDays, todayISO } from '../lib/jalali'
import { HEALTH, PROJECT_STATUS, RISK_TYPE } from '../lib/labels'
import { money, useProjectName, ProjectCard } from '../components/shared'
import { useEditor } from '../components/Editor'
import { useState } from 'react'
import type { Health } from '../lib/types'

export default function Dashboard() {
  const { db } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const s = portfolioSummary(db)
  const [view, setView] = useState<'table' | 'cards'>('table')

  const attention = s.live
    .map((p) => ({ p, m: s.metrics.get(p.id)! }))
    .filter((x) => x.m.health !== 'green' && x.p.status === 'active')
    .sort((a, b) => a.m.score - b.m.score)

  const topRisks = db.Risks.filter((r) => r.status !== 'closed' && r.type !== 'decision')
    .sort((a, b) => riskScore(b) - riskScore(a))
    .slice(0, 5)
  const decisions = db.Risks.filter((r) => r.type === 'decision' && r.status !== 'closed')

  const healthData = (['green', 'amber', 'red'] as Health[]).map((h) => ({ name: HEALTH[h], value: s.counts[h], h }))
  const budgetData = s.live
    .filter((p) => Number(p.budget) > 0)
    .map((p) => ({ name: p.code.replace('ACG-', ''), بودجه: Number(p.budget) / 1e9, هزینه: Number(p.spent) / 1e9, over: Number(p.spent) > Number(p.budget) }))

  const sorted = [...s.live].sort((a, b) => s.metrics.get(a.id)!.score - s.metrics.get(b.id)!.score)

  return (
    <>
      <PageHeader
        title="نمای کلی پورتفولیو"
        sub={`وضعیت ${fa(s.live.length)} پروژه‌ی جاری · ${fmtDate(todayISO(), 'long')}`}
        actions={
          <Link to="/report" className="btn-outline">
            گزارش مدیریتی قابل چاپ
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="پروژه‌های جاری" value={fa(s.live.length)} sub={`${fa(db.Projects.filter((p) => p.status === 'completed').length)} تکمیل‌شده`} icon={<Briefcase size={18} />} tone="brand" />
        <Stat label="میانگین پیشرفت" value={`${fa(s.avgProgress)}٪`} icon={<TrendingUp size={18} />} tone="brand" />
        <Stat label="در خطر" value={fa(s.counts.red)} sub={`${fa(s.counts.amber)} نیازمند توجه`} icon={<AlertTriangle size={18} />} tone={s.counts.red ? 'red' : 'green'} />
        <Stat label="مصرف بودجه" value={`${fa(s.budget ? Math.round((s.spent / s.budget) * 100) : 0)}٪`} sub={`${money(s.spent)} از ${money(s.budget)}`} icon={<Wallet size={18} />} tone={s.spent > s.budget ? 'red' : 'amber'} />
        <Stat label="مایلستون عقب‌افتاده" value={fa(s.overdueMilestones.length)} sub={`${fa(s.upcomingMilestones.length)} مورد در ۳۰ روز آینده`} icon={<Flag size={18} />} tone={s.overdueMilestones.length ? 'red' : 'green'} />
        <Stat label="ریسک‌های بحرانی" value={fa(db.Risks.filter((r) => r.status !== 'closed' && riskScore(r) >= 15).length)} sub={`${fa(db.Risks.filter((r) => r.status !== 'closed').length)} ریسک باز`} icon={<ShieldAlert size={18} />} tone="red" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-bad" /> نیازمند توجه مدیریت</span>}>
          {attention.length === 0 ? (
            <Empty text="همه‌ی پروژه‌ها در وضعیت سالم هستند 🎉" />
          ) : (
            <div className="divide-y divide-line">
              {attention.map(({ p, m }) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-start gap-3 py-3 first:pt-0 group">
                  <HealthDot h={m.health} pulse />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-brand transition">{p.name}</span>
                      <span className="text-xs text-sub">· {p.owner}</span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {m.reasons
                        .filter((r) => r.level !== 'green')
                        .slice(0, 3)
                        .map((r, i) => (
                          <li key={i} className={cx('text-xs flex items-center gap-1.5', healthText[r.level])}>
                            <span className="h-1 w-1 rounded-full bg-current" /> {fa(r.text)}
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="text-left">
                    <div className={cx('text-lg font-bold num', healthText[m.health])}>{fa(m.score)}</div>
                    <div className="text-[10px] text-sub">امتیاز سلامت</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="توزیع سلامت پروژه‌ها">
          <div className="flex items-center gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={healthData} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">
                    {healthData.map((d) => (
                      <Cell key={d.h} fill={`rgb(var(--${d.h === 'green' ? 'good' : d.h === 'amber' ? 'warn' : 'bad'}))`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fa(String(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {healthData.map((d) => (
                <div key={d.h} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <HealthDot h={d.h} /> {d.name}
                  </span>
                  <span className="font-bold num">{fa(d.value)}</span>
                </div>
              ))}
              <div className="border-t border-line pt-2 text-xs text-sub">سلامت به‌صورت خودکار از زمان، مایلستون‌ها، ریسک‌ها و بودجه محاسبه می‌شود.</div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        className="mt-4"
        pad={false}
        title={`همه‌ی پروژه‌های جاری`}
        action={<Segmented value={view} onChange={setView} options={[{ value: 'table', label: 'جدول' }, { value: 'cards', label: 'کارت' }]} />}
      >
        {view === 'cards' ? (
          <div className="grid gap-4 p-5 pt-2 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-y border-line bg-muted/40">
                <tr>
                  <th className="th">پروژه</th>
                  <th className="th">سلامت</th>
                  <th className="th w-56">پیشرفت در برابر زمان</th>
                  <th className="th">ددلاین</th>
                  <th className="th">بودجه</th>
                  <th className="th">مایلستون بعدی</th>
                  <th className="th">ریسک</th>
                  <th className="th">مدیر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((p) => {
                  const m = s.metrics.get(p.id)!
                  return (
                    <tr key={p.id} className="hover:bg-muted/40 transition">
                      <td className="td">
                        <Link to={`/projects/${p.id}`} className="font-medium hover:text-brand">
                          {p.name}
                        </Link>
                        <div className="text-[11px] text-sub">
                          {p.code} · {PROJECT_STATUS[p.status]} · {p.phase}
                        </div>
                      </td>
                      <td className="td">
                        <HealthBadge h={m.health} />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Progress value={m.progress} h={m.health} marker={m.elapsed} />
                          <span className="text-xs font-semibold num w-9">{fa(m.progress)}٪</span>
                        </div>
                        <div className={cx('mt-1 text-[11px] num', m.scheduleGap < -10 ? 'text-bad' : 'text-sub')}>
                          {m.scheduleGap >= 0 ? `${fa(m.scheduleGap)}٪ جلوتر از زمان` : `${fa(-m.scheduleGap)}٪ عقب‌تر از زمان`}
                        </div>
                      </td>
                      <td className="td">
                        <div className="text-sm num">{fmtDate(p.end_date)}</div>
                        <div className={cx('text-[11px]', m.daysLeft < 0 ? 'text-bad font-semibold' : 'text-sub')}>{relDays(p.end_date)}</div>
                      </td>
                      <td className="td">
                        <div className={cx('text-sm font-semibold num', m.budgetUse > 100 ? 'text-bad' : m.budgetUse > m.progress + 20 ? 'text-warn' : '')}>{fa(m.budgetUse)}٪</div>
                        <div className="text-[11px] text-sub">{money(p.budget)}</div>
                      </td>
                      <td className="td max-w-[12rem]">
                        {m.nextMilestone ? (
                          <>
                            <div className="truncate text-sm">{m.nextMilestone.title}</div>
                            <div className="text-[11px] text-sub">{fmtDayMonth(m.nextMilestone.planned_date)}</div>
                          </>
                        ) : (
                          <span className="text-sub">—</span>
                        )}
                      </td>
                      <td className="td">
                        <span className={cx('text-sm num', m.highRisks ? 'text-bad font-semibold' : '')}>{fa(m.openRisks)}</span>
                        {m.highRisks > 0 && <span className="text-[11px] text-bad"> ({fa(m.highRisks)} بحرانی)</span>}
                      </td>
                      <td className="td">
                        <Avatar name={p.owner} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="مایلستون‌های ۳۰ روز آینده" action={<Link to="/roadmap" className="text-xs text-brand flex items-center gap-1">رودمپ <ArrowLeft size={12} /></Link>}>
          {s.overdueMilestones.length + s.upcomingMilestones.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-1">
              {[...s.overdueMilestones, ...s.upcomingMilestones].slice(0, 8).map((m) => (
                <button key={m.id} onClick={() => open('Milestones', m as never)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-right hover:bg-muted/70">
                  <div className={cx('flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] leading-tight', m.planned_date < todayISO() ? 'bg-bad/10 text-bad' : 'bg-brand/10 text-brand')}>
                    <span className="text-sm font-bold">{fmtDayMonth(m.planned_date).split(' ')[0]}</span>
                    {fmtDayMonth(m.planned_date).split(' ')[1]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{m.title}</div>
                    <div className="truncate text-xs text-sub">{pname(m.project_id)}</div>
                  </div>
                  <span className={cx('text-[11px]', m.planned_date < todayISO() ? 'text-bad font-semibold' : 'text-sub')}>{relDays(m.planned_date)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="ریسک‌های برتر پورتفولیو" action={<Link to="/risks" className="text-xs text-brand flex items-center gap-1">همه <ArrowLeft size={12} /></Link>}>
          <div className="space-y-1">
            {topRisks.map((r) => {
              const sc = riskScore(r)
              return (
                <button key={r.id} onClick={() => open('Risks', r as never)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-right hover:bg-muted/70">
                  <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold num', sc >= 15 ? 'bg-bad text-white' : sc >= 8 ? 'bg-warn text-white' : 'bg-good text-white')}>{fa(sc)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{r.title}</div>
                    <div className="truncate text-xs text-sub">
                      {RISK_TYPE[r.type]} · {pname(r.project_id)} · {r.owner}
                    </div>
                  </div>
                </button>
              )
            })}
            {!topRisks.length && <Empty />}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Gavel size={16} className="text-brand" /> تصمیم‌های در انتظار مدیریت</span>}>
          {decisions.length === 0 ? (
            <Empty text="تصمیم معوقی وجود ندارد" />
          ) : (
            <div className="space-y-2">
              {decisions.map((r) => (
                <button key={r.id} onClick={() => open('Risks', r as never)} className="w-full rounded-xl border border-line p-3 text-right hover:border-brand/40 transition">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="mt-1 text-xs text-sub line-clamp-2">{r.mitigation}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-sub">
                    <span>{pname(r.project_id)}</span>
                    <span className={cx(r.due_date < todayISO() && 'text-bad font-semibold')}>مهلت: {relDays(r.due_date)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {budgetData.length > 0 && (
        <Card className="mt-4" title="بودجه در برابر هزینه (میلیارد ریال)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={budgetData} barGap={4}>
                <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgb(var(--sub))' }} axisLine={false} tickLine={false} reversed />
                <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--sub))' }} tickFormatter={(v) => fa(v)} axisLine={false} tickLine={false} width={30} orientation="right" />
                <Tooltip cursor={{ fill: 'rgb(var(--muted))' }} contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="بودجه" fill="rgb(var(--brand) / 0.25)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="هزینه" radius={[6, 6, 0, 0]}>
                  {budgetData.map((d, i) => (
                    <Cell key={i} fill={d.over ? 'rgb(var(--bad))' : 'rgb(var(--brand))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </>
  )
}

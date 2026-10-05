import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Zap } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Card, Empty, PageHeader, Progress, cx, Chip } from '../components/ui'
import { BurndownChart, Kanban, SprintHeader, VelocityChart } from '../components/widgets'
import { sprintCommitted, sprintDonePoints, sprintTasks } from '../lib/metrics'
import { daysBetween, daysFromToday, fa, todayISO } from '../lib/jalali'
import { SPRINT_STATUS } from '../lib/labels'

export default function Sprints() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const active = db.Sprints.filter((s) => s.status === 'active')
  const [sel, setSel] = useState(active[0]?.id || db.Sprints[0]?.id || '')
  const sprint = db.Sprints.find((s) => s.id === sel)
  const pname = (id: string) => db.Projects.find((p) => p.id === id)?.name || ''
  const projectsWithSprints = Array.from(new Set(db.Sprints.map((s) => s.project_id)))

  return (
    <>
      <PageHeader
        title="اسپرینت‌های توسعه"
        sub={`${fa(active.length)} اسپرینت فعال در ${fa(new Set(active.map((s) => s.project_id)).size)} پروژه`}
        actions={
          canEdit && (
            <button className="btn-primary" onClick={() => open('Sprints')}>
              <Plus size={16} /> اسپرینت جدید
            </button>
          )
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {active.map((s) => {
          const c = sprintCommitted(s, db)
          const d = sprintDonePoints(s, db)
          const pct = c ? Math.round((d / c) * 100) : 0
          const timePct = Math.round((Math.max(0, daysBetween(s.start_date, todayISO())) / Math.max(1, daysBetween(s.start_date, s.end_date))) * 100)
          const behind = pct < timePct - 25
          const blocked = sprintTasks(s, db).filter((t) => t.status === 'blocked').length
          return (
            <button key={s.id} onClick={() => setSel(s.id)} className={cx('card p-4 text-right transition hover:-translate-y-0.5', sel === s.id && 'ring-2 ring-brand')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-brand" />
                  <span className="font-semibold">{s.name}</span>
                </div>
                <span className={cx('text-xs', daysFromToday(s.end_date) <= 2 ? 'text-warn' : 'text-sub')}>{fa(Math.max(0, daysFromToday(s.end_date)))} روز مانده</span>
              </div>
              <div className="mt-1 text-xs text-sub truncate">{pname(s.project_id)} · {s.goal}</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="num">{fa(d)} / {fa(c)} پوینت</span>
                <span className={cx('font-semibold num', behind ? 'text-bad' : 'text-ink')}>{fa(pct)}٪</span>
              </div>
              <Progress value={pct} marker={timePct} h={behind ? 'red' : pct >= timePct ? 'green' : 'amber'} className="mt-1.5" />
              {blocked > 0 && <div className="mt-2 text-[11px] text-bad">{fa(blocked)} تسک مسدود</div>}
            </button>
          )
        })}
        {!active.length && <Empty text="اسپرینت فعالی وجود ندارد" />}
      </div>

      {sprint && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={sel} onChange={(e) => setSel(e.target.value)} className="input h-9 w-auto">
              {db.Sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {pname(s.project_id)} — {s.name} ({SPRINT_STATUS[s.status]})
                </option>
              ))}
            </select>
            <Link to={`/projects/${sprint.project_id}`} className="text-xs text-brand">
              مشاهده‌ی پروژه
            </Link>
            {canEdit && (
              <button className="btn-ghost h-8 text-xs" onClick={() => open('Sprints', sprint as never)}>
                ویرایش اسپرینت
              </button>
            )}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title={<SprintHeader s={sprint} db={db} />}>
              <BurndownChart sprint={sprint} db={db} />
            </Card>
            <Card title={`Velocity — ${pname(sprint.project_id)}`}>
              <VelocityChart sprints={db.Sprints.filter((s) => s.project_id === sprint.project_id)} db={db} />
            </Card>
          </div>
          <Card title="بورد اسپرینت" pad={false}>
            <div className="p-4 pt-1">
              <Kanban tasks={sprintTasks(sprint, db)} defaults={{ project_id: sprint.project_id, sprint_id: sprint.id }} showProject={false} />
            </div>
          </Card>
        </div>
      )}

      <Card className="mt-6" title="تاریخچه‌ی اسپرینت‌ها" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-y border-line bg-muted/40">
              <tr>
                <th className="th">پروژه</th>
                <th className="th">اسپرینت</th>
                <th className="th">هدف</th>
                <th className="th">وضعیت</th>
                <th className="th">تعهد</th>
                <th className="th">تحویل</th>
                <th className="th">نرخ تحقق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {projectsWithSprints.flatMap((pid) =>
                db.Sprints.filter((s) => s.project_id === pid)
                  .sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
                  .map((s) => {
                    const c = sprintCommitted(s, db)
                    const d = sprintDonePoints(s, db)
                    const r = c ? Math.round((d / c) * 100) : 0
                    return (
                      <tr key={s.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setSel(s.id)}>
                        <td className="td text-sub">{pname(s.project_id)}</td>
                        <td className="td font-medium">{s.name}</td>
                        <td className="td text-sub max-w-xs truncate">{s.goal}</td>
                        <td className="td"><Chip className={s.status === 'active' ? 'bg-brand/10 text-brand' : ''}>{SPRINT_STATUS[s.status]}</Chip></td>
                        <td className="td num">{fa(c)}</td>
                        <td className="td num">{fa(d)}</td>
                        <td className={cx('td num font-semibold', s.status === 'closed' && r < 80 ? 'text-bad' : s.status === 'closed' ? 'text-good' : '')}>{fa(r)}٪</td>
                      </tr>
                    )
                  }),
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

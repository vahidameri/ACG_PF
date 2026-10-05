import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Band, Card, Overlap, Avatar, cx, StatStrip } from '../components/ui'
import { fa } from '../lib/jalali'
import { isTaskOverdue } from '../lib/metrics'
import { L } from '../lib/i18n'

export default function Team() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const projects = db.Projects.filter((p) => p.status === 'active' || p.status === 'planning' || p.status === 'on_hold')

  const rows = db.Team.map((m) => {
    const allocs = db.Allocations.filter((a) => a.member_id === m.id)
    const total = allocs.reduce((s, a) => s + Number(a.percent), 0)
    const tasks = db.Tasks.filter((t) => t.assignee === m.name && t.status !== 'done')
    return { m, allocs, total, open: tasks.length, overdue: tasks.filter(isTaskOverdue).length }
  }).sort((a, b) => b.total - a.total)

  const over = rows.filter((r) => r.total > 100).length
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length) : 0
  const cellTone = (v: number) => (v === 0 ? '' : v >= 60 ? 'bg-ink text-surface' : v >= 30 ? 'bg-ink/45 text-surface' : 'bg-ink/[0.12] text-ink')

  return (
    <>
      <Band
        eyebrow={<span>{L('اجرا / ظرفیت', 'Execution / Capacity')}</span>}
        title={L('تیم و تخصیص منابع', 'Team & capacity')}
        sub={L('چه کسی روی چه پروژه‌ای است و کجا فشار کاری بیش از حد داریم.', 'Who is on what, and where we are over capacity.')}
        actions={
          canEdit && (
            <>
              <button className="btn h-10 border border-white/15 text-white" onClick={() => open('Allocations')}>
                <Plus size={16} /> {L('تخصیص', 'Allocation')}
              </button>
              <button className="btn h-10 bg-white text-band" onClick={() => open('Team')}>
                <Plus size={16} /> {L('عضو جدید', 'New member')}
              </button>
            </>
          )
        }
      >
        <StatStrip
          items={[
            { label: L('اعضای تیم', 'People'), value: fa(db.Team.length) },
            { label: L('میانگین بار کاری', 'Avg. load'), value: `${fa(avg)}%`, tone: avg > 100 ? 'red' : undefined },
            { label: L('بیش از ظرفیت', 'Over capacity'), value: fa(over), tone: over ? 'red' : 'green' },
            { label: L('پروژه‌های جاری', 'Live projects'), value: fa(projects.length) },
            { label: L('تسک باز', 'Open tasks'), value: fa(rows.reduce((s, r) => s + r.open, 0)) },
            { label: L('تسک معوق', 'Overdue tasks'), value: fa(rows.reduce((s, r) => s + r.overdue, 0)), tone: 'amber' },
          ]}
        />
      </Band>
      <Overlap>
        <Card pad={false} eyebrow={L('نقشه‌ی حرارتی', 'Heatmap')} title={L('درصد تخصیص هر نفر به هر پروژه', 'Allocation % per person per project')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem]">
              <thead className="border-y border-line">
                <tr>
                  <th className="th sticky start-0 z-10 bg-surface">{L('عضو', 'Member')}</th>
                  {projects.map((p) => (
                    <th key={p.id} className="th text-center">
                      <Link to={`/projects/${p.id}`} className="font-mono hover:text-ink" title={p.name} dir="ltr">
                        {p.code.replace('ACG-', '')}
                      </Link>
                    </th>
                  ))}
                  <th className="th text-center">{L('جمع', 'Total')}</th>
                  <th className="th text-center">{L('تسک باز', 'Open')}</th>
                  <th className="th text-center">{L('معوق', 'Overdue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ m, allocs, total, open: o, overdue }) => (
                  <tr key={m.id} className="transition hover:bg-muted/30">
                    <td className="td sticky start-0 z-10 bg-surface">
                      <button className="flex items-center gap-3 text-start" onClick={() => open('Team', m as never)}>
                        <Avatar name={m.name} size="md" />
                        <div>
                          <div className="text-sm font-medium">{m.name}</div>
                          <div className="text-[0.6875rem] text-sub">
                            {m.role} · {m.team}
                          </div>
                        </div>
                      </button>
                    </td>
                    {projects.map((p) => {
                      const a = allocs.find((x) => x.project_id === p.id)
                      const v = a ? Number(a.percent) : 0
                      return (
                        <td key={p.id} className="px-1 py-1.5 text-center">
                          <button
                            onClick={() => canEdit && open('Allocations', a ? (a as never) : { member_id: m.id, project_id: p.id })}
                            className={cx('h-10 w-full min-w-[3.25rem] rounded-xl text-xs font-semibold num transition hover:ring-2 hover:ring-brand/40', cellTone(v), !v && 'bg-muted/50 text-transparent hover:text-sub')}
                          >
                            {v ? `${fa(v)}%` : '+'}
                          </button>
                        </td>
                      )
                    })}
                    <td className="td text-center">
                      <span className={cx('rounded-full px-2.5 py-1 text-sm font-semibold num', total > 100 ? 'bg-bad/10 text-bad' : total >= 80 ? 'bg-good/10 text-good' : 'text-sub')}>{fa(total)}%</span>
                    </td>
                    <td className="td text-center">
                      <Link to={`/tasks?assignee=${encodeURIComponent(m.name)}`} className="num hover:underline">
                        {fa(o)}
                      </Link>
                    </td>
                    <td className={cx('td text-center num', overdue ? 'font-semibold text-bad' : 'text-sub')}>{fa(overdue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Overlap>
    </>
  )
}

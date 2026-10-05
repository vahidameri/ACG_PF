import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Card, PageHeader, Avatar, cx, Stat } from '../components/ui'
import { fa } from '../lib/jalali'
import { isTaskOverdue } from '../lib/metrics'
import { Users, Gauge, AlertTriangle } from 'lucide-react'

export default function Team() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const projects = db.Projects.filter((p) => p.status === 'active' || p.status === 'planning' || p.status === 'on_hold')

  const rows = db.Team.map((m) => {
    const allocs = db.Allocations.filter((a) => a.member_id === m.id)
    const total = allocs.reduce((s, a) => s + Number(a.percent), 0)
    const tasks = db.Tasks.filter((t) => t.assignee === m.name && t.status !== 'done')
    return { m, allocs, total, open: tasks.length, overdue: tasks.filter(isTaskOverdue).length, blocked: tasks.filter((t) => t.status === 'blocked').length }
  }).sort((a, b) => b.total - a.total)

  const over = rows.filter((r) => r.total > 100).length
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length) : 0

  const cellTone = (v: number) => (v === 0 ? '' : v >= 60 ? 'bg-brand text-white' : v >= 30 ? 'bg-brand/50 text-white' : 'bg-brand/20 text-brand')

  return (
    <>
      <PageHeader
        title="تیم و تخصیص منابع"
        sub="چه کسی روی چه پروژه‌ای کار می‌کند و کجا با فشار کاری بیش از حد مواجهیم"
        actions={
          canEdit && (
            <>
              <button className="btn-outline" onClick={() => open('Allocations')}>
                <Plus size={16} /> تخصیص
              </button>
              <button className="btn-primary" onClick={() => open('Team')}>
                <Plus size={16} /> عضو جدید
              </button>
            </>
          )
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
        <Stat label="اعضای تیم" value={fa(db.Team.length)} icon={<Users size={18} />} tone="brand" />
        <Stat label="میانگین بار کاری" value={`${fa(avg)}٪`} icon={<Gauge size={18} />} tone={avg > 100 ? 'red' : 'green'} />
        <Stat label="بیش از ظرفیت" value={fa(over)} sub="تخصیص بیش از ۱۰۰٪" icon={<AlertTriangle size={18} />} tone={over ? 'red' : 'green'} />
      </div>
      <Card pad={false} title="نقشه‌ی حرارتی تخصیص (٪)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-y border-line bg-muted/40">
              <tr>
                <th className="th sticky right-0 bg-muted/40">عضو</th>
                {projects.map((p) => (
                  <th key={p.id} className="th text-center">
                    <Link to={`/projects/${p.id}`} className="hover:text-brand" title={p.name}>
                      {p.code.replace('ACG-', '')}
                    </Link>
                  </th>
                ))}
                <th className="th text-center">جمع</th>
                <th className="th text-center">تسک باز</th>
                <th className="th text-center">معوق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ m, allocs, total, open: o, overdue }) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="td sticky right-0 bg-surface">
                    <button className="flex items-center gap-2 text-right" onClick={() => open('Team', m as never)}>
                      <Avatar name={m.name} />
                      <div>
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className="text-[11px] text-sub">{m.role} · {m.team}</div>
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
                          className={cx('h-9 w-full min-w-[3rem] rounded-lg text-xs font-semibold num transition hover:ring-2 hover:ring-brand/40', cellTone(v), !v && 'bg-muted/40 text-transparent hover:text-sub')}
                        >
                          {v ? `${fa(v)}٪` : '+'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="td text-center">
                    <span className={cx('rounded-lg px-2 py-1 text-sm font-bold num', total > 100 ? 'bg-bad/10 text-bad' : total >= 80 ? 'bg-good/10 text-good' : 'text-sub')}>{fa(total)}٪</span>
                  </td>
                  <td className="td text-center">
                    <Link to={`/tasks?assignee=${encodeURIComponent(m.name)}`} className="num hover:text-brand">
                      {fa(o)}
                    </Link>
                  </td>
                  <td className={cx('td text-center num', overdue ? 'text-bad font-semibold' : 'text-sub')}>{fa(overdue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

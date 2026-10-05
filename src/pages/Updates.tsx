import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Band, Card, Empty, FilterSelect, Overlap, Toolbar, HealthDot, cx } from '../components/ui'
import { UpdateCard } from '../components/widgets'
import { daysBetween, fa, todayISO } from '../lib/jalali'
import { L } from '../lib/i18n'

export default function Updates() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const [project, setProject] = useState('')
  const today = todayISO()
  const list = db.Updates.filter((u) => !project || u.project_id === project).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))
  const freshness = db.Projects.filter((p) => p.status === 'active').map((p) => {
    const last = db.Updates.filter((u) => u.project_id === p.id).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))[0]
    return { p, last, age: last ? daysBetween(last.week_date, today) : null }
  })

  return (
    <>
      <Band
        eyebrow={<span>{L('گزارش‌دهی', 'Reporting')}</span>}
        title={L('گزارش‌های وضعیت هفتگی', 'Weekly status updates')}
        sub={L('روایت مدیران پروژه از هر هفته — منبع اصلی جلسات لیدرشیپ.', 'Each lead’s weekly narrative — the source for leadership reviews.')}
        actions={
          canEdit && (
            <button className="btn h-10 bg-white text-band" onClick={() => open('Updates', { project_id: project })}>
              <Plus size={16} /> {L('گزارش جدید', 'New update')}
            </button>
          )
        }
      />
      <Overlap className="space-y-4">
        <Card eyebrow={L('تازگی', 'Freshness')} title={L('آخرین گزارش هر پروژه', 'Last update per project')}>
          <div className="flex flex-wrap gap-2">
            {freshness.map(({ p, last, age }) => (
              <button
                key={p.id}
                onClick={() => canEdit && open('Updates', { project_id: p.id, author: p.owner })}
                className={cx('flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs transition hover:border-line-strong', age === null || age > 7 ? 'border-bad/30 bg-bad/[0.04]' : 'border-line')}
              >
                {last && <HealthDot h={last.health} />}
                <span className="font-medium">{p.name}</span>
                <span className={cx(age === null || age > 7 ? 'text-bad' : 'text-sub')}>{age === null ? L('بدون گزارش', 'never') : age === 0 ? L('امروز', 'today') : L(`${fa(age)} روز پیش`, `${age}d ago`)}</span>
              </button>
            ))}
          </div>
        </Card>
        <Toolbar>
          <FilterSelect value={project} onChange={setProject} placeholder={L('همه‌ی پروژه‌ها', 'All projects')} options={db.Projects.map((p) => ({ value: p.id, label: p.name }))} />
          <Link to="/report" className="ms-auto text-xs font-medium text-sub hover:text-ink">
            {L('گزارش مدیریتی قابل چاپ', 'Printable executive report')} →
          </Link>
        </Toolbar>
        <div className="stagger space-y-4">
          {list.length ? (
            list.map((u) => <UpdateCard key={u.id} u={u} showProject />)
          ) : (
            <Card>
              <Empty text={L('گزارشی ثبت نشده', 'No updates yet')} />
            </Card>
          )}
        </div>
      </Overlap>
    </>
  )
}

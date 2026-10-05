import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Empty, FilterSelect, PageHeader, Toolbar, HealthDot, cx } from '../components/ui'
import { UpdateCard } from '../components/widgets'
import { daysBetween, fa, todayISO } from '../lib/jalali'
import { Link } from 'react-router-dom'

export default function Updates() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const [project, setProject] = useState('')
  const today = todayISO()
  const list = db.Updates.filter((u) => !project || u.project_id === project).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))

  const active = db.Projects.filter((p) => p.status === 'active')
  const freshness = active.map((p) => {
    const last = db.Updates.filter((u) => u.project_id === p.id).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))[0]
    return { p, last, age: last ? daysBetween(last.week_date, today) : null }
  })

  return (
    <>
      <PageHeader
        title="گزارش‌های وضعیت هفتگی"
        sub="روایت مدیران پروژه از وضعیت هر هفته — منبع اصلی برای جلسات لیدرشیپ"
        actions={
          canEdit && (
            <button className="btn-primary" onClick={() => open('Updates', { project_id: project })}>
              <Plus size={16} /> گزارش جدید
            </button>
          )
        }
      />
      <div className="card mb-6 p-4">
        <div className="mb-3 text-sm font-semibold">تازگی گزارش‌ها</div>
        <div className="flex flex-wrap gap-2">
          {freshness.map(({ p, last, age }) => (
            <button
              key={p.id}
              onClick={() => (canEdit ? open('Updates', { project_id: p.id, author: p.owner }) : undefined)}
              className={cx('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition hover:border-brand/40', age === null || age > 7 ? 'border-bad/30 bg-bad/[0.04]' : 'border-line')}
            >
              {last && <HealthDot h={last.health} />}
              <span className="font-medium">{p.name}</span>
              <span className={cx(age === null || age > 7 ? 'text-bad' : 'text-sub')}>{age === null ? 'بدون گزارش' : age === 0 ? 'امروز' : `${fa(age)} روز پیش`}</span>
            </button>
          ))}
        </div>
      </div>
      <Toolbar>
        <FilterSelect value={project} onChange={setProject} placeholder="همه‌ی پروژه‌ها" options={db.Projects.map((p) => ({ value: p.id, label: p.name }))} />
      </Toolbar>
      <div className="space-y-4">
        {list.length ? (
          list.map((u) => (
            <div key={u.id}>
              <UpdateCard u={u} showProject />
            </div>
          ))
        ) : (
          <Empty text="گزارشی ثبت نشده" />
        )}
      </div>
      <div className="mt-4 text-center text-xs text-sub">
        <Link to="/report" className="text-brand">
          تهیه‌ی گزارش مدیریتی قابل چاپ ←
        </Link>
      </div>
    </>
  )
}

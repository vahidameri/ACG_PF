import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { PageHeader, Toolbar, FilterSelect, Empty } from '../components/ui'
import { ProjectCard } from '../components/shared'
import { PRIORITY, PROJECT_STATUS, HEALTH } from '../lib/labels'
import { projectMetrics } from '../lib/metrics'
import { fa } from '../lib/jalali'

export default function Projects() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('active')
  const [cat, setCat] = useState('')
  const [prio, setPrio] = useState('')
  const [health, setHealth] = useState('')
  const [owner, setOwner] = useState('')

  const cats = Array.from(new Set(db.Projects.map((p) => p.category).filter(Boolean)))
  const owners = Array.from(new Set(db.Projects.map((p) => p.owner).filter(Boolean)))
  const list = db.Projects.filter(
    (p) =>
      (!status || p.status === status) &&
      (!cat || p.category === cat) &&
      (!prio || p.priority === prio) &&
      (!owner || p.owner === owner) &&
      (!health || projectMetrics(p, db).health === health) &&
      (!q || p.name.includes(q) || p.code.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <>
      <PageHeader
        title="پروژه‌ها"
        sub={`${fa(list.length)} پروژه از ${fa(db.Projects.length)}`}
        actions={
          canEdit && (
            <button className="btn-primary" onClick={() => open('Projects')}>
              <Plus size={16} /> پروژه‌ی جدید
            </button>
          )
        }
      />
      <Toolbar>
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-sub" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className="input h-9 w-56 pr-9" />
        </div>
        <FilterSelect value={status} onChange={setStatus} placeholder="همه‌ی وضعیت‌ها" options={Object.entries(PROJECT_STATUS).map(([value, label]) => ({ value, label }))} />
        <FilterSelect value={health} onChange={setHealth} placeholder="سلامت" options={Object.entries(HEALTH).map(([value, label]) => ({ value, label }))} />
        <FilterSelect value={prio} onChange={setPrio} placeholder="اولویت" options={Object.entries(PRIORITY).map(([value, label]) => ({ value, label }))} />
        <FilterSelect value={cat} onChange={setCat} placeholder="دسته" options={cats.map((c) => ({ value: c, label: c }))} />
        <FilterSelect value={owner} onChange={setOwner} placeholder="مدیر پروژه" options={owners.map((c) => ({ value: c, label: c }))} />
      </Toolbar>
      {list.length === 0 ? (
        <Empty text="پروژه‌ای با این فیلترها پیدا نشد" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  )
}

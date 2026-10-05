import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, ArrowUpDown } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Card, Empty, FilterSelect, PageHeader, Segmented, Toolbar, Due, PriorityBadge, TaskStatusBadge, Person, cx } from '../components/ui'
import { Kanban } from '../components/widgets'
import { PRIORITY, PRIORITY_ORDER, TASK_STATUS } from '../lib/labels'
import { addDays, fa, todayISO } from '../lib/jalali'
import { isTaskOverdue } from '../lib/metrics'
import { useProjectName } from '../components/shared'
import type { Task } from '../lib/types'

type SortKey = 'due_date' | 'priority' | 'status' | 'assignee'

export default function Tasks() {
  const { db, me, canEdit } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'list' | 'board'>('list')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('due_date')
  const get = (k: string) => params.get(k) || ''
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params)
    if (v) n.set(k, v)
    else n.delete(k)
    setParams(n, { replace: true })
  }
  const project = get('project')
  const assignee = get('assignee')
  const status = get('status') || (view === 'list' ? 'open' : '')
  const prio = get('priority')
  const due = get('due')
  const today = todayISO()

  const assignees = Array.from(new Set(db.Tasks.map((t) => t.assignee).filter(Boolean)))

  const list = useMemo(() => {
    const out = db.Tasks.filter((t) => {
      if (project && t.project_id !== project) return false
      if (assignee && t.assignee !== assignee) return false
      if (status === 'open' ? t.status === 'done' : status && status !== 'all' && t.status !== status) return false
      if (prio && t.priority !== prio) return false
      if (due === 'overdue' && !isTaskOverdue(t)) return false
      if (due === 'today' && t.due_date !== today) return false
      if (due === 'week' && !(t.due_date >= today && t.due_date <= addDays(today, 7))) return false
      if (due === 'none' && t.due_date) return false
      if (q && !t.title.includes(q) && !t.description.includes(q) && !t.tags.includes(q)) return false
      return true
    })
    const cmp: Record<SortKey, (a: Task, b: Task) => number> = {
      due_date: (a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'),
      priority: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      status: (a, b) => a.status.localeCompare(b.status),
      assignee: (a, b) => a.assignee.localeCompare(b.assignee, 'fa'),
    }
    return out.sort(cmp[sort])
  }, [db.Tasks, project, assignee, status, prio, due, q, sort, today])

  const SortTh = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="th">
      <button className={cx('inline-flex items-center gap-1', sort === k && 'text-brand')} onClick={() => setSort(k)}>
        {children} <ArrowUpDown size={11} />
      </button>
    </th>
  )

  return (
    <>
      <PageHeader
        title="تسک‌ها"
        sub={`${fa(list.length)} تسک · ${fa(db.Tasks.filter(isTaskOverdue).length)} معوق · ${fa(db.Tasks.filter((t) => t.status === 'blocked').length)} مسدود`}
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'لیست' }, { value: 'board', label: 'بورد کانبان' }]} />
            {canEdit && (
              <button className="btn-primary" onClick={() => open('Tasks', { project_id: project, assignee: assignee || me })}>
                <Plus size={16} /> تسک جدید
              </button>
            )}
          </>
        }
      />
      <Toolbar>
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-sub" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className="input h-9 w-52 pr-9" />
        </div>
        <FilterSelect value={project} onChange={(v) => set('project', v)} placeholder="همه‌ی پروژه‌ها" options={db.Projects.map((p) => ({ value: p.id, label: p.name }))} />
        <FilterSelect value={assignee} onChange={(v) => set('assignee', v)} placeholder="همه‌ی افراد" options={assignees.map((a) => ({ value: a, label: a === me ? `${a} (من)` : a }))} />
        {view === 'list' && (
          <FilterSelect value={get('status')} onChange={(v) => set('status', v)} placeholder="باز (همه به‌جز انجام‌شده)" options={[{ value: 'all', label: 'همه' }, ...Object.entries(TASK_STATUS).map(([value, label]) => ({ value, label }))]} />
        )}
        <FilterSelect value={prio} onChange={(v) => set('priority', v)} placeholder="اولویت" options={Object.entries(PRIORITY).map(([value, label]) => ({ value, label }))} />
        <FilterSelect
          value={due}
          onChange={(v) => set('due', v)}
          placeholder="سررسید"
          options={[
            { value: 'overdue', label: 'معوق' },
            { value: 'today', label: 'امروز' },
            { value: 'week', label: '۷ روز آینده' },
            { value: 'none', label: 'بدون سررسید' },
          ]}
        />
        {canEdit && me && (
          <button className={cx('btn-outline h-9', assignee === me && 'border-brand text-brand')} onClick={() => set('assignee', assignee === me ? '' : me)}>
            فقط تسک‌های من
          </button>
        )}
      </Toolbar>

      {view === 'board' ? (
        <Kanban tasks={list} defaults={{ project_id: project, assignee: assignee || me }} />
      ) : (
        <Card pad={false}>
          {list.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-line bg-muted/40">
                  <tr>
                    <th className="th">عنوان</th>
                    <th className="th">پروژه</th>
                    <SortTh k="assignee">مسئول</SortTh>
                    <SortTh k="status">وضعیت</SortTh>
                    <SortTh k="priority">اولویت</SortTh>
                    <SortTh k="due_date">سررسید</SortTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((t) => (
                    <tr key={t.id} className={cx('cursor-pointer hover:bg-muted/40', isTaskOverdue(t) && 'bg-bad/[0.03]')} onClick={() => open('Tasks', t as never)}>
                      <td className="td">
                        <div className={cx('font-medium', t.status === 'done' && 'line-through text-sub')}>{t.title}</div>
                        {t.tags && (
                          <div className="mt-0.5 flex gap-1">
                            {t.tags.split(',').map((g) => g.trim()).filter(Boolean).map((g) => (
                              <span key={g} className="text-[10px] text-sub" dir="ltr">#{g}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="td text-sub text-xs">{pname(t.project_id) || '—'}</td>
                      <td className="td"><Person name={t.assignee} /></td>
                      <td className="td"><TaskStatusBadge s={t.status} /></td>
                      <td className="td"><PriorityBadge p={t.priority} /></td>
                      <td className="td"><Due iso={t.due_date} done={t.status === 'done'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  )
}

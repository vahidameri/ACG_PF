import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Card, Empty, FilterSelect, PageHeader, Segmented, Toolbar, Avatar, cx } from '../components/ui'
import { FollowUpRow } from '../components/shared'
import { addDays, fa, todayISO } from '../lib/jalali'
import type { FollowUp } from '../lib/types'

export default function FollowUps() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const [project, setProject] = useState('')
  const [person, setPerson] = useState('')
  const [group, setGroup] = useState<'time' | 'person'>('time')
  const [showDone, setShowDone] = useState(false)
  const today = todayISO()
  const week = addDays(today, 7)

  const all = db.FollowUps.filter((f) => (!project || f.project_id === project) && (!person || f.person === person))
  const openFu = all.filter((f) => f.status !== 'done')
  const people = Array.from(new Set(db.FollowUps.map((f) => f.person).filter(Boolean)))
  const sort = (a: FollowUp, b: FollowUp) => (a.due_date || '9999').localeCompare(b.due_date || '9999')

  const groups: { key: string; title: string; tone: string; items: FollowUp[] }[] =
    group === 'time'
      ? [
          { key: 'overdue', title: 'معوق', tone: 'text-bad', items: openFu.filter((f) => f.status === 'open' && f.due_date && f.due_date < today) },
          { key: 'today', title: 'امروز', tone: 'text-warn', items: openFu.filter((f) => f.status === 'open' && f.due_date === today) },
          { key: 'waiting', title: 'منتظر پاسخ', tone: 'text-purple-500', items: openFu.filter((f) => f.status === 'waiting') },
          { key: 'week', title: 'این هفته', tone: 'text-brand', items: openFu.filter((f) => f.status === 'open' && f.due_date > today && f.due_date <= week) },
          { key: 'later', title: 'بعداً', tone: 'text-sub', items: openFu.filter((f) => f.status === 'open' && (!f.due_date || f.due_date > week)) },
        ]
      : people
          .map((p) => ({ key: p, title: p, tone: '', items: openFu.filter((f) => f.person === p) }))
          .filter((g) => g.items.length)
          .sort((a, b) => b.items.length - a.items.length)

  const done = all.filter((f) => f.status === 'done').sort((a, b) => (b.done_at || '').localeCompare(a.done_at || ''))

  return (
    <>
      <PageHeader
        title="فالوآپ‌ها"
        sub={`${fa(openFu.length)} پیگیری باز · ${fa(openFu.filter((f) => f.status === 'open' && f.due_date < today).length)} معوق · ${fa(openFu.filter((f) => f.status === 'waiting').length)} منتظر پاسخ`}
        actions={
          canEdit && (
            <button className="btn-primary" onClick={() => open('FollowUps', { project_id: project, person })}>
              <Plus size={16} /> فالوآپ جدید
            </button>
          )
        }
      />
      <Toolbar>
        <Segmented value={group} onChange={setGroup} options={[{ value: 'time', label: 'بر اساس زمان' }, { value: 'person', label: 'بر اساس فرد' }]} />
        <FilterSelect value={project} onChange={setProject} placeholder="همه‌ی پروژه‌ها" options={db.Projects.map((p) => ({ value: p.id, label: p.name }))} />
        <FilterSelect value={person} onChange={setPerson} placeholder="همه‌ی افراد" options={people.map((p) => ({ value: p, label: p }))} />
        <label className="flex items-center gap-2 text-xs text-sub mr-auto">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> نمایش بسته‌شده‌ها
        </label>
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <Card
              key={g.key}
              pad={false}
              title={
                <span className={cx('flex items-center gap-2', g.tone)}>
                  {group === 'person' && <Avatar name={g.title} size="xs" />}
                  {g.title} <span className="text-sub font-normal num">({fa(g.items.length)})</span>
                </span>
              }
            >
              <div className="p-2">{[...g.items].sort(sort).map((f) => <FollowUpRow key={f.id} f={f} />)}</div>
            </Card>
          ))}
        {groups.every((g) => !g.items.length) && (
          <div className="lg:col-span-2">
            <Empty text="فالوآپ بازی وجود ندارد" />
          </div>
        )}
      </div>

      {showDone && (
        <Card className="mt-4" pad={false} title={`بسته‌شده (${fa(done.length)})`}>
          <div className="p-2">{done.length ? done.map((f) => <FollowUpRow key={f.id} f={f} compact />) : <Empty />}</div>
        </Card>
      )}
    </>
  )
}

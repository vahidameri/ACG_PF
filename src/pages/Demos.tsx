import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, Check, ExternalLink, PackageCheck, Pencil, Plus, Presentation, Video, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { useAuto } from '../lib/automations'
import { HubNav } from '../components/HubNav'
import { Checklist } from '../components/ItemSheet'
import { Band, Card, Chip, Empty, Overlap, Progress, Segmented, Sheet, TaskStatusBadge, cx } from '../components/ui'
import { L, lbl, locale } from '../lib/i18n'
import { fa, fmtDate, fmtWeekday, relDays, todayISO } from '../lib/jalali'
import { DELIVERABLE_STATUS, MEETING_SERIES } from '../lib/labels'
import { PREP, isCeremony, isReady, itemsOf, readiness, refsOf } from '../lib/demos'
import type { Meeting } from '../lib/types'

type Kind = 'all' | 'demo' | 'planning' | 'retro'
const byWhen = (a: Meeting, b: Meeting) => (a.date + a.time < b.date + b.time ? -1 : 1)
const tone = (pct: number) => (pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red') as 'green' | 'amber' | 'red'

/** Planning, demo & review and retro meetings — what each will show and whether it is ready. */
export default function Demos() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const [kind, setKind] = useState<Kind>('all')
  const [sel, setSel] = useState('')
  const today = todayISO()
  const all = db.Meetings.filter(isCeremony).filter((m) => kind === 'all' || m.series === kind)
  const upcoming = all.filter((m) => m.status === 'scheduled' && m.date >= today).sort(byWhen)
  const past = all.filter((m) => !(m.status === 'scheduled' && m.date >= today)).sort(byWhen).reverse().slice(0, 12)
  const selected = db.Meetings.find((m) => m.id === sel)

  const plan = (series: 'demo' | 'planning' | 'retro') =>
    open('Meetings', {
      series, title: lbl(MEETING_SERIES, series), duration: series === 'demo' ? 60 : 45,
      checklist: (PREP[series] || []).map(([f, e]) => `[ ] ${locale.lang === 'fa' ? f : e}`).join('\n'),
    })

  return (
    <>
      <Band nav={<HubNav hub="plan" />}
        title={L('دمو و برنامه‌ریزی', 'Demos & planning')}
        sub={L('برای هر دمو مشخص کنید چه چیزی نمایش داده می‌شود و چقدر آماده است؛ جلسه خودش در تقویم گوگل ثبت می‌شود.', 'Choose what each demo shows and track readiness; the meeting goes on Google Calendar by itself.')}
        actions={canEdit && (
          <div className="flex flex-wrap gap-2">
            <button className="btn h-10 bg-white text-band" onClick={() => plan('demo')}><Plus size={16} /> {L('دموی جدید', 'New demo')}</button>
            <button className="btn h-10 border border-white/20 text-white" onClick={() => plan('planning')}>{L('برنامه‌ریزی اسپرینت', 'Sprint planning')}</button>
            <button className="btn h-10 border border-white/20 text-white" onClick={() => plan('retro')}>{L('رترو', 'Retro')}</button>
          </div>
        )}
      >
        <Segmented dark value={kind} onChange={setKind} options={[
          { value: 'all', label: L('همه', 'All') },
          { value: 'demo', label: lbl(MEETING_SERIES, 'demo') },
          { value: 'planning', label: lbl(MEETING_SERIES, 'planning') },
          { value: 'retro', label: lbl(MEETING_SERIES, 'retro') },
        ]} />
      </Band>
      <Overlap className="space-y-4">
        <Card eyebrow={L('پیش رو', 'Coming up')} title={L(`${fa(upcoming.length)} جلسه`, `${upcoming.length} sessions`)}>
          {upcoming.length ? (
            <div className="grid gap-3 @md:grid-cols-2 @xl:grid-cols-3">{upcoming.map((m) => <DemoCard key={m.id} m={m} onOpen={() => setSel(m.id)} />)}</div>
          ) : (
            <Empty icon={<Presentation size={20} />} text={L('دمو یا جلسه‌ی برنامه‌ریزی‌ای پیش رو نیست', 'No demo or planning session coming up')}
              action={canEdit && <button className="btn btn-primary h-9" onClick={() => plan('demo')}><Plus size={14} /> {L('دموی جدید', 'New demo')}</button>} />
          )}
        </Card>
        {past.length > 0 && (
          <Card eyebrow={L('گذشته', 'Past')} title={L('دموها و جلسه‌های قبلی', 'Earlier sessions')}>
            <div className="grid gap-3 @md:grid-cols-2 @xl:grid-cols-3">{past.map((m) => <DemoCard key={m.id} m={m} onOpen={() => setSel(m.id)} />)}</div>
          </Card>
        )}
      </Overlap>
      <Sheet open={!!selected} onClose={() => setSel('')} wide header={selected && <h2 className="truncate font-semibold">{selected.title}</h2>}>
        {selected && <Planner m={selected} />}
      </Sheet>
    </>
  )
}

function DemoCard({ m, onOpen }: { m: Meeting; onOpen: () => void }) {
  const { db } = useStore()
  const r = readiness(m, db)
  const project = db.Projects.find((p) => p.id === m.project_id)
  return (
    <button onClick={onOpen} className={cx('card card-hover p-5 text-start', m.status === 'cancelled' && 'opacity-60')}>
      <div className="flex items-center justify-between gap-2">
        <Chip className="bg-muted text-sub">{lbl(MEETING_SERIES, m.series)}</Chip>
        <span className="text-xs text-sub">{relDays(m.date)}</span>
      </div>
      <div className="mt-2 truncate text-lg font-semibold">{m.title}</div>
      <div className="mt-0.5 truncate text-xs text-sub">
        {project ? project.name + ' · ' : ''}{fmtWeekday(m.date)} {fmtDate(m.date)}{m.time ? ` · ${fa(m.time)}` : ''}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-sub">{r.total ? L(`${fa(r.ready)} از ${fa(r.total)} مورد آماده`, `${r.ready} of ${r.total} ready`) : L('هنوز موردی انتخاب نشده', 'Nothing picked yet')}</span>
        {r.total > 0 && <span className="num font-semibold">{fa(r.pct)}٪</span>}
      </div>
      <Progress className="mt-1.5" value={r.pct} h={tone(r.pct)} />
      <div className="mt-3 flex items-center gap-3 text-[0.6875rem] text-sub">
        {r.prep > 0 && <span className="flex items-center gap-1"><Check size={12} /> {L(`آمادگی ${fa(r.prepDone)}/${fa(r.prep)}`, `Prep ${r.prepDone}/${r.prep}`)}</span>}
        {m.gcal_id && <span className="flex items-center gap-1 text-good"><CalendarCheck2 size={12} /> {L('در تقویم', 'On calendar')}</span>}
      </div>
    </button>
  )
}

function Planner({ m }: { m: Meeting }) {
  const { db, upsert, canEdit } = useStore()
  const { open } = useEditor()
  const auto = useAuto()
  const r = readiness(m, db)
  const refs = refsOf(m)
  const [q, setQ] = useState('')
  const project = db.Projects.find((p) => p.id === m.project_id)
  const sprint = db.Sprints.find((s) => s.id === m.sprint_id)
  const sprints = db.Sprints.filter((s) => !m.project_id || s.project_id === m.project_id)

  const save = async (patch: Partial<Meeting>) => {
    const next = { ...m, ...patch }
    await upsert('Meetings', next)
    // the agenda is written into the calendar invitation too
    if ('items' in patch) auto.meetingSaved(next, m)
  }
  const setRefs = (list: string[]) => save({ items: list.join(',') })

  // candidates: the project's (or sprint's) open and recently finished work, not yet on the list
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const tasks = db.Tasks.filter((t) => (!m.project_id || t.project_id === m.project_id) && (!m.sprint_id || t.sprint_id === m.sprint_id))
      .filter((t) => !refs.includes(`T:${t.id}`) && (!needle || t.title.toLowerCase().includes(needle)))
      .sort((a, b) => Number(b.status === 'done' || b.status === 'review') - Number(a.status === 'done' || a.status === 'review'))
      .slice(0, 8)
      .map((t) => ({ ref: `T:${t.id}`, title: t.title, kind: 'T' as const }))
    const outs = db.Deliverables.filter((d) => (!m.project_id || d.project_id === m.project_id) && d.status !== 'dropped')
      .filter((d) => !refs.includes(`D:${d.id}`) && (!needle || d.title.toLowerCase().includes(needle)))
      .slice(0, 5)
      .map((d) => ({ ref: `D:${d.id}`, title: d.title, kind: 'D' as const }))
    return [...outs, ...tasks]
  }, [db, m.project_id, m.sprint_id, q, refs])

  const items = itemsOf(m, db)
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip className="bg-muted text-sub">{lbl(MEETING_SERIES, m.series)}</Chip>
        <span>{fmtWeekday(m.date)} {fmtDate(m.date, 'long')}{m.time ? ` · ${fa(m.time)}` : ''}</span>
        {project && <Link to={`/projects/${project.id}`} className="text-brand hover:underline">{project.name}</Link>}
        {m.meet_url && <a href={m.meet_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline"><Video size={14} /> Meet</a>}
        {m.gcal_id
          ? <span className="flex items-center gap-1 text-xs text-good"><CalendarCheck2 size={14} /> {L('در تقویم گوگل ثبت شده', 'On Google Calendar')}</span>
          : <span className="text-xs text-sub">{L('هنوز در تقویم نیست', 'Not on the calendar yet')}</span>}
        {canEdit && <button className="btn btn-ghost h-8 ms-auto" onClick={() => open('Meetings', m as never)}><Pencil size={14} /> {L('ویرایش جلسه', 'Edit meeting')}</button>}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-sub">{L('اسپرینت', 'Sprint')}</span>
          <select className="input h-9 w-auto" value={m.sprint_id || ''} onChange={(e) => save({ sprint_id: e.target.value })}>
            <option value="">{L('— بدون اسپرینت —', '— No sprint —')}</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {sprint?.goal && <span className="text-xs text-sub">{L('هدف: ', 'Goal: ')}{sprint.goal}</span>}
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="eyebrow flex items-center gap-2"><PackageCheck size={13} /> {m.series === 'demo' ? L('چه چیزی نمایش داده می‌شود', 'What we’ll show') : L('موارد جلسه', 'Items')}</h3>
          {r.total > 0 && <span className="text-xs text-sub">{L(`${fa(r.ready)} از ${fa(r.total)} آماده · ${fa(r.pct)}٪`, `${r.ready}/${r.total} ready · ${r.pct}%`)}</span>}
        </div>
        {r.total > 0 && <Progress value={r.pct} h={tone(r.pct)} className="mb-3" />}
        {items.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {items.map((i) => (
              <li key={i.ref} className="group flex items-center gap-3 px-4 py-2.5">
                <span className={cx('h-2 w-2 shrink-0 rounded-full', isReady(i) ? 'bg-good' : 'bg-warn')} />
                <span className="min-w-0 flex-1">
                  <button className="block truncate text-start text-sm hover:underline" onClick={() => open(i.kind === 'T' ? 'Tasks' : 'Deliverables', i.row as never)}>{i.row.title}</button>
                  <span className="text-[0.6875rem] text-sub">{i.kind === 'D' ? L('خروجی', 'Output') : i.row.assignee}</span>
                </span>
                {i.kind === 'T' ? <TaskStatusBadge s={i.row.status} /> : <Chip className="bg-muted text-sub">{lbl(DELIVERABLE_STATUS, i.row.status)}</Chip>}
                {canEdit && (
                  <button className="icon-btn h-7 w-7 opacity-0 group-hover:opacity-100" aria-label={L('حذف', 'Remove')} onClick={() => setRefs(refs.filter((x) => x !== i.ref))}><X size={13} /></button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-sub">{L('از فهرست زیر تسک‌ها و خروجی‌هایی را که در این جلسه نشان می‌دهید اضافه کنید.', 'Add the tasks and outputs this meeting will cover from the list below.')}</div>
        )}
        {canEdit && (
          <div className="mt-3 rounded-2xl bg-muted/40 p-3">
            <input className="input h-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('جستجوی تسک یا خروجی…', 'Search tasks or outputs…')} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {candidates.map((c) => (
                <button key={c.ref} className="chip bg-surface text-ink hover:bg-brand/10" onClick={() => setRefs([...refs, c.ref])}>
                  <Plus size={11} /> {c.kind === 'D' && <span className="text-sub">{L('خروجی:', 'Output:')}</span>} <span className="max-w-[16rem] truncate">{c.title}</span>
                </button>
              ))}
              {!candidates.length && <span className="text-xs text-sub">{m.project_id ? L('مورد دیگری پیدا نشد', 'Nothing else found') : L('برای پیشنهاد دقیق‌تر، پروژه‌ی جلسه را مشخص کنید', 'Set the meeting’s project for better suggestions')}</span>}
            </div>
          </div>
        )}
      </section>

      <Checklist title={L('آمادگی جلسه', 'Preparation')} value={m.checklist || ''} onChange={(v) => save({ checklist: v })} />

      <section>
        <h3 className="eyebrow mb-2">{L('یادداشت‌ها و بازخورد', 'Notes & feedback')}</h3>
        <NotesBox m={m} onSave={(notes) => save({ notes })} />
        {m.status === 'scheduled' && m.date <= todayISO() && canEdit && (
          <button className="btn btn-primary mt-3 h-9" onClick={() => save({ status: 'held' }).then(() => auto.meetingHeld({ ...m, status: 'held' }))}>
            <Check size={14} /> {L('برگزار شد', 'Mark held')}
          </button>
        )}
        <Link to="/meetings" className="mt-3 flex items-center gap-1 text-xs text-sub hover:text-ink"><ExternalLink size={12} /> {L('اتاق جلسه (صورت‌جلسه، تصمیم‌ها، اکشن‌ها)', 'Meeting room (minutes, decisions, actions)')}</Link>
      </section>
    </div>
  )
}

function NotesBox({ m, onSave }: { m: Meeting; onSave: (v: string) => void }) {
  const { canEdit } = useStore()
  const [v, setV] = useState(m.notes || '')
  return (
    <textarea className="input min-h-28 py-2" value={v} disabled={!canEdit} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (m.notes || '') && onSave(v)}
      placeholder={L('ترتیب ارائه، سوال‌های ذی‌نفعان، بازخوردها…', 'Running order, stakeholder questions, feedback…')} />
  )
}

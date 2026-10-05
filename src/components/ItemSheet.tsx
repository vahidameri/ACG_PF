// Rich detail sheet for a task or follow-up: inline-editable properties, description, comments & activity.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Send, Check, Clock, AlarmClockOff, Hash, Zap, MessageSquare, CircleDot, CheckCircle2, Sparkles } from 'lucide-react'
import type { FollowUp, Task, Comment, TaskStatus } from '../lib/types'

type Item = Omit<Task, 'status'> & Omit<FollowUp, 'status'> & { status: Task['status'] | FollowUp['status'] }
import { useStore } from '../lib/store'
import { uid } from '../lib/api'
import { addDays, fa, fmtDate, todayISO, timeAgo } from '../lib/jalali'
import { L, lbl } from '../lib/i18n'
import { CHANNEL, FOLLOWUP_STATUS } from '../lib/labels'
import { Avatar, Sheet, cx, Chip, MenuItem, Popover } from './ui'
import { DatePicker } from './DatePicker'
import { useEditor } from './Editor'
import { PersonPicker, PriorityPicker, ProjectPicker, StatusPicker } from './pickers'
import { TRACK, trackOf, depsOf, dependentsOf, depIds, trackSoft, memberTrack } from '../lib/tracks'
import type { Track } from '../lib/types'
import { StatusIcon } from './ui'
import { Link2, X, Plus, ArrowLeftRight } from 'lucide-react'

function nowStamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${todayISO()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
export const stampToDate = (s: string) => new Date(String(s).replace(' ', 'T'))

export function ItemSheet({ sheet, id, onClose }: { sheet: 'Tasks' | 'FollowUps'; id: string; onClose: () => void }) {
  const { db, upsert, remove, toast, canEdit, me } = useStore()
  const item = (sheet === 'Tasks' ? db.Tasks : db.FollowUps).find((x) => x.id === id) as unknown as Item | undefined
  const [confirmDel, setConfirmDel] = useState(false)
  const [draft, setDraft] = useState('')
  const comments = useMemo(() => db.Comments.filter((c) => c.entity === sheet && c.entity_id === id).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)), [db.Comments, sheet, id])

  if (!item) return null
  const isTask = sheet === 'Tasks'
  const project = db.Projects.find((p) => p.id === item.project_id)
  const patch = async (p: Partial<Item>) => {
    const next = { ...item, ...p }
    if (isTask && 'status' in p) next.completed_at = p.status === 'done' ? item.completed_at || todayISO() : ''
    if (!isTask && 'status' in p) next.done_at = p.status === 'done' ? item.done_at || todayISO() : ''
    await upsert(sheet, next as never)
  }

  const send = async () => {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    const c: Comment = { id: uid('C'), entity: sheet, entity_id: id, author: me || L('من', 'Me'), body, created_at: nowStamp() }
    await upsert('Comments', c)
  }

  const del = async () => {
    await remove(sheet, id)
    toast(L('حذف شد', 'Deleted'), 'ok', { label: L('بازگردانی', 'Undo'), run: () => upsert(sheet, item as never) })
    onClose()
  }

  const title = isTask ? item.title : item.subject
  const people = db.Team.map((m) => m.name)

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      header={
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="eyebrow">{isTask ? L('تسک', 'Task') : L('فالوآپ', 'Follow-up')}</span>
          {project && (
            <>
              <span className="text-line-strong">/</span>
              <Link to={`/projects/${project.id}`} onClick={onClose} className="truncate text-sub hover:text-ink">
                {project.name}
              </Link>
            </>
          )}
        </div>
      }
      footer={
        canEdit && (
          <>
            <span className="text-[0.6875rem] text-sub">
              {L('ایجاد', 'Created')} {fmtDate(item.created_at)}
              {item.reporter && ` · ${item.reporter}`}
            </span>
            <div className="flex-1" />
            {confirmDel ? (
              <button className="btn-danger btn-sm" onClick={del}>
                {L('تأیید حذف', 'Confirm delete')}
              </button>
            ) : (
              <button className="btn-ghost btn-sm text-sub" onClick={() => setConfirmDel(true)}>
                <Trash2 size={14} /> {L('حذف', 'Delete')}
              </button>
            )}
          </>
        )
      }
    >
      <div className="grid min-h-full lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 px-6 py-6 lg:border-e lg:border-line">
          <textarea
            defaultValue={title}
            disabled={!canEdit}
            rows={1}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== title) patch(isTask ? { title: v } : { subject: v })
            }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${t.scrollHeight}px`
            }}
            className="display w-full resize-none bg-transparent text-2xl leading-snug outline-none"
          />
          <textarea
            defaultValue={isTask ? item.description : item.notes}
            disabled={!canEdit}
            rows={4}
            placeholder={L('توضیحات، جزئیات یا سابقه را اینجا بنویسید…', 'Add a description, details or history…')}
            onBlur={(e) => {
              const v = e.target.value
              if (v !== (isTask ? item.description : item.notes)) patch(isTask ? { description: v } : { notes: v })
            }}
            className="mt-3 w-full resize-none rounded-xl bg-transparent text-sm leading-7 text-ink/85 outline-none placeholder:text-sub/60 focus:bg-muted/50 focus:p-3 transition-all"
          />

          {!isTask && canEdit && item.status !== 'done' && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary btn-sm" onClick={() => patch({ status: 'done' })}>
                <Check size={14} /> {L('انجام شد', 'Mark done')}
              </button>
              <button className="btn-outline btn-sm" onClick={() => patch({ status: 'waiting', due_date: addDays(todayISO(), 2) })}>
                <Clock size={14} /> {L('منتظر پاسخ (۲ روز)', 'Waiting (2 days)')}
              </button>
              <button className="btn-outline btn-sm" onClick={() => patch({ due_date: addDays(todayISO(), 1) })}>
                <AlarmClockOff size={14} /> {L('فردا', 'Tomorrow')}
              </button>
            </div>
          )}

          {isTask && <Dependencies task={item as unknown as Task} onChange={(ids) => patch({ depends_on: ids.join(',') })} />}

          <div className="mt-8">
            <div className="eyebrow mb-4 flex items-center gap-2">
              <MessageSquare size={13} /> {L('گفتگو و فعالیت', 'Activity')}
            </div>
            <ol className="relative space-y-5 border-s border-line ps-6">
              <ActivityDot icon={<CircleDot size={12} />}>
                <span className="text-sub">
                  {item.reporter || L('سیستم', 'System')} {L('این مورد را ایجاد کرد', 'created this')} · {fmtDate(item.created_at)}
                </span>
              </ActivityDot>
              {comments.map((c) => (
                <li key={c.id} className="relative">
                  <span className="absolute -start-[37px] top-0">
                    <Avatar name={c.author} size="sm" ring />
                  </span>
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium">{c.author}</span>
                    <span className="text-[0.6875rem] text-sub">{timeAgo(stampToDate(c.created_at))}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap rounded-2xl rounded-ss-md bg-muted px-4 py-2.5 text-sm leading-7">{renderMentions(c.body, people)}</div>
                </li>
              ))}
              {(item.completed_at || item.done_at) && (
                <ActivityDot icon={<CheckCircle2 size={12} className="text-good" />}>
                  <span className="text-sub">
                    {L('انجام شد', 'Completed')} · {fmtDate(item.completed_at || item.done_at)}
                  </span>
                </ActivityDot>
              )}
            </ol>
            {canEdit && (
              <div className="mt-5 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 focus-within:border-ink/30">
                <Avatar name={me} size="sm" />
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
                  }}
                  rows={1}
                  placeholder={L('یادداشت بنویسید… با @ از کسی نام ببرید (Ctrl+Enter)', 'Write a note… @mention someone (Ctrl+Enter)')}
                  className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
                />
                <button className="btn-primary btn-sm h-9 w-9 px-0" onClick={send} disabled={!draft.trim()} aria-label={L('ارسال', 'Send')}>
                  <Send size={14} className="rtl:-scale-x-100" />
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-1 bg-muted/30 px-4 py-6">
          <div className="eyebrow mb-2 px-2.5">{L('مشخصات', 'Properties')}</div>
          {isTask ? (
            <>
              <Prop label={L('وضعیت', 'Status')}>
                <StatusPicker value={item.status as TaskStatus} onChange={(v) => patch({ status: v })} />
              </Prop>
              <Prop label={L('اولویت', 'Priority')}>
                <PriorityPicker value={item.priority} onChange={(v) => patch({ priority: v })} />
              </Prop>
              <Prop label={L('مسئول', 'Assignee')}>
                <PersonPicker value={item.assignee} onChange={(v) => patch({ assignee: v })} />
              </Prop>
              <Prop label={L('سررسید', 'Due')}>
                <DatePicker compact value={item.due_date} onChange={(v) => patch({ due_date: v })} />
              </Prop>
              <Prop label={L('پروژه', 'Project')}>
                <ProjectPicker value={item.project_id} onChange={(v) => patch({ project_id: v, sprint_id: '' })} />
              </Prop>
              <Prop label={L('اسپرینت', 'Sprint')}>
                <SprintPicker projectId={item.project_id} value={item.sprint_id} onChange={(v) => patch({ sprint_id: v })} />
              </Prop>
              <Prop label={L('پوینت', 'Points')}>
                <input
                  type="number"
                  defaultValue={item.points || ''}
                  disabled={!canEdit}
                  onBlur={(e) => Number(e.target.value) !== Number(item.points) && patch({ points: Number(e.target.value) || 0 })}
                  className="h-8 w-16 rounded-full bg-transparent px-2.5 text-xs outline-none hover:bg-muted focus:bg-surface focus:ring-1 focus:ring-line-strong num"
                  placeholder="—"
                />
              </Prop>
              <Prop label={L('ترک', 'Track')}>
                <TrackPicker task={item as unknown as Task} onChange={(v) => patch({ track: v })} />
              </Prop>
              <Prop label={L('برچسب', 'Tags')}>
                <input
                  defaultValue={item.tags}
                  disabled={!canEdit}
                  onBlur={(e) => e.target.value !== item.tags && patch({ tags: e.target.value })}
                  placeholder={L('افزودن…', 'Add…')}
                  className="h-8 w-full rounded-full bg-transparent px-2.5 text-xs outline-none hover:bg-muted focus:bg-surface focus:ring-1 focus:ring-line-strong"
                />
              </Prop>
            </>
          ) : (
            <>
              <Prop label={L('وضعیت', 'Status')}>
                <Popover
                  width={180}
                  trigger={({ toggle }) => (
                    <button onClick={toggle} disabled={!canEdit} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs hover:bg-muted">
                      <span className={cx('h-2 w-2 rounded-full', item.status === 'done' ? 'bg-good' : item.status === 'waiting' ? 'bg-purple-500' : 'bg-warn')} />
                      {lbl(FOLLOWUP_STATUS, item.status as FollowUp['status'])}
                    </button>
                  )}
                >
                  {(close) =>
                    (['open', 'waiting', 'done'] as const).map((s) => (
                      <MenuItem
                        key={s}
                        active={s === item.status}
                        onClick={() => {
                          patch({ status: s })
                          close()
                        }}
                      >
                        {lbl(FOLLOWUP_STATUS, s)}
                      </MenuItem>
                    ))
                  }
                </Popover>
              </Prop>
              <Prop label={L('با', 'With')}>
                <PersonPicker value={item.person} onChange={(v) => patch({ person: v })} placeholder={L('انتخاب', 'Choose')} />
              </Prop>
              <Prop label={L('کانال', 'Channel')}>
                <Popover
                  width={170}
                  trigger={({ toggle }) => (
                    <button onClick={toggle} disabled={!canEdit} className="inline-flex h-8 items-center rounded-full px-2.5 text-xs hover:bg-muted">
                      {lbl(CHANNEL, item.channel)}
                    </button>
                  )}
                >
                  {(close) =>
                    (Object.keys(CHANNEL) as FollowUp['channel'][]).map((c) => (
                      <MenuItem
                        key={c}
                        active={c === item.channel}
                        onClick={() => {
                          patch({ channel: c })
                          close()
                        }}
                      >
                        {lbl(CHANNEL, c)}
                      </MenuItem>
                    ))
                  }
                </Popover>
              </Prop>
              <Prop label={L('اولویت', 'Priority')}>
                <PriorityPicker value={item.priority} onChange={(v) => patch({ priority: v })} />
              </Prop>
              <Prop label={L('پیگیری بعدی', 'Next touch')}>
                <DatePicker compact value={item.due_date} onChange={(v) => patch({ due_date: v })} />
              </Prop>
              <Prop label={L('پروژه', 'Project')}>
                <ProjectPicker value={item.project_id} onChange={(v) => patch({ project_id: v })} />
              </Prop>
            </>
          )}
          {isTask && item.tags && (
            <div className="flex flex-wrap gap-1 px-2.5 pt-2">
              {item.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                <Chip key={t}>
                  <Hash size={10} />
                  {t}
                </Chip>
              ))}
            </div>
          )}
          {isTask && project && (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <Sparkles size={13} className="text-brand" /> {L('یادآوری هوشمند', 'Smart nudge')}
              </div>
              <p className="mt-1 leading-6 text-sub">
                {item.status === 'blocked'
                  ? L('این تسک مسدود است. یک فالوآپ برای رفع مانع بسازید.', 'This task is blocked. Create a follow-up to clear it.')
                  : L(`این تسک بخشی از ${project.name} است.`, `Part of ${project.name}.`)}
              </p>
              {item.status === 'blocked' && canEdit && (
                <button
                  className="btn-tonal btn-sm mt-2"
                  onClick={() =>
                    upsert('FollowUps', {
                      id: uid('F'), project_id: item.project_id, subject: L(`رفع مانع: ${item.title}`, `Unblock: ${item.title}`), person: item.assignee, channel: 'chat',
                      due_date: addDays(todayISO(), 1), status: 'open', priority: 'high', notes: item.description, created_at: todayISO(), done_at: '',
                    }).then(() => toast(L('فالوآپ ساخته شد', 'Follow-up created')))
                  }
                >
                  <Zap size={13} /> {L('ساخت فالوآپ', 'Create follow-up')}
                </button>
              )}
            </div>
          )}
          <div className="px-2.5 pt-6 text-[0.6875rem] text-sub">
            ID <span dir="ltr" className="font-mono">{fa(item.id)}</span>
          </div>
        </aside>
      </div>
    </Sheet>
  )
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-2">
      <span className="w-20 shrink-0 px-2.5 text-xs text-sub">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function ActivityDot({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="relative text-xs">
      <span className="absolute -start-[31px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-surface text-sub ring-4 ring-surface">{icon}</span>
      {children}
    </li>
  )
}

function SprintPicker({ projectId, value, onChange }: { projectId: string; value: string; onChange: (v: string) => void }) {
  const { db, canEdit } = useStore()
  const ss = db.Sprints.filter((s) => !projectId || s.project_id === projectId)
  const cur = db.Sprints.find((s) => s.id === value)
  return (
    <Popover
      width={220}
      trigger={({ toggle }) => (
        <button onClick={toggle} disabled={!canEdit} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs hover:bg-muted">
          <Zap size={14} className="text-sub" />
          <span className={cx(!cur && 'text-sub')}>{cur ? cur.name : L('بک‌لاگ', 'Backlog')}</span>
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem
            active={!value}
            onClick={() => {
              onChange('')
              close()
            }}
          >
            {L('بک‌لاگ', 'Backlog')}
          </MenuItem>
          {ss.map((s) => (
            <MenuItem
              key={s.id}
              active={s.id === value}
              hint={s.status === 'active' ? L('فعال', 'active') : undefined}
              onClick={() => {
                onChange(s.id)
                close()
              }}
            >
              {s.name}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  )
}

export function renderMentions(text: string, people: string[]) {
  // Highlight "@Name" for any known team member (names may contain spaces).
  const names = [...people].sort((a, b) => b.length - a.length)
  const parts: React.ReactNode[] = []
  let rest = text
  let k = 0
  while (rest) {
    const i = rest.indexOf('@')
    if (i < 0) {
      parts.push(rest)
      break
    }
    parts.push(rest.slice(0, i))
    const after = rest.slice(i + 1)
    const n = names.find((nm) => after.startsWith(nm))
    if (n) {
      parts.push(
        <span key={k++} className="rounded-md bg-brand-soft/60 px-1 font-medium text-ink">
          @{n}
        </span>,
      )
      rest = after.slice(n.length)
    } else {
      parts.push('@')
      rest = after
    }
  }
  return parts
}

export function TrackBadge({ track, inferred }: { track: Track | ''; inferred?: boolean }) {
  if (!track) return <span className="text-[0.6875rem] text-sub/60">—</span>
  return (
    <span className={cx('chip', trackSoft[track])} title={inferred ? L('از روی تیم مسئول', 'Inferred from assignee') : undefined}>
      {lbl(TRACK, track)}
      {inferred && <span className="opacity-60">·{L('خودکار', 'auto')}</span>}
    </span>
  )
}

function TrackPicker({ task, onChange }: { task: Task; onChange: (v: Track | '') => void }) {
  const { db, canEdit } = useStore()
  const eff = trackOf(task, db)
  return (
    <Popover
      width={220}
      trigger={({ toggle }) => (
        <button onClick={toggle} disabled={!canEdit} className="inline-flex h-8 items-center rounded-full px-1.5 hover:bg-muted">
          <TrackBadge track={eff} inferred={!task.track && !!eff} />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem active={!task.track} hint={memberTrack(db, task.assignee) ? lbl(TRACK, memberTrack(db, task.assignee) as Track) : ''} onClick={() => { onChange(''); close() }}>
            {L('خودکار (تیم مسئول)', 'Auto (assignee’s team)')}
          </MenuItem>
          {(['product', 'tech'] as Track[]).map((t) => (
            <MenuItem key={t} active={task.track === t} onClick={() => { onChange(t); close() }}>
              {lbl(TRACK, t)}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  )
}

/** Cross-team links: what this task waits on, and what waits on it. */
function Dependencies({ task, onChange }: { task: Task; onChange: (ids: string[]) => void }) {
  const { db, canEdit } = useStore()
  const { open } = useEditorLite()
  const [q, setQ] = useState('')
  const deps = depsOf(task, db)
  const blocking = dependentsOf(task, db)
  const waiting = deps.filter((d) => d.status !== 'done')
  const ids = depIds(task)
  const candidates = db.Tasks.filter((t) => t.id !== task.id && !ids.includes(t.id) && (!q || t.title.includes(q)) && (t.project_id === task.project_id || q)).slice(0, 8)
  const RowT = ({ t, onRemove }: { t: Task; onRemove?: () => void }) => {
    const tr = trackOf(t, db)
    return (
      <div className="group flex items-center gap-2.5 rounded-xl border border-line px-3 py-2">
        <StatusIcon s={t.status} size={14} />
        <button onClick={() => open(t)} className={cx('min-w-0 flex-1 truncate text-start text-sm hover:underline', t.status === 'done' && 'text-sub line-through')}>
          {t.title}
        </button>
        <TrackBadge track={tr} />
        <Avatar name={t.assignee} size="xs" />
        {onRemove && canEdit && (
          <button className="icon-btn h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onRemove} title={L('حذف وابستگی', 'Remove link')}>
            <X size={12} />
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="mt-8">
      <div className="eyebrow mb-3 flex items-center gap-2">
        <ArrowLeftRight size={13} /> {L('وابستگی‌ها و تحویل بین تیم‌ها', 'Dependencies & handoffs')}
      </div>
      {waiting.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-warn/[0.09] px-3 py-2 text-xs text-warn">
          <Link2 size={13} />
          {L(`منتظر ${waiting.length === 1 ? 'یک کار' : `${fa(waiting.length)} کار`} از ${Array.from(new Set(waiting.map((w) => lbl(TRACK, trackOf(w, db) || 'tech')))).join(' و ')} است`, `Waiting on ${waiting.length} item(s) from ${Array.from(new Set(waiting.map((w) => lbl(TRACK, trackOf(w, db) || 'tech')))).join(' & ')}`)}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 text-xs text-sub">{L('وابسته به (پیش‌نیازها)', 'Waits on')}</div>
          <div className="space-y-1.5">
            {deps.map((d) => (
              <RowT key={d.id} t={d} onRemove={() => onChange(ids.filter((x) => x !== d.id))} />
            ))}
            {canEdit && (
              <Popover
                width={360}
                trigger={({ toggle }) => (
                  <button onClick={toggle} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2 text-xs text-sub hover:border-ink/30 hover:text-ink">
                    <Plus size={13} /> {L('افزودن پیش‌نیاز', 'Add dependency')}
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('جستجوی تسک…', 'Search tasks…')} className="mb-1 h-9 w-full border-b border-line bg-transparent px-2.5 text-sm outline-none" />
                    <div className="max-h-72 overflow-y-auto">
                      {candidates.map((t) => (
                        <MenuItem key={t.id} icon={<StatusIcon s={t.status} size={13} />} hint={trackOf(t, db) ? lbl(TRACK, trackOf(t, db) as Track) : undefined} onClick={() => { onChange([...ids, t.id]); close(); setQ('') }}>
                          {t.title}
                        </MenuItem>
                      ))}
                      {!candidates.length && <div className="px-3 py-4 text-center text-xs text-sub">{L('موردی پیدا نشد', 'No matches')}</div>}
                    </div>
                  </>
                )}
              </Popover>
            )}
          </div>
        </div>
        {blocking.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs text-sub">{L('این کار پیش‌نیازِ', 'Unblocks')}</div>
            <div className="space-y-1.5">
              {blocking.map((d) => (
                <RowT key={d.id} t={d} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Opening another task from inside the sheet goes through the editor context.
function useEditorLite() {
  const { open } = useEditor()
  return { open: (t: Task) => open('Tasks', t as never) }
}

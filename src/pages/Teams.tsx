import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Link2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Band, Card, Empty, Overlap, StatStrip, Segmented, FilterSelect, Toolbar, Ring, Avatar, cx, StatusIcon, Due } from '../components/ui'
import { TaskRow } from '../components/shared'
import { TRACK, TRACKS, trackOf, trackStats, handoffs, trackSoft, trackDot, waitingOn } from '../lib/tracks'
import { fa } from '../lib/jalali'
import { L, lbl, locale } from '../lib/i18n'
import type { Task, Track } from '../lib/types'
import { TrackBadge } from '../components/ItemSheet'

/** Product and Tech side by side: separate tracking plus the handoffs that connect them. */
export default function Teams() {
  const { db } = useStore()
  const { open } = useEditor()
  const [view, setView] = useState<'side' | 'flow' | 'projects'>('side')
  const [project, setProject] = useState('')
  const pid = project || undefined
  const stats = { product: trackStats(db, 'product', pid), tech: trackStats(db, 'tech', pid) }
  const hs = handoffs(db, pid)
  const pending = hs.filter((h) => !h.ready && h.to.status !== 'done')
  const ready = hs.filter((h) => h.ready && h.to.status !== 'done')
  const Arrow = locale.lang === 'fa' ? ArrowLeft : ArrowRight
  const pname = (id: string) => db.Projects.find((p) => p.id === id)?.name || ''

  return (
    <>
      <Band
        eyebrow={<span>{L('اجرا / تیم‌ها', 'Execution / Teams')}</span>}
        title={L('پروداکت و تک', 'Product & Tech')}
        sub={L('هر تیم جداگانه قابل پیگیری است و کارهایی که از یکی به دیگری تحویل می‌شود به هم وصل‌اند.', 'Track each team on its own — and see the handoffs that connect them.')}
        actions={<Segmented dark value={view} onChange={setView} options={[{ value: 'side', label: L('کنار هم', 'Side by side') }, { value: 'flow', label: L('جریان تحویل', 'Handoffs') }, { value: 'projects', label: L('به تفکیک پروژه', 'By project') }]} />}
      >
        <StatStrip
          items={[
            { label: L('پروداکت · باز', 'Product · open'), value: fa(stats.product.open), sub: L(`${fa(stats.product.doneWeek)} انجام در این هفته`, `${stats.product.doneWeek} done this week`) },
            { label: L('پروداکت · معوق', 'Product · overdue'), value: fa(stats.product.overdue), tone: stats.product.overdue ? 'amber' : 'green' },
            { label: L('تک · باز', 'Tech · open'), value: fa(stats.tech.open), sub: L(`${fa(stats.tech.doneWeek)} انجام در این هفته`, `${stats.tech.doneWeek} done this week`) },
            { label: L('تک · معوق', 'Tech · overdue'), value: fa(stats.tech.overdue), tone: stats.tech.overdue ? 'amber' : 'green' },
            { label: L('تحویل در انتظار', 'Handoffs pending'), value: fa(pending.length), tone: pending.length ? 'red' : 'green', sub: L('تک منتظر پروداکت یا برعکس', 'one team waiting on the other') },
            { label: L('آماده‌ی شروع', 'Ready to pick up'), value: fa(ready.length), tone: ready.length ? 'green' : undefined, sub: L('پیش‌نیاز تمام شده', 'dependency done') },
          ]}
        />
      </Band>

      <Overlap className="space-y-4">
        <div className="card p-3">
          <Toolbar className="!mb-0">
            <FilterSelect value={project} onChange={setProject} placeholder={L('همه‌ی پروژه‌ها', 'All projects')} options={db.Projects.filter((p) => p.status !== 'cancelled').map((p) => ({ value: p.id, label: p.name }))} />
            <span className="ms-auto flex items-center gap-4 text-xs text-sub">
              {TRACKS.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className={cx('h-2 w-2 rounded-full', trackDot[t])} /> {lbl(TRACK, t)}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <Link2 size={12} className="text-warn" /> {L('منتظر پیش‌نیاز', 'Waiting on dependency')}
              </span>
            </span>
          </Toolbar>
        </div>

        {view === 'side' && (
          <div className="grid gap-4 @xl:grid-cols-2">
            {TRACKS.map((tr) => (
              <TrackColumn key={tr} track={tr} projectId={pid} />
            ))}
          </div>
        )}

        {view === 'flow' && (
          <div className="grid gap-4 @2xl:grid-cols-2">
            {[
              { title: L('در انتظار تحویل', 'Waiting on handoff'), items: pending, tone: 'bad' as const },
              { title: L('آماده برای شروع', 'Ready to start'), items: ready, tone: 'good' as const },
            ].map((g) => (
              <Card key={g.title} eyebrow={L('تحویل بین تیم‌ها', 'Cross-team handoffs')} title={`${g.title} · ${fa(g.items.length)}`}>
                {g.items.length === 0 ? (
                  <Empty />
                ) : (
                  <div className="space-y-3">
                    {g.items.map((h) => (
                      <div key={h.from.id + h.to.id} className={cx('rounded-2xl border p-3', g.tone === 'bad' ? 'border-warn/30 bg-warn/[0.04]' : 'border-good/30 bg-good/[0.04]')}>
                        <div className="mb-2 flex items-center justify-between text-[0.6875rem] text-sub">
                          <span>{pname(h.to.project_id)}</span>
                          {g.tone === 'bad' ? (
                            <span className="flex items-center gap-1 text-warn">
                              <Clock size={12} /> {L('منتظر', 'Waiting')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-good">
                              <CheckCircle2 size={12} /> {L('آماده', 'Ready')}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <HandoffNode t={h.from} onClick={() => open('Tasks', h.from as never)} />
                          <span className={cx('grid h-8 w-8 place-items-center rounded-full', h.ready ? 'bg-good text-white' : 'bg-warn/15 text-warn')}>
                            <Arrow size={15} />
                          </span>
                          <HandoffNode t={h.to} onClick={() => open('Tasks', h.to as never)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {view === 'projects' && (
          <Card pad={false} eyebrow={L('مقایسه', 'Comparison')} title={L('پیشرفت پروداکت و تک در هر پروژه', 'Product vs tech progress per project')}>
            <div className="divide-y divide-line">
              {db.Projects.filter((p) => p.status === 'active' || p.status === 'planning').map((p) => {
                const ps = trackStats(db, 'product', p.id)
                const ts = trackStats(db, 'tech', p.id)
                const h = handoffs(db, p.id).filter((x) => !x.ready && x.to.status !== 'done').length
                const gap = ps.pct - ts.pct
                return (
                  <div key={p.id} className="grid items-center gap-4 px-5 py-4 @lg:grid-cols-[14rem_1fr_1fr_9rem]">
                    <Link to={`/projects/${p.id}`} className="min-w-0">
                      <div className="truncate font-medium hover:underline">{p.name}</div>
                      <div className="font-mono text-[0.625rem] text-sub" dir="ltr">{p.code}</div>
                    </Link>
                    {([['product', ps], ['tech', ts]] as const).map(([tr, st]) => (
                      <div key={tr}>
                        <div className="mb-1 flex items-center justify-between text-[0.6875rem]">
                          <span className={cx('chip', trackSoft[tr])}>{lbl(TRACK, tr)}</span>
                          <span className="text-sub num">
                            {fa(st.done)}/{fa(st.total)} · <b className="text-ink">{fa(st.pct)}%</b>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className={cx('h-full rounded-full transition-[width] duration-700', trackDot[tr])} style={{ width: `${st.pct}%` }} />
                        </div>
                        {(st.overdue > 0 || st.blocked > 0) && (
                          <div className="mt-1 text-[0.625rem] text-bad">
                            {st.overdue > 0 && L(`${fa(st.overdue)} معوق `, `${st.overdue} overdue `)}
                            {st.blocked > 0 && L(`${fa(st.blocked)} مسدود`, `${st.blocked} blocked`)}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="text-xs">
                      {h > 0 ? (
                        <span className="chip bg-warn/12 text-warn">
                          <Link2 size={11} /> {L(`${fa(h)} تحویل معلق`, `${h} pending`)}
                        </span>
                      ) : (
                        <span className="text-sub">{L('بدون گلوگاه', 'No bottleneck')}</span>
                      )}
                      {ps.total > 0 && ts.total > 0 && Math.abs(gap) >= 25 && (
                        <div className="mt-1 text-[0.625rem] text-sub">{gap > 0 ? L('تک عقب‌تر است', 'Tech is behind') : L('پروداکت عقب‌تر است', 'Product is behind')}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </Overlap>
    </>
  )
}

function HandoffNode({ t, onClick }: { t: Task; onClick: () => void }) {
  const { db } = useStore()
  return (
    <button onClick={onClick} className="min-w-0 rounded-xl border border-line bg-surface p-2.5 text-start transition hover:shadow-card">
      <div className="mb-1 flex items-center gap-1.5">
        <TrackBadge track={trackOf(t, db)} />
        <StatusIcon s={t.status} size={13} />
      </div>
      <div className={cx('line-clamp-2 text-[0.8125rem] leading-5', t.status === 'done' && 'text-sub line-through')}>{t.title}</div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1 truncate text-[0.6875rem] text-sub">
          <Avatar name={t.assignee} size="xs" /> {t.assignee}
        </span>
        <Due iso={t.due_date} done={t.status === 'done'} />
      </div>
    </button>
  )
}

function TrackColumn({ track, projectId }: { track: Track; projectId?: string }) {
  const { db } = useStore()
  const st = trackStats(db, track, projectId)
  const members = db.Team.filter((m) => m.track === track)
  const open = db.Tasks.filter((t) => trackOf(t, db) === track && t.status !== 'done' && (!projectId || t.project_id === projectId)).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
  const waiting = open.filter((t) => waitingOn(t, db).some((d) => trackOf(d, db) && trackOf(d, db) !== track))
  return (
    <div className="min-w-0 space-y-4">
      <section className="card overflow-hidden">
        <div className="flex items-center gap-5 p-5" style={{ background: `linear-gradient(135deg, ${track === 'product' ? 'rgb(106 4 33 / .07)' : 'rgb(29 79 97 / .09)'}, transparent 60%)` }}>
          <Ring value={st.pct} size={76} stroke={7} h={st.overdue ? 'amber' : 'green'} />
          <div className="min-w-0 flex-1">
            <div className={cx('chip mb-1', trackSoft[track])}>{lbl(TRACK, track)}</div>
            <div className="text-lg font-bold">{track === 'product' ? L('تیم پروداکت', 'Product team') : L('تیم تک', 'Tech team')}</div>
            <div className="text-xs text-sub">{L(`${fa(st.done)} از ${fa(st.total)} کار انجام شده · ${fa(st.donePoints)}/${fa(st.points)} پوینت`, `${st.done} of ${st.total} done · ${st.donePoints}/${st.points} pts`)}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-line border-t border-line rtl:divide-x-reverse">
          {[
            [L('باز', 'Open'), st.open, ''],
            [L('معوق', 'Overdue'), st.overdue, st.overdue ? 'text-bad' : ''],
            [L('مسدود', 'Blocked'), st.blocked, st.blocked ? 'text-bad' : ''],
            [L('منتظر تیم دیگر', 'Waiting'), st.waiting, st.waiting ? 'text-warn' : ''],
          ].map(([l, v, c]) => (
            <div key={l as string} className="px-3 py-3 text-center">
              <div className={cx('display text-2xl num', c as string)}>{fa(v as number)}</div>
              <div className="text-[0.625rem] text-sub">{l}</div>
            </div>
          ))}
        </div>
        {members.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line p-4">
            {members.map((m) => {
              const n = db.Tasks.filter((t) => t.assignee === m.name && t.status !== 'done').length
              return (
                <Link key={m.id} to={`/tasks?assignee=${encodeURIComponent(m.name)}`} className="flex items-center gap-2 rounded-full border border-line py-1 pe-3 ps-1 text-xs transition hover:border-line-strong">
                  <Avatar name={m.name} size="xs" />
                  {m.name}
                  <span className="text-sub num">{fa(n)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
      {waiting.length > 0 && (
        <Card eyebrow={L('گلوگاه', 'Bottleneck')} title={L(`منتظر ${track === 'tech' ? 'پروداکت' : 'تک'}`, `Waiting on ${track === 'tech' ? 'Product' : 'Tech'}`)}>
          <div className="-mx-2">{waiting.map((t) => <TaskRow key={t.id} t={t} dense />)}</div>
        </Card>
      )}
      <Card pad={false} eyebrow={L('کارهای باز', 'Open work')} title={L(`${fa(open.length)} کار`, `${open.length} items`)}>
        <div className="px-2 pb-2">{open.length ? open.slice(0, 12).map((t) => <TaskRow key={t.id} t={t} />) : <Empty />}</div>
        {open.length > 12 && (
          <Link to={`/tasks?track=${track}`} className="block border-t border-line py-3 text-center text-xs font-medium text-sub hover:text-ink">
            {L(`همه‌ی ${fa(open.length)} کار`, `All ${open.length}`)} →
          </Link>
        )}
      </Card>
    </div>
  )
}

// The organisation in the back office: job titles, teams and sides are lists the program manager edits.
import { useState } from 'react'
import { ArrowDown, ArrowUp, Building2, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { Card, cx } from './ui'
import { L, tr, type T2 } from '../lib/i18n'
import { ORG_KEYS, orgList, type OrgItem, type OrgKind } from '../lib/org'
import { teamCodes } from '../lib/labels'

const TITLE: Record<OrgKind, T2> = { series: ['جلسه‌ها (عنوان سری‌ها)', 'Meeting series'], titles: ['سمت‌ها', 'Job titles'], teams: ['تیم‌ها', 'Teams'], sides: ['واحدها (پروداکت، دیزاین، تک…)', 'Units (product, design, tech…)'] }
const HINT: Record<OrgKind, T2> = {
  series: ['نام سری‌های جلسه؛ همه به‌جز «یک‌به‌یک» و «سایر» هفتگی تکرار می‌شوند.', 'Series names; all but one-on-one and other repeat weekly.'],
  titles: ['کد کوتاه انگلیسی (مثل CEO) روی کارت هر نفر دیده می‌شود.', 'The short code (e.g. CEO) shows on each person.'],
  teams: ['هر نفر می‌تواند عضو چند تیم باشد.', 'A person can be in several teams.'],
  sides: ['واحدها کار را به هم تحویل می‌دهند (رفت و برگشت)؛ هر تسک و هر نفر یک واحد دارد.', 'Units hand work to each other (and back); every task and person belongs to one.'],
}

function OrgList({ kind, admin }: { kind: OrgKind; admin: boolean }) {
  const { db, setSetting, toast } = useStore()
  const list = orgList(kind)
  const [draft, setDraft] = useState<OrgItem>({ id: '', fa: '', en: '' })
  const save = (next: OrgItem[]) => setSetting(ORG_KEYS[kind], JSON.stringify(next))
  const used = (id: string) =>
    kind === 'series' ? db.Meetings.filter((m) => m.series === id).length : kind === 'titles' ? db.Team.filter((m) => m.role === id).length : kind === 'teams' ? db.Team.filter((m) => teamCodes(m.team, m.role, m.track).includes(id)).length : db.Team.filter((m) => m.track === id).length + db.Tasks.filter((t) => t.track === id).length
  const edit = (i: number, k: keyof OrgItem, v: string) => {
    if ((list[i][k] || '') === v) return
    save(list.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    save(next)
  }
  const remove = (i: number) => {
    const n = used(list[i].id)
    if (list.length <= 1) return
    save(list.filter((_, j) => j !== i))
    if (n) toast(L(`${n} مورد هنوز «${list[i].fa}» را دارند؛ آن‌ها را ویرایش کنید.`, `${n} item(s) still use “${list[i].en}”; edit them.`), 'err')
  }
  const add = () => {
    const id = (draft.id || draft.en || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!id || !draft.fa.trim() || list.some((x) => x.id === id)) return
    save([...list, { id, fa: draft.fa.trim(), en: (draft.en || draft.fa).trim(), ...(kind === 'sides' ? { color: draft.color || '#6b7180' } : {}) }])
    setDraft({ id: '', fa: '', en: '' })
  }
  const cell = 'h-8 min-w-0 rounded-lg bg-transparent px-2 text-sm outline-none focus:bg-muted disabled:opacity-80'
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{tr(TITLE[kind])}</div>
      <p className="mb-2 text-[0.6875rem] text-sub">{tr(HINT[kind])}</p>
      <ul className="space-y-1.5">
        {list.map((x, i) => (
          <li key={x.id} className="flex items-center gap-1.5 rounded-2xl border border-line px-2 py-1">
            {kind === 'sides' && <input type="color" disabled={!admin} className="h-6 w-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0" defaultValue={x.color || '#6b7180'} onBlur={(e) => edit(i, 'color', e.target.value)} aria-label={L('رنگ', 'Colour')} />}
            <span dir="ltr" className="w-14 shrink-0 truncate font-mono text-[0.6875rem] uppercase text-sub">{x.id}</span>
            <input key={'fa' + x.fa} className={cx(cell, 'flex-1')} disabled={!admin} defaultValue={x.fa} onBlur={(e) => e.target.value.trim() && edit(i, 'fa', e.target.value.trim())} />
            <input key={'en' + x.en} dir="ltr" className={cx(cell, 'w-28')} disabled={!admin} defaultValue={x.en} onBlur={(e) => e.target.value.trim() && edit(i, 'en', e.target.value.trim())} />
            <span className="w-6 text-center text-[0.625rem] text-sub num" title={L('در حال استفاده', 'In use')}>{used(x.id) || ''}</span>
            {admin && (
              <>
                <button className="icon-btn h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label={L('بالا', 'Up')}><ArrowUp size={13} /></button>
                <button className="icon-btn h-7 w-7" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={L('پایین', 'Down')}><ArrowDown size={13} /></button>
                <button className="icon-btn h-7 w-7 hover:text-bad" onClick={() => remove(i)} aria-label={L('حذف', 'Remove')}><Trash2 size={13} /></button>
              </>
            )}
          </li>
        ))}
      </ul>
      {admin && (
        <form className="mt-2 flex flex-wrap gap-1.5" onSubmit={(e) => (e.preventDefault(), add())}>
          <input dir="ltr" className="input h-9 w-20 text-xs" placeholder={L('کد', 'Code')} value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
          <input className="input h-9 min-w-0 flex-1 text-xs" placeholder={L('نام فارسی', 'Persian name')} value={draft.fa} onChange={(e) => setDraft({ ...draft, fa: e.target.value })} />
          <input dir="ltr" className="input h-9 w-28 text-xs" placeholder={L('نام انگلیسی', 'English name')} value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} />
          {kind === 'sides' && <input type="color" className="h-9 w-9 rounded-xl border border-line" value={draft.color || '#6b7180'} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />}
          <button className="btn-outline btn-sm h-9" disabled={!draft.fa.trim() || !(draft.id || draft.en).trim()}>
            <Plus size={14} /> {L('افزودن', 'Add')}
          </button>
        </form>
      )}
    </div>
  )
}

export function OrgCard({ admin }: { admin: boolean }) {
  return (
    <Card eyebrow={<span className="flex items-center gap-1.5"><Building2 size={12} /> {L('سازمان', 'Organisation')}</span>} title={L('سمت‌ها، تیم‌ها، واحدها و جلسه‌ها', 'Titles, teams, units & meetings')} className="@xl:row-span-2">
      <div className="space-y-6">
        <OrgList kind="sides" admin={admin} />
        <OrgList kind="teams" admin={admin} />
        <OrgList kind="titles" admin={admin} />
        <OrgList kind="series" admin={admin} />
      </div>
    </Card>
  )
}

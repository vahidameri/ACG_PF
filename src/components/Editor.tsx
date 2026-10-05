import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import type { SheetName } from '../lib/types'
import { useStore } from '../lib/store'
import { uid } from '../lib/api'
import { todayISO } from '../lib/jalali'
import { L, tr, type T2 } from '../lib/i18n'
import {
  CHANNEL, FOLLOWUP_STATUS, HEALTH, MILESTONE_STATUS, PRIORITY, PROJECT_STATUS, RISK_STATUS, RISK_TYPE, SCOPE_STATUS, SPRINT_STATUS, TASK_STATUS,
} from '../lib/labels'
import { Sheet, cx } from './ui'
import { DatePicker } from './DatePicker'
import { ItemSheet } from './ItemSheet'

type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'number' | 'project' | 'person' | 'sprint' | 'member' | 'scale'
export interface Field {
  key: string
  label: T2
  type: FieldType
  options?: Record<string, T2>
  half?: boolean
  required?: boolean
  placeholder?: T2
}

export type EditableSheet = Exclude<SheetName, 'Comments'>

export const SCHEMAS: Record<Exclude<SheetName, 'Comments'>, { title: T2; prefix: string; fields: Field[]; defaults: () => Record<string, unknown> }> = {
  Tasks: {
    title: ['تسک', 'Task'],
    prefix: 'T',
    fields: [
      { key: 'title', label: ['عنوان تسک', 'Task title'], type: 'text', required: true, placeholder: ['مثلاً: هماهنگی جلسه‌ی دمو با واحد فروش', 'e.g. Schedule the demo with Sales'] },
      { key: 'description', label: ['توضیحات', 'Description'], type: 'textarea' },
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true },
      { key: 'sprint_id', label: ['اسپرینت', 'Sprint'], type: 'sprint', half: true },
      { key: 'assignee', label: ['مسئول', 'Assignee'], type: 'person', half: true },
      { key: 'due_date', label: ['سررسید', 'Due date'], type: 'date', half: true },
      { key: 'status', label: ['وضعیت', 'Status'], type: 'select', options: TASK_STATUS, half: true },
      { key: 'priority', label: ['اولویت', 'Priority'], type: 'select', options: PRIORITY, half: true },
      { key: 'points', label: ['استوری‌پوینت', 'Story points'], type: 'number', half: true },
      { key: 'tags', label: ['برچسب‌ها', 'Tags'], type: 'text', half: true, placeholder: ['با کاما جدا کنید', 'Comma separated'] },
      { key: 'track', label: ['تیم (ترک)', 'Track'], type: 'select', options: { '': ['خودکار از روی مسئول', 'Auto (from assignee)'], product: ['پروداکت', 'Product'], tech: ['تک', 'Tech'] }, half: true },
    ],
    defaults: () => ({ status: 'todo', priority: 'medium', points: 0, created_at: todayISO(), track: '', depends_on: '' }),
  },
  FollowUps: {
    title: ['فالوآپ', 'Follow-up'],
    prefix: 'F',
    fields: [
      { key: 'subject', label: ['موضوع پیگیری', 'Follow-up subject'], type: 'text', required: true, placeholder: ['مثلاً: تأیید بودجه‌ی فاز ۲', 'e.g. Phase 2 budget approval'] },
      { key: 'person', label: ['از چه کسی؟', 'With whom?'], type: 'person', half: true },
      { key: 'channel', label: ['کانال', 'Channel'], type: 'select', options: CHANNEL, half: true },
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true },
      { key: 'due_date', label: ['تاریخ پیگیری بعدی', 'Next follow-up'], type: 'date', half: true },
      { key: 'status', label: ['وضعیت', 'Status'], type: 'select', options: FOLLOWUP_STATUS, half: true },
      { key: 'priority', label: ['اولویت', 'Priority'], type: 'select', options: PRIORITY, half: true },
      { key: 'notes', label: ['یادداشت / سابقه', 'Notes / history'], type: 'textarea' },
    ],
    defaults: () => ({ status: 'open', priority: 'medium', channel: 'meeting', created_at: todayISO(), due_date: todayISO() }),
  },
  Projects: {
    title: ['پروژه', 'Project'],
    prefix: 'P',
    fields: [
      { key: 'name', label: ['نام پروژه', 'Project name'], type: 'text', required: true },
      { key: 'code', label: ['کد', 'Code'], type: 'text', half: true, placeholder: ['ACG-XXX', 'ACG-XXX'] },
      { key: 'category', label: ['دسته', 'Category'], type: 'text', half: true },
      { key: 'description', label: ['شرح', 'Description'], type: 'textarea' },
      { key: 'objective', label: ['هدف کسب‌وکاری', 'Business objective'], type: 'text' },
      { key: 'owner', label: ['مدیر پروژه', 'Project manager'], type: 'person', half: true },
      { key: 'sponsor', label: ['اسپانسر', 'Sponsor'], type: 'person', half: true },
      { key: 'status', label: ['وضعیت', 'Status'], type: 'select', options: PROJECT_STATUS, half: true },
      { key: 'priority', label: ['اولویت', 'Priority'], type: 'select', options: PRIORITY, half: true },
      { key: 'phase', label: ['فاز فعلی', 'Current phase'], type: 'text', half: true },
      { key: 'progress', label: ['پیشرفت دستی (٪) — خالی = خودکار', 'Manual progress (%) — blank = automatic'], type: 'number', half: true },
      { key: 'start_date', label: ['شروع', 'Start'], type: 'date', half: true },
      { key: 'end_date', label: ['ددلاین', 'Deadline'], type: 'date', half: true },
      { key: 'budget', label: ['بودجه (ریال)', 'Budget'], type: 'number', half: true },
      { key: 'spent', label: ['هزینه‌شده (ریال)', 'Spent'], type: 'number', half: true },
      { key: 'health_override', label: ['سلامت دستی (خالی = محاسبه‌ی خودکار)', 'Health override (blank = automatic)'], type: 'select', options: { '': ['خودکار', 'Automatic'], ...HEALTH } },
    ],
    defaults: () => ({ status: 'planning', priority: 'medium', start_date: todayISO(), budget: 0, spent: 0, progress: '', health_override: '' }),
  },
  Milestones: {
    title: ['مایلستون', 'Milestone'],
    prefix: 'MS',
    fields: [
      { key: 'title', label: ['عنوان', 'Title'], type: 'text', required: true },
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true, required: true },
      { key: 'owner', label: ['مسئول', 'Assignee'], type: 'person', half: true },
      { key: 'planned_date', label: ['تاریخ برنامه', 'Planned date'], type: 'date', half: true },
      { key: 'actual_date', label: ['تاریخ واقعی', 'Actual date'], type: 'date', half: true },
      { key: 'status', label: ['وضعیت', 'Status'], type: 'select', options: MILESTONE_STATUS, half: true },
      { key: 'weight', label: ['وزن در پیشرفت', 'Weight in progress'], type: 'number', half: true },
    ],
    defaults: () => ({ status: 'pending', weight: 1 }),
  },
  Sprints: {
    title: ['اسپرینت', 'Sprint'],
    prefix: 'S',
    fields: [
      { key: 'name', label: ['نام', 'Name'], type: 'text', required: true, half: true },
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true, required: true },
      { key: 'goal', label: ['هدف اسپرینت', 'Sprint goal'], type: 'text' },
      { key: 'start_date', label: ['شروع', 'Start'], type: 'date', half: true },
      { key: 'end_date', label: ['پایان', 'End'], type: 'date', half: true },
      { key: 'committed_points', label: ['پوینت تعهدشده (خالی = جمع تسک‌ها)', 'Committed points (blank = sum of tasks)'], type: 'number', half: true },
      { key: 'completed_points', label: ['پوینت انجام‌شده (اگر تسک ندارد)', 'Completed points (if no tasks)'], type: 'number', half: true },
      { key: 'status', label: ['وضعیت', 'Status'], type: 'select', options: SPRINT_STATUS },
    ],
    defaults: () => ({ status: 'planned', committed_points: 0, completed_points: 0 }),
  },
  Risks: {
    title: ['ریسک / مسئله', 'Risk / issue'],
    prefix: 'R',
    fields: [
      { key: 'title', label: ['عنوان', 'Title'], type: 'text', required: true },
      { key: 'type', label: ['نوع', 'Type'], type: 'select', options: RISK_TYPE, half: true },
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true },
      { key: 'probability', label: ['احتمال (۱ تا ۵)', 'Probability (1–5)'], type: 'scale', half: true },
      { key: 'impact', label: ['اثر (۱ تا ۵)', 'Impact (1–5)'], type: 'scale', half: true },
      { key: 'owner', label: ['مالک', 'Owner'], type: 'person', half: true },
      { key: 'due_date', label: ['تاریخ اقدام', 'Action date'], type: 'date', half: true },
      { key: 'mitigation', label: ['برنامه‌ی کاهش / اقدام', 'Mitigation / action'], type: 'textarea' },
      { key: 'status', label: ['وضعیت', 'Status'], type: 'select', options: RISK_STATUS },
    ],
    defaults: () => ({ type: 'risk', probability: 3, impact: 3, status: 'open' }),
  },
  Scope: {
    title: ['آیتم اسکوپ', 'Scope item'],
    prefix: 'SC',
    fields: [
      { key: 'item', label: ['آیتم', 'Item'], type: 'text', required: true },
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true, required: true },
      { key: 'type', label: ['داخل / خارج اسکوپ', 'In / out of scope'], type: 'select', options: { in: ['داخل اسکوپ', 'In scope'], out: ['خارج از اسکوپ', 'Out of scope'] }, half: true },
      { key: 'status', label: ['وضعیت', 'Status'], type: 'select', options: SCOPE_STATUS, half: true },
      { key: 'date', label: ['تاریخ', 'Date'], type: 'date', half: true },
      { key: 'change_note', label: ['یادداشت تغییر', 'Change note'], type: 'textarea' },
    ],
    defaults: () => ({ type: 'in', status: 'planned', date: todayISO() }),
  },
  Updates: {
    title: ['گزارش وضعیت هفتگی', 'Weekly status update'],
    prefix: 'U',
    fields: [
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true, required: true },
      { key: 'week_date', label: ['تاریخ', 'Date'], type: 'date', half: true },
      { key: 'health', label: ['وضعیت کلی', 'Overall health'], type: 'select', options: HEALTH, half: true },
      { key: 'author', label: ['گزارش‌دهنده', 'Reporter'], type: 'person', half: true },
      { key: 'summary', label: ['خلاصه برای مدیریت', 'Executive summary'], type: 'textarea', required: true },
      { key: 'done', label: ['انجام‌شده‌ها (هر خط یک مورد)', 'Done (one per line)'], type: 'textarea' },
      { key: 'next', label: ['برنامه‌ی هفته‌ی بعد', 'Next week'], type: 'textarea' },
      { key: 'blockers', label: ['موانع / نیاز به کمک مدیریت', 'Blockers / help needed'], type: 'textarea' },
    ],
    defaults: () => ({ health: 'green', week_date: todayISO() }),
  },
  Team: {
    title: ['عضو تیم', 'Team member'],
    prefix: 'M',
    fields: [
      { key: 'name', label: ['نام', 'Name'], type: 'text', required: true },
      { key: 'role', label: ['نقش', 'Role'], type: 'text', half: true },
      { key: 'team', label: ['تیم', 'Team'], type: 'text', half: true },
      { key: 'track', label: ['ترک', 'Track'], type: 'select', options: { '': ['—', '—'], product: ['پروداکت', 'Product'], tech: ['تک', 'Tech'] }, half: true },
      { key: 'email', label: ['ایمیل', 'Email'], type: 'text' },
    ],
    defaults: () => ({}),
  },
  Allocations: {
    title: ['تخصیص منابع', 'Allocation'],
    prefix: 'A',
    fields: [
      { key: 'member_id', label: ['عضو', 'Member'], type: 'member', half: true, required: true },
      { key: 'project_id', label: ['پروژه', 'Project'], type: 'project', half: true, required: true },
      { key: 'percent', label: ['درصد تخصیص', 'Allocation %'], type: 'number' },
    ],
    defaults: () => ({ percent: 50 }),
  },
}

interface EditorCtx {
  open: (sheet: EditableSheet, row?: Record<string, unknown>) => void
}
const Ctx = createContext<EditorCtx | null>(null)
export const useEditor = () => useContext(Ctx)!

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ sheet: EditableSheet; row: Record<string, unknown>; isNew: boolean } | null>(null)
  const open = useCallback((sheet: EditableSheet, row?: Record<string, unknown>) => {
    const isNew = !row?.id
    setState({ sheet, row: isNew ? { ...SCHEMAS[sheet].defaults(), ...row } : { ...row }, isNew })
  }, [])
  const close = () => setState(null)
  // Existing tasks & follow-ups open in the rich item sheet (inline edit + comments).
  const rich = state && !state.isNew && (state.sheet === 'Tasks' || state.sheet === 'FollowUps')
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state && rich && <ItemSheet key={String(state.row.id)} sheet={state.sheet as 'Tasks' | 'FollowUps'} id={String(state.row.id)} onClose={close} />}
      {state && !rich && <EditorModal key={String(state.row.id ?? 'new')} {...state} onClose={close} />}
    </Ctx.Provider>
  )
}

export function FieldInput({ f, value, set, form, disabled, autoFocus, onSubmit }: { f: Field; value: unknown; set: (v: unknown) => void; form: Record<string, unknown>; disabled?: boolean; autoFocus?: boolean; onSubmit?: () => void }) {
  const { db } = useStore()
  const v = value ?? ''
  const common = { className: 'input', disabled }
  const people = Array.from(new Set([...db.Team.map((m) => m.name), ...db.FollowUps.map((x) => x.person)].filter(Boolean)))
  switch (f.type) {
    case 'textarea':
      return <textarea {...common} rows={3} value={String(v)} placeholder={f.placeholder && tr(f.placeholder)} onChange={(e) => set(e.target.value)} />
    case 'select':
      return (
        <select {...common} value={String(v)} onChange={(e) => set(e.target.value)}>
          {Object.entries(f.options!).map(([k, l]) => (
            <option key={k} value={k}>
              {tr(l)}
            </option>
          ))}
        </select>
      )
    case 'date':
      return <DatePicker value={String(v)} onChange={(iso) => set(iso)} />
    case 'number':
      return <input {...common} type="number" dir="ltr" className="input num" value={v === '' ? '' : Number(v)} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} />
    case 'scale':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              disabled={disabled}
              onClick={() => set(n)}
              className={cx('h-11 flex-1 rounded-xl border text-sm font-semibold transition', Number(v) === n ? 'border-ink bg-ink text-surface' : 'border-line-strong hover:bg-muted')}
            >
              {n.toLocaleString(document.documentElement.lang === 'fa' ? 'fa-IR' : 'en-US')}
            </button>
          ))}
        </div>
      )
    case 'project':
      return (
        <select {...common} value={String(v)} onChange={(e) => set(e.target.value)}>
          <option value="">{L('— بدون پروژه —', '— No project —')}</option>
          {db.Projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )
    case 'sprint': {
      const ss = db.Sprints.filter((s) => !form.project_id || s.project_id === form.project_id)
      return (
        <select {...common} value={String(v)} onChange={(e) => set(e.target.value)}>
          <option value="">{L('— بک‌لاگ —', '— Backlog —')}</option>
          {ss.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.status === 'active' ? L('(فعال)', '(active)') : ''}
            </option>
          ))}
        </select>
      )
    }
    case 'member':
      return (
        <select {...common} value={String(v)} onChange={(e) => set(e.target.value)}>
          <option value="">—</option>
          {db.Team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )
    case 'person':
      return (
        <>
          <input {...common} list="people-list" value={String(v)} placeholder={L('نام را بنویسید یا انتخاب کنید', 'Type or pick a name')} onChange={(e) => set(e.target.value)} />
          <datalist id="people-list">
            {people.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </>
      )
    default:
      return (
        <input
          {...common}
          value={String(v)}
          placeholder={f.placeholder && tr(f.placeholder)}
          autoFocus={autoFocus}
          onChange={(e) => set(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit?.()}
        />
      )
  }
}

function EditorModal({ sheet, row, isNew, onClose }: { sheet: EditableSheet; row: Record<string, unknown>; isNew: boolean; onClose: () => void }) {
  const { upsert, remove, toast, canEdit } = useStore()
  const schema = SCHEMAS[sheet]
  const [form, setForm] = useState<Record<string, unknown>>(row)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))
  const missing = schema.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim())
  const title = tr(schema.title)

  const save = async () => {
    if (missing.length) return
    setSaving(true)
    const out = { ...form }
    if (isNew) out.id = uid(schema.prefix)
    // Auto-stamp completion dates so burndown & history stay accurate.
    if (sheet === 'Tasks') out.completed_at = out.status === 'done' ? out.completed_at || todayISO() : ''
    if (sheet === 'FollowUps') out.done_at = out.status === 'done' ? out.done_at || todayISO() : ''
    try {
      await upsert(sheet, out as never)
      toast(isNew ? L(`${title} ایجاد شد`, `${title} created`) : L('تغییرات ذخیره شد', 'Changes saved'))
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const del = async () => {
    try {
      await remove(sheet, String(form.id))
      toast(L(`${title} حذف شد`, `${title} deleted`))
      onClose()
    } catch {}
  }

  return (
    <Sheet
      open
      onClose={onClose}
      header={
        <div>
          <div className="eyebrow">{isNew ? L('ایجاد', 'Create') : L('ویرایش', 'Edit')}</div>
          <h2 className="font-semibold">{isNew ? L(`${title} جدید`, `New ${title.toLowerCase()}`) : title}</h2>
        </div>
      }
      footer={
        canEdit ? (
          <>
            <button className="btn-primary" onClick={save} disabled={saving || missing.length > 0}>
              {saving ? L('در حال ذخیره…', 'Saving…') : isNew ? L('ایجاد', 'Create') : L('ذخیره', 'Save')}
            </button>
            <button className="btn-ghost" onClick={onClose}>
              {L('انصراف', 'Cancel')}
            </button>
            <div className="flex-1" />
            {!isNew &&
              (confirmDel ? (
                <button className="btn-danger" onClick={del}>
                  {L('تأیید حذف', 'Confirm delete')}
                </button>
              ) : (
                <button className="btn-danger" onClick={() => setConfirmDel(true)}>
                  <Trash2 size={16} /> {L('حذف', 'Delete')}
                </button>
              ))}
          </>
        ) : (
          <span className="text-xs text-sub">{L('دسترسی شما فقط مشاهده است.', 'You have view-only access.')}</span>
        )
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 py-6">
        {schema.fields.map((f, i) => (
          <div key={f.key} className={f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
            <label className="label">
              {tr(f.label)}
              {f.required && <span className="ms-0.5 text-bad">*</span>}
            </label>
            <FieldInput f={f} value={form[f.key]} set={(v) => set(f.key, v)} form={form} disabled={!canEdit} autoFocus={isNew && i === 0} onSubmit={save} />
          </div>
        ))}
      </div>
    </Sheet>
  )
}

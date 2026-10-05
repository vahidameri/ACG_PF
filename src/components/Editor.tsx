import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import type { DB, SheetName } from '../lib/types'
import { useStore } from '../lib/store'
import { uid } from '../lib/api'
import { todayISO } from '../lib/jalali'
import {
  CHANNEL, FOLLOWUP_STATUS, HEALTH, MILESTONE_STATUS, PRIORITY, PROJECT_STATUS, RISK_STATUS, RISK_TYPE, SCOPE_STATUS, SPRINT_STATUS, TASK_STATUS,
} from '../lib/labels'
import { Modal, cx } from './ui'
import { DatePicker } from './DatePicker'

type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'number' | 'project' | 'person' | 'sprint' | 'member' | 'scale'
interface Field {
  key: string
  label: string
  type: FieldType
  options?: Record<string, string>
  half?: boolean
  required?: boolean
  placeholder?: string
}

const opts = (o: Record<string, string>) => o

export const SCHEMAS: Record<SheetName, { title: string; prefix: string; fields: Field[]; defaults: () => Record<string, unknown> }> = {
  Tasks: {
    title: 'تسک',
    prefix: 'T',
    fields: [
      { key: 'title', label: 'عنوان تسک', type: 'text', required: true, placeholder: 'مثلاً: هماهنگی جلسه‌ی دمو با واحد فروش' },
      { key: 'description', label: 'توضیحات', type: 'textarea' },
      { key: 'project_id', label: 'پروژه', type: 'project', half: true },
      { key: 'sprint_id', label: 'اسپرینت', type: 'sprint', half: true },
      { key: 'assignee', label: 'مسئول', type: 'person', half: true },
      { key: 'due_date', label: 'سررسید', type: 'date', half: true },
      { key: 'status', label: 'وضعیت', type: 'select', options: TASK_STATUS, half: true },
      { key: 'priority', label: 'اولویت', type: 'select', options: PRIORITY, half: true },
      { key: 'points', label: 'استوری‌پوینت', type: 'number', half: true },
      { key: 'tags', label: 'برچسب‌ها', type: 'text', half: true, placeholder: 'با کاما جدا کنید' },
    ],
    defaults: () => ({ status: 'todo', priority: 'medium', points: 0, created_at: todayISO() }),
  },
  FollowUps: {
    title: 'فالوآپ',
    prefix: 'F',
    fields: [
      { key: 'subject', label: 'موضوع پیگیری', type: 'text', required: true, placeholder: 'مثلاً: تأیید بودجه‌ی فاز ۲' },
      { key: 'person', label: 'از چه کسی؟', type: 'person', half: true },
      { key: 'channel', label: 'کانال', type: 'select', options: CHANNEL, half: true },
      { key: 'project_id', label: 'پروژه', type: 'project', half: true },
      { key: 'due_date', label: 'تاریخ پیگیری بعدی', type: 'date', half: true },
      { key: 'status', label: 'وضعیت', type: 'select', options: FOLLOWUP_STATUS, half: true },
      { key: 'priority', label: 'اولویت', type: 'select', options: PRIORITY, half: true },
      { key: 'notes', label: 'یادداشت / سابقه', type: 'textarea' },
    ],
    defaults: () => ({ status: 'open', priority: 'medium', channel: 'meeting', created_at: todayISO(), due_date: todayISO() }),
  },
  Projects: {
    title: 'پروژه',
    prefix: 'P',
    fields: [
      { key: 'name', label: 'نام پروژه', type: 'text', required: true },
      { key: 'code', label: 'کد', type: 'text', half: true, placeholder: 'ACG-XXX' },
      { key: 'category', label: 'دسته', type: 'text', half: true },
      { key: 'description', label: 'شرح', type: 'textarea' },
      { key: 'objective', label: 'هدف کسب‌وکاری', type: 'text' },
      { key: 'owner', label: 'مدیر پروژه', type: 'person', half: true },
      { key: 'sponsor', label: 'اسپانسر', type: 'person', half: true },
      { key: 'status', label: 'وضعیت', type: 'select', options: PROJECT_STATUS, half: true },
      { key: 'priority', label: 'اولویت', type: 'select', options: PRIORITY, half: true },
      { key: 'phase', label: 'فاز فعلی', type: 'text', half: true },
      { key: 'progress', label: 'پیشرفت دستی (٪) — خالی = خودکار', type: 'number', half: true },
      { key: 'start_date', label: 'شروع', type: 'date', half: true },
      { key: 'end_date', label: 'ددلاین', type: 'date', half: true },
      { key: 'budget', label: 'بودجه (ریال)', type: 'number', half: true },
      { key: 'spent', label: 'هزینه‌شده (ریال)', type: 'number', half: true },
      { key: 'health_override', label: 'سلامت دستی (خالی = محاسبه‌ی خودکار)', type: 'select', options: opts({ '': 'خودکار', ...HEALTH }) },
    ],
    defaults: () => ({ status: 'planning', priority: 'medium', start_date: todayISO(), budget: 0, spent: 0, progress: '', health_override: '' }),
  },
  Milestones: {
    title: 'مایلستون',
    prefix: 'MS',
    fields: [
      { key: 'title', label: 'عنوان', type: 'text', required: true },
      { key: 'project_id', label: 'پروژه', type: 'project', half: true, required: true },
      { key: 'owner', label: 'مسئول', type: 'person', half: true },
      { key: 'planned_date', label: 'تاریخ برنامه', type: 'date', half: true },
      { key: 'actual_date', label: 'تاریخ واقعی', type: 'date', half: true },
      { key: 'status', label: 'وضعیت', type: 'select', options: MILESTONE_STATUS, half: true },
      { key: 'weight', label: 'وزن در پیشرفت', type: 'number', half: true },
    ],
    defaults: () => ({ status: 'pending', weight: 1 }),
  },
  Sprints: {
    title: 'اسپرینت',
    prefix: 'S',
    fields: [
      { key: 'name', label: 'نام', type: 'text', required: true, half: true },
      { key: 'project_id', label: 'پروژه', type: 'project', half: true, required: true },
      { key: 'goal', label: 'هدف اسپرینت', type: 'text' },
      { key: 'start_date', label: 'شروع', type: 'date', half: true },
      { key: 'end_date', label: 'پایان', type: 'date', half: true },
      { key: 'committed_points', label: 'پوینت تعهدشده (خالی = جمع تسک‌ها)', type: 'number', half: true },
      { key: 'completed_points', label: 'پوینت انجام‌شده (اگر تسک ندارد)', type: 'number', half: true },
      { key: 'status', label: 'وضعیت', type: 'select', options: SPRINT_STATUS },
    ],
    defaults: () => ({ status: 'planned', committed_points: 0, completed_points: 0 }),
  },
  Risks: {
    title: 'ریسک / مسئله',
    prefix: 'R',
    fields: [
      { key: 'title', label: 'عنوان', type: 'text', required: true },
      { key: 'type', label: 'نوع', type: 'select', options: RISK_TYPE, half: true },
      { key: 'project_id', label: 'پروژه', type: 'project', half: true },
      { key: 'probability', label: 'احتمال (۱ تا ۵)', type: 'scale', half: true },
      { key: 'impact', label: 'اثر (۱ تا ۵)', type: 'scale', half: true },
      { key: 'owner', label: 'مالک', type: 'person', half: true },
      { key: 'due_date', label: 'تاریخ اقدام', type: 'date', half: true },
      { key: 'mitigation', label: 'برنامه‌ی کاهش / اقدام', type: 'textarea' },
      { key: 'status', label: 'وضعیت', type: 'select', options: RISK_STATUS },
    ],
    defaults: () => ({ type: 'risk', probability: 3, impact: 3, status: 'open' }),
  },
  Scope: {
    title: 'آیتم اسکوپ',
    prefix: 'SC',
    fields: [
      { key: 'item', label: 'آیتم', type: 'text', required: true },
      { key: 'project_id', label: 'پروژه', type: 'project', half: true, required: true },
      { key: 'type', label: 'داخل / خارج اسکوپ', type: 'select', options: { in: 'داخل اسکوپ', out: 'خارج از اسکوپ' }, half: true },
      { key: 'status', label: 'وضعیت', type: 'select', options: SCOPE_STATUS, half: true },
      { key: 'date', label: 'تاریخ', type: 'date', half: true },
      { key: 'change_note', label: 'یادداشت تغییر', type: 'textarea' },
    ],
    defaults: () => ({ type: 'in', status: 'planned', date: todayISO() }),
  },
  Updates: {
    title: 'گزارش وضعیت هفتگی',
    prefix: 'U',
    fields: [
      { key: 'project_id', label: 'پروژه', type: 'project', half: true, required: true },
      { key: 'week_date', label: 'تاریخ', type: 'date', half: true },
      { key: 'health', label: 'وضعیت کلی', type: 'select', options: HEALTH, half: true },
      { key: 'author', label: 'گزارش‌دهنده', type: 'person', half: true },
      { key: 'summary', label: 'خلاصه برای مدیریت', type: 'textarea', required: true },
      { key: 'done', label: 'انجام‌شده‌ها (هر خط یک مورد)', type: 'textarea' },
      { key: 'next', label: 'برنامه‌ی هفته‌ی بعد', type: 'textarea' },
      { key: 'blockers', label: 'موانع / نیاز به کمک مدیریت', type: 'textarea' },
    ],
    defaults: () => ({ health: 'green', week_date: todayISO() }),
  },
  Team: {
    title: 'عضو تیم',
    prefix: 'M',
    fields: [
      { key: 'name', label: 'نام', type: 'text', required: true },
      { key: 'role', label: 'نقش', type: 'text', half: true },
      { key: 'team', label: 'تیم', type: 'text', half: true },
      { key: 'email', label: 'ایمیل', type: 'text' },
    ],
    defaults: () => ({}),
  },
  Allocations: {
    title: 'تخصیص منابع',
    prefix: 'A',
    fields: [
      { key: 'member_id', label: 'عضو', type: 'member', half: true, required: true },
      { key: 'project_id', label: 'پروژه', type: 'project', half: true, required: true },
      { key: 'percent', label: 'درصد تخصیص', type: 'number' },
    ],
    defaults: () => ({ percent: 50 }),
  },
}

interface EditorCtx {
  open: (sheet: SheetName, row?: Record<string, unknown>) => void
}
const Ctx = createContext<EditorCtx | null>(null)
export const useEditor = () => useContext(Ctx)!

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ sheet: SheetName; row: Record<string, unknown>; isNew: boolean } | null>(null)
  const open = useCallback((sheet: SheetName, row?: Record<string, unknown>) => {
    const isNew = !row?.id
    setState({ sheet, row: isNew ? { ...SCHEMAS[sheet].defaults(), ...row } : { ...row }, isNew })
  }, [])
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state && <EditorModal key={String(state.row.id ?? 'new')} {...state} onClose={() => setState(null)} />}
    </Ctx.Provider>
  )
}

function EditorModal({ sheet, row, isNew, onClose }: { sheet: SheetName; row: Record<string, unknown>; isNew: boolean; onClose: () => void }) {
  const { db, upsert, remove, toast, canEdit } = useStore()
  const schema = SCHEMAS[sheet]
  const [form, setForm] = useState<Record<string, unknown>>(row)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const people = Array.from(new Set([...db.Team.map((m) => m.name), ...db.FollowUps.map((f) => f.person)].filter(Boolean)))
  const missing = schema.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim())

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
      toast(isNew ? `${schema.title} ایجاد شد` : 'تغییرات ذخیره شد')
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const del = async () => {
    try {
      await remove(sheet, String(form.id))
      toast(`${schema.title} حذف شد`)
      onClose()
    } catch {}
  }

  const renderField = (f: Field) => {
    const v = form[f.key] ?? ''
    const common = { className: 'input', disabled: !canEdit }
    switch (f.type) {
      case 'textarea':
        return <textarea {...common} rows={3} value={String(v)} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
      case 'select':
        return (
          <select {...common} value={String(v)} onChange={(e) => set(f.key, e.target.value)}>
            {Object.entries(f.options!).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        )
      case 'date':
        return <DatePicker value={String(v)} onChange={(iso) => set(f.key, iso)} />
      case 'number':
        return <input {...common} type="number" dir="ltr" className="input text-left num" value={v === '' ? '' : Number(v)} onChange={(e) => set(f.key, e.target.value === '' ? '' : Number(e.target.value))} />
      case 'scale':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                disabled={!canEdit}
                onClick={() => set(f.key, n)}
                className={cx('h-10 flex-1 rounded-xl border text-sm font-semibold transition', Number(v) === n ? 'border-brand bg-brand text-white' : 'border-line hover:bg-muted')}
              >
                {n.toLocaleString('fa-IR')}
              </button>
            ))}
          </div>
        )
      case 'project':
        return (
          <select {...common} value={String(v)} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">— بدون پروژه —</option>
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
          <select {...common} value={String(v)} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">— بک‌لاگ —</option>
            {ss.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.status === 'active' ? '(فعال)' : ''}
              </option>
            ))}
          </select>
        )
      }
      case 'member':
        return (
          <select {...common} value={String(v)} onChange={(e) => set(f.key, e.target.value)}>
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
            <input {...common} list="people-list" value={String(v)} placeholder="نام را بنویسید یا انتخاب کنید" onChange={(e) => set(f.key, e.target.value)} />
            <datalist id="people-list">
              {people.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </>
        )
      default:
        return <input {...common} value={String(v)} placeholder={f.placeholder} autoFocus={f.required && isNew && f === schema.fields[0]} onChange={(e) => set(f.key, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && save()} />
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? `${schema.title} جدید` : `ویرایش ${schema.title}`}
      footer={
        canEdit ? (
          <>
            <button className="btn-primary" onClick={save} disabled={saving || missing.length > 0}>
              {saving ? 'در حال ذخیره…' : isNew ? 'ایجاد' : 'ذخیره'}
            </button>
            <button className="btn-ghost" onClick={onClose}>
              انصراف
            </button>
            <div className="flex-1" />
            {!isNew &&
              (confirmDel ? (
                <button className="btn-danger" onClick={del}>
                  تأیید حذف
                </button>
              ) : (
                <button className="btn-danger" onClick={() => setConfirmDel(true)}>
                  <Trash2 size={16} /> حذف
                </button>
              ))}
          </>
        ) : (
          <span className="text-xs text-sub">دسترسی شما فقط مشاهده است.</span>
        )
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {schema.fields.map((f) => (
          <div key={f.key} className={f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
            <label className="label">
              {f.label}
              {f.required && <span className="text-bad mr-0.5">*</span>}
            </label>
            {renderField(f)}
          </div>
        ))}
      </div>
    </Modal>
  )
}

export type { DB }

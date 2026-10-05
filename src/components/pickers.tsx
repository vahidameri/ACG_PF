// Inline property pickers — click a value to change it in place (Linear-style).
import { useState } from 'react'
import { UserRound, FolderKanban, Search } from 'lucide-react'
import type { Priority, TaskStatus } from '../lib/types'
import { PRIORITY, TASK_STATUS, TASK_STATUS_ORDER } from '../lib/labels'
import { lbl, L } from '../lib/i18n'
import { useStore } from '../lib/store'
import { Avatar, MenuItem, Popover, PriorityIcon, StatusIcon, cx } from './ui'

const trig = 'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition hover:bg-muted disabled:pointer-events-none'

export function StatusPicker({ value, onChange, label = true }: { value: TaskStatus; onChange: (v: TaskStatus) => void; label?: boolean }) {
  const { canEdit } = useStore()
  return (
    <Popover
      width={200}
      trigger={({ toggle }) => (
        <button className={trig} onClick={toggle} disabled={!canEdit} title={lbl(TASK_STATUS, value)}>
          <StatusIcon s={value} size={15} />
          {label && <span>{lbl(TASK_STATUS, value)}</span>}
        </button>
      )}
    >
      {(close) =>
        TASK_STATUS_ORDER.map((s, i) => (
          <MenuItem
            key={s}
            icon={<StatusIcon s={s} size={14} />}
            active={s === value}
            hint={String(i + 1)}
            onClick={() => {
              onChange(s)
              close()
            }}
          >
            {lbl(TASK_STATUS, s)}
          </MenuItem>
        ))
      }
    </Popover>
  )
}

export function PriorityPicker({ value, onChange, label = true }: { value: Priority; onChange: (v: Priority) => void; label?: boolean }) {
  const { canEdit } = useStore()
  return (
    <Popover
      width={190}
      trigger={({ toggle }) => (
        <button className={trig} onClick={toggle} disabled={!canEdit} title={lbl(PRIORITY, value)}>
          <PriorityIcon p={value} />
          {label && <span>{lbl(PRIORITY, value)}</span>}
        </button>
      )}
    >
      {(close) =>
        (['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
          <MenuItem
            key={p}
            icon={<PriorityIcon p={p} />}
            active={p === value}
            onClick={() => {
              onChange(p)
              close()
            }}
          >
            {lbl(PRIORITY, p)}
          </MenuItem>
        ))
      }
    </Popover>
  )
}

export function PersonPicker({ value, onChange, label = true, placeholder }: { value: string; onChange: (v: string) => void; label?: boolean; placeholder?: string }) {
  const { db, canEdit, me } = useStore()
  const [q, setQ] = useState('')
  const people = Array.from(new Set([me, ...db.Team.map((m) => m.name)].filter(Boolean)))
  const list = people.filter((p) => !q || p.includes(q))
  return (
    <Popover
      width={240}
      trigger={({ toggle }) => (
        <button className={trig} onClick={toggle} disabled={!canEdit}>
          {value ? <Avatar name={value} size="xs" /> : <UserRound size={15} className="text-sub" />}
          {label && <span className={cx('max-w-[9rem] truncate', !value && 'text-sub')}>{value || placeholder || L('بدون مسئول', 'Unassigned')}</span>}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center gap-2 border-b border-line px-2.5 pb-1.5">
            <Search size={14} className="text-sub" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && q.trim()) {
                  onChange(list[0] || q.trim())
                  close()
                }
              }}
              placeholder={L('جستجو یا نام جدید…', 'Search or new name…')}
              className="h-8 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto pt-1">
            <MenuItem
              icon={<UserRound size={14} />}
              active={!value}
              onClick={() => {
                onChange('')
                close()
              }}
            >
              {L('بدون مسئول', 'Unassigned')}
            </MenuItem>
            {list.map((p) => (
              <MenuItem
                key={p}
                icon={<Avatar name={p} size="xs" />}
                active={p === value}
                hint={p === me ? L('من', 'me') : undefined}
                onClick={() => {
                  onChange(p)
                  close()
                }}
              >
                {p}
              </MenuItem>
            ))}
            {q && !people.includes(q) && (
              <MenuItem
                icon={<UserRound size={14} />}
                onClick={() => {
                  onChange(q.trim())
                  close()
                }}
              >
                {L(`افزودن «${q}»`, `Add “${q}”`)}
              </MenuItem>
            )}
          </div>
        </>
      )}
    </Popover>
  )
}

export function ProjectPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { db, canEdit } = useStore()
  const p = db.Projects.find((x) => x.id === value)
  return (
    <Popover
      width={260}
      trigger={({ toggle }) => (
        <button className={trig} onClick={toggle} disabled={!canEdit}>
          <FolderKanban size={14} className="text-sub" />
          <span className={cx('max-w-[12rem] truncate', !p && 'text-sub')}>{p ? p.name : L('بدون پروژه', 'No project')}</span>
        </button>
      )}
    >
      {(close) => (
        <div className="max-h-72 overflow-y-auto">
          <MenuItem
            active={!value}
            onClick={() => {
              onChange('')
              close()
            }}
          >
            <span className="text-sub">{L('بدون پروژه', 'No project')}</span>
          </MenuItem>
          {db.Projects.filter((x) => x.status !== 'cancelled').map((x) => (
            <MenuItem
              key={x.id}
              active={x.id === value}
              hint={<span dir="ltr">{x.code}</span>}
              onClick={() => {
                onChange(x.id)
                close()
              }}
            >
              {x.name}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DB, Role, Row, SheetName } from './types'
import { fetchAll, loadConfig, remoteDelete, remoteUpsert, saveConfig, type Config } from './api'
import { buildDemo, demoMe } from '../data/demo'
import { L, locale } from './i18n'

// Demo edits are kept per language so switching language shows sample data in that language.
const demoKey = () => `acg.demo.db.${locale.lang}`
const ME_KEY = 'acg.me'

const NUMERIC: Partial<Record<SheetName, string[]>> = {
  Projects: ['budget', 'spent'],
  Milestones: ['weight'],
  Sprints: ['committed_points', 'completed_points'],
  Tasks: ['points'],
  Risks: ['probability', 'impact'],
  Allocations: ['percent'],
}

function emptyDB(): DB {
  return { Projects: [], Scope: [], Milestones: [], Sprints: [], Tasks: [], FollowUps: [], Risks: [], Team: [], Allocations: [], Updates: [], Comments: [] }
}

// Sheets return numbers as numbers or strings, dates as ISO strings. Normalize once here.
function normalize(raw: Partial<DB>): DB {
  const db = emptyDB()
  for (const k of Object.keys(db) as SheetName[]) {
    const rows = (raw[k] || []) as unknown as Record<string, unknown>[]
    db[k] = rows
      .filter((r) => r && r.id !== '' && r.id !== undefined)
      .map((r) => {
        const o: Record<string, unknown> = {}
        for (const [key, v] of Object.entries(r)) {
          if (v === null || v === undefined) o[key] = ''
          else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) o[key] = v.slice(0, 10)
          else o[key] = typeof v === 'number' ? v : String(v)
          if (NUMERIC[k]?.includes(key)) o[key] = o[key] === '' ? 0 : Number(o[key]) || 0
        }
        o.id = String(o.id)
        return o
      }) as never
  }
  return db
}

export type Mode = 'demo' | 'live'

interface Toast {
  id: number
  text: string
  kind: 'ok' | 'err'
  action?: { label: string; run: () => void }
}

interface Store {
  db: DB
  mode: Mode
  role: Role
  me: string
  setMe: (n: string) => void
  loading: boolean
  error: string
  lastSync: Date | null
  config: Config
  setConfig: (c: Config) => void
  refresh: () => Promise<void>
  upsert: <S extends SheetName>(sheet: S, row: Row<S>) => Promise<void>
  remove: (sheet: SheetName, id: string) => Promise<void>
  resetDemo: () => void
  canEdit: boolean
  toasts: Toast[]
  toast: (text: string, kind?: Toast['kind'], action?: Toast['action']) => void
  dismissToast: (id: number) => void
}

const Ctx = createContext<Store | null>(null)

function loadDemo(): DB {
  try {
    const raw = localStorage.getItem(demoKey())
    if (raw) return normalize(JSON.parse(raw))
  } catch {}
  return buildDemo()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(loadConfig)
  const mode: Mode = config.apiUrl ? 'live' : 'demo'
  const [db, setDb] = useState<DB>(() => (mode === 'demo' ? loadDemo() : emptyDB()))
  const [role, setRole] = useState<Role>(mode === 'demo' ? 'admin' : 'viewer')
  const [remoteName, setRemoteName] = useState('')
  const [meLocal, setMeLocal] = useState(() => {
    try {
      return localStorage.getItem(ME_KEY) || ''
    } catch {
      return ''
    }
  })
  const [loading, setLoading] = useState(mode === 'live')
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(mode === 'demo' ? new Date() : null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const dbRef = useRef(db)
  dbRef.current = db

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok', action?: Toast['action']) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, kind, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 3200)
  }, [])

  const persistDemo = (next: DB) => {
    try {
      localStorage.setItem(demoKey(), JSON.stringify(next))
    } catch {}
  }

  const refresh = useCallback(async () => {
    if (mode === 'demo') {
      setLastSync(new Date())
      return
    }
    setLoading(true)
    try {
      const { data, user } = await fetchAll(config)
      setDb(normalize(data))
      setRole(user?.role || 'viewer')
      setRemoteName(user?.name || '')
      setError('')
      setLastSync(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [config, mode])

  useEffect(() => {
    if (mode === 'demo') {
      setDb(loadDemo())
      setRole('admin')
      setLoading(false)
      setError('')
      return
    }
    refresh()
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 120000)
    return () => clearInterval(iv)
  }, [mode, refresh])

  // In demo mode, swap sample data when the interface language changes.
  const [, bump] = useState(0)
  useEffect(() => {
    const h = () => {
      if (mode === 'demo') setDb(loadDemo())
      bump((n) => n + 1)
    }
    window.addEventListener('acg-lang', h)
    return () => window.removeEventListener('acg-lang', h)
  }, [mode])

  const setConfig = (c: Config) => {
    saveConfig(c)
    setConfigState(c)
  }

  const upsert = useCallback(
    async <S extends SheetName>(sheet: S, row: Row<S>) => {
      const prev = dbRef.current
      const list = prev[sheet] as Row<S>[]
      const exists = list.some((r) => r.id === row.id)
      const next = { ...prev, [sheet]: exists ? list.map((r) => (r.id === row.id ? row : r)) : [...list, row] } as DB
      setDb(next)
      if (mode === 'demo') {
        persistDemo(next)
        return
      }
      try {
        await remoteUpsert(config, sheet, row as unknown as Record<string, unknown>)
        setLastSync(new Date())
      } catch (e) {
        setDb(prev)
        toast(`${L('ذخیره نشد', 'Not saved')}: ${e instanceof Error ? e.message : e}`, 'err')
        throw e
      }
    },
    [config, mode, toast],
  )

  const remove = useCallback(
    async (sheet: SheetName, id: string) => {
      const prev = dbRef.current
      const next = { ...prev, [sheet]: (prev[sheet] as { id: string }[]).filter((r) => r.id !== id) } as DB
      setDb(next)
      if (mode === 'demo') {
        persistDemo(next)
        return
      }
      try {
        await remoteDelete(config, sheet, id)
      } catch (e) {
        setDb(prev)
        toast(`${L('حذف نشد', 'Not deleted')}: ${e instanceof Error ? e.message : e}`, 'err')
        throw e
      }
    },
    [config, mode, toast],
  )

  const resetDemo = () => {
    try {
      localStorage.removeItem(demoKey())
    } catch {}
    setDb(buildDemo())
    toast(L('داده‌های نمونه بازنشانی شد', 'Sample data reset'))
  }

  const setMe = (n: string) => {
    setMeLocal(n)
    try {
      localStorage.setItem(ME_KEY, n)
    } catch {}
  }

  const me = meLocal || remoteName || (mode === 'demo' ? demoMe() : '')

  const value = useMemo<Store>(
    () => ({ db, mode, role, me, setMe, loading, error, lastSync, config, setConfig, refresh, upsert, remove, resetDemo, canEdit: role !== 'viewer', toasts, toast, dismissToast }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, mode, role, me, loading, error, lastSync, config, refresh, upsert, remove, toasts, toast, dismissToast],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}

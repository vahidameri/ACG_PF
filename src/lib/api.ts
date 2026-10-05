import type { DB, Role, SheetName } from './types'

export interface Config {
  apiUrl: string
  token: string
}

const CFG_KEY = 'acg.config'

export function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  const env = import.meta.env
  return { apiUrl: env.VITE_API_URL || '', token: '' }
}

export function saveConfig(c: Config) {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify(c))
  } catch {}
}

export interface RemoteUser {
  name: string
  role: Role
}

interface AllResponse {
  ok: boolean
  error?: string
  data: DB
  user: RemoteUser
}

export async function fetchAll(c: Config): Promise<{ data: DB; user: RemoteUser }> {
  const url = `${c.apiUrl}${c.apiUrl.includes('?') ? '&' : '?'}action=all&token=${encodeURIComponent(c.token)}`
  const res = await fetch(url, { method: 'GET', redirect: 'follow' })
  const json = (await res.json()) as AllResponse
  if (!json.ok) throw new Error(json.error || 'خطای ناشناخته از سرور')
  return { data: json.data, user: json.user }
}

// text/plain avoids a CORS preflight, which Apps Script doesn't answer.
async function post(c: Config, body: Record<string, unknown>) {
  const res = await fetch(c.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, token: c.token }),
    redirect: 'follow',
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'ذخیره انجام نشد')
  return json
}

export function remoteUpsert(c: Config, sheet: SheetName, row: Record<string, unknown>) {
  return post(c, { action: 'upsert', sheet, row })
}

export function remoteDelete(c: Config, sheet: SheetName, id: string) {
  return post(c, { action: 'delete', sheet, id })
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

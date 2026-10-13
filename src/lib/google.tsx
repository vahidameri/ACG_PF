// Google sign-in with Google Identity Services (token model). One consent gives us the user's
// identity (sent to Apps Script, which checks it against the Users tab) and Calendar access.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { setAccessToken } from './api'

export const GOOGLE_SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.events'].join(' ')
const KEY = 'acg.gsession'

export interface GSession {
  token: string
  exp: number // ms epoch
  email: string
  name: string
  picture: string
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string; login_hint?: string }) => void
}
interface ScriptRun {
  withSuccessHandler: (f: (r: unknown) => void) => ScriptRun
  withFailureHandler: (f: (e: Error) => void) => ScriptRun
  atlasSession: () => void
}
declare global {
  interface Window {
    google?: {
      script?: { run: ScriptRun }
      accounts: {
        oauth2: {
          initTokenClient: (o: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }) => TokenClient
          revoke: (token: string, cb?: () => void) => void
        }
      }
    }
  }
}

function load(): GSession | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || 'null') as GSession | null
    return s && s.exp > Date.now() + 60_000 ? s : null
  } catch {
    return null
  }
}

let gisPromise: Promise<void> | null = null
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Google sign-in could not load'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

/** True when the app is served by Apps Script (HtmlService) — the zero-hosting setup. */
export const hosted = () => typeof window !== 'undefined' && !!window.google?.script?.run

function scriptSession(): Promise<{ token: string; email: string; apiUrl: string }> {
  return new Promise((resolve, reject) =>
    window.google!.script!.run.withSuccessHandler((r) => resolve(r as never)).withFailureHandler(reject).atlasSession(),
  )
}

interface Ctx {
  hosted: boolean
  /** data API address handed over by Apps Script in hosted mode */
  apiUrl: string
  session: GSession | null
  signIn: (clientId: string, opts?: { silent?: boolean; hint?: string }) => Promise<GSession>
  signOut: () => void
  busy: boolean
  error: string
}
const C = createContext<Ctx | null>(null)
export const useGoogle = () => useContext(C)!

export function GoogleProvider({ children }: { children: ReactNode }) {
  const isHosted = hosted()
  const [session, setSession] = useState<GSession | null>(isHosted ? null : load)
  const [busy, setBusy] = useState(isHosted)
  const [error, setError] = useState('')
  const [apiUrl, setApiUrl] = useState('')

  // Hosted in Apps Script: the page already runs as the signed-in Google user — just ask for a token.
  const loadHosted = useCallback(async () => {
    setBusy(true)
    try {
      const r = await scriptSession()
      let name = ''
      let picture = ''
      try {
        const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${r.token}` } }).then((x) => x.json())
        name = info.name || ''
        picture = info.picture || ''
      } catch {}
      setAccessToken(r.token)
      setApiUrl(r.apiUrl)
      setSession({ token: r.token, exp: Date.now() + 50 * 60_000, email: String(r.email).toLowerCase(), name, picture })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])
  useEffect(() => {
    if (!isHosted) return
    loadHosted()
    const t = setInterval(loadHosted, 45 * 60_000)
    return () => clearInterval(t)
  }, [isHosted, loadHosted])
  useEffect(() => setAccessToken(session?.token || ''), [session])
  // token lifetime is one hour; renew quietly a few minutes before it expires
  useEffect(() => {
    if (!session || isHosted) return
    const t = setTimeout(() => setSession(null), Math.max(0, session.exp - Date.now() - 120_000))
    return () => clearTimeout(t)
  }, [session, isHosted])

  const signIn = useCallback(async (clientId: string, opts: { silent?: boolean; hint?: string } = {}) => {
    if (hosted()) {
      await loadHosted()
      return session as GSession
    }
    setBusy(true)
    setError('')
    try {
      await loadGis()
      const tr = await new Promise<TokenResponse>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: GOOGLE_SCOPES,
          callback: (r) => (r.error ? reject(new Error(r.error)) : resolve(r)),
          error_callback: (e) => reject(new Error(e.type)),
        })
        client.requestAccessToken({ prompt: opts.silent ? '' : 'select_account', login_hint: opts.hint })
      })
      const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tr.access_token}` } }).then((r) => r.json())
      const s: GSession = { token: tr.access_token!, exp: Date.now() + (tr.expires_in || 3600) * 1000, email: String(info.email || '').toLowerCase(), name: info.name || '', picture: info.picture || '' }
      try {
        sessionStorage.setItem(KEY, JSON.stringify(s))
        localStorage.setItem('acg.ghint', s.email)
      } catch {}
      setAccessToken(s.token)
      setSession(s)
      return s
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    } finally {
      setBusy(false)
    }
  }, [loadHosted, session])

  const signOut = useCallback(() => {
    if (session?.token) window.google?.accounts.oauth2.revoke(session.token)
    try {
      sessionStorage.removeItem(KEY)
    } catch {}
    setAccessToken('')
    setSession(null)
  }, [session])

  return <C.Provider value={{ hosted: isHosted, apiUrl, session, signIn, signOut, busy, error }}>{children}</C.Provider>
}

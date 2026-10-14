import { useState } from 'react'
import { JOB_TITLE } from '../lib/labels'
import { ArrowRight, KeyRound, Loader, User } from 'lucide-react'
import { useStore } from '../lib/store'
import { useGoogle } from '../lib/google'
import { useI18n, L, lbl } from '../lib/i18n'
import { AcgLogo, AcgMark } from './Brand'
import { VERSION } from '../lib/brand'
import { cx } from './ui'

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** The front door: Google sign-in. In the demo you can enter as any team member to see their view. */
export function Login({ onEnter }: { onEnter: () => void }) {
  const { config, mode, db, setMe } = useStore()
  const g = useGoogle()
  const { lang, setLang } = useI18n()
  const [who, setWho] = useState(db.Team[0]?.id || '')
  const [err, setErr] = useState('')
  const busy = g.busy

  const google = async () => {
    setErr('')
    if (mode === 'demo') return onEnter()
    try {
      if (g.hosted) {
        if (!g.session) await g.signIn('')
      } else await g.signIn(config.googleClientId || '', { hint: localStorage.getItem('acg.ghint') || undefined })
      onEnter()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }
  const error = err || g.error

  // username + team password (public link, no Google account needed)
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('acg.pw.user') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [working, setWorking] = useState(false)
  const pwLogin = async () => {
    setErr('')
    setWorking(true)
    try {
      await g.passwordLogin(username.trim(), password)
      try {
        localStorage.setItem('acg.pw.user', username.trim())
      } catch {}
      onEnter()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex bg-bg">
      {/* brand side */}
      <aside className="band relative hidden w-[46%] max-w-[44rem] flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="relative z-10 flex items-center gap-3 text-white">
          <AcgMark className="h-8" />
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-band-sub">ACG · Atlas</span>
        </div>
        <div className="relative z-10 max-w-md rise">
          <div className="display text-6xl leading-none text-white">{L('اطلس', 'Atlas')}</div>
          <p className="mt-4 text-lg text-[#c3d0e8]">{L('اطلس پروژه‌های ACG', 'The ACG engagement atlas')}</p>
        </div>
        <div className="relative z-10 flex items-center justify-between text-[0.6875rem] text-band-sub">
          <span>Antwerp Consulting Group</span>
          <a href="https://joinacg.com" target="_blank" rel="noreferrer" dir="ltr" className="font-mono uppercase tracking-[0.18em] transition hover:text-white">
            joinacg.com
          </a>
        </div>
      </aside>

      {/* sign-in side */}
      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <AcgLogo className="h-5 text-ink lg:invisible" />
          <div className="flex rounded-full border border-line p-0.5">
            {(['fa', 'en'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={cx('h-7 rounded-full px-3 text-[0.6875rem] font-semibold transition', lang === l ? 'bg-ink text-surface' : 'text-sub hover:text-ink')}>
                {l === 'fa' ? 'فا' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm rise">
            <div className="mb-8 lg:hidden">
              <div className="display text-4xl">{L('اطلس', 'Atlas')}</div>
              <p className="mt-1 text-sm text-sub">{L('اطلس پروژه‌های ACG', 'The ACG engagement atlas')}</p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{L('ورود به اطلس', 'Sign in to Atlas')}</h1>

            {g.otp ? (
              <div className="mt-8 space-y-3">
                <form onSubmit={(e) => (e.preventDefault(), pwLogin())} className="space-y-3">
                  <div className="relative">
                    <User size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-sub" />
                    <input className="input h-12 w-full ps-10 text-sm" dir="ltr" autoFocus={!username} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={L('نام کاربری', 'Username')} value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div className="relative">
                    <KeyRound size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-sub" />
                    <input className="input h-12 w-full ps-10 text-sm" dir="ltr" type="password" autoFocus={!!username} autoComplete="current-password" placeholder={L('رمز عبور', 'Password')} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <button className="btn-primary h-12 w-full" disabled={working || !username.trim() || !password}>
                    {working ? <Loader size={16} className="animate-spin" /> : <ArrowRight size={16} className="rtl:-scale-x-100" />}
                    {L('ورود', 'Sign in')}
                  </button>
                </form>
                {g.appUrl && (
                  <>
                    <div className="flex items-center gap-3 py-1 text-[0.6875rem] text-sub">
                      <span className="h-px flex-1 bg-line" />
                      {L('یا', 'or')}
                      <span className="h-px flex-1 bg-line" />
                    </div>
                    <a href={g.appUrl} target="_top" className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-surface text-sm font-semibold text-ink shadow-sm transition hover:bg-muted">
                      <GoogleG /> {L('ورود با حساب گوگل', 'Continue with Google')}
                    </a>
                  </>
                )}
              </div>
            ) : (
            <button
              onClick={google}
              disabled={busy && !g.hosted}
              className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-surface text-sm font-semibold text-ink shadow-sm transition hover:bg-muted disabled:opacity-60"
            >
              {busy ? <Loader size={18} className="animate-spin" /> : <GoogleG />}
              {g.hosted && g.session ? L(`ادامه با ${g.session.email}`, `Continue as ${g.session.email}`) : L('ورود با حساب گوگل', 'Continue with Google')}
            </button>
            )}
            {error && <p className="mt-3 rounded-xl bg-bad/10 px-3 py-2 text-xs leading-5 text-bad">{error}</p>}

            {mode === 'demo' && (
              <div className="mt-8 border-t border-line pt-6">
                <div className="mb-2 text-xs font-medium">{L('نمایشی', 'Demo')}</div>
                <div className="flex gap-2">
                  <select className="input h-11 flex-1 text-sm" value={who} onChange={(e) => setWho(e.target.value)}>
                    {db.Team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {lbl(JOB_TITLE, m.role)}
                      </option>
                    ))}
                  </select>
                  <button className="btn-primary h-11 px-5" onClick={() => (setMe(db.Team.find((m) => m.id === who)?.name || ''), onEnter())}>
                    {L('ورود', 'Enter')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <a href="https://joinacg.com" target="_blank" rel="noreferrer" dir="ltr" className="pb-2 text-center font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-sub transition hover:text-ink lg:hidden">
          joinacg.com
        </a>
        <div className="pb-5 text-center font-mono text-[0.625rem] text-sub/70" dir="ltr">v{VERSION}</div>
      </main>
    </div>
  )
}

import { useState } from 'react'
import { ArrowRight, KeyRound, Loader } from 'lucide-react'
import { useStore } from '../lib/store'
import { useGoogle } from '../lib/google'
import { useI18n, L } from '../lib/i18n'
import { APP_NAME } from '../lib/brand'
import { AcgLogo } from './Brand'
import { cx } from './ui'

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** Sign-in: Google account (preferred) or, as a fallback, a personal access key. */
export function SignIn() {
  const { config, setConfig, error: apiError } = useStore()
  const { signIn, busy, error } = useGoogle()
  const { lang, setLang } = useI18n()
  const [key, setKey] = useState('')
  const [useKey, setUseKey] = useState(!config.googleClientId)
  const hint = (() => {
    try {
      return localStorage.getItem('acg.ghint') || undefined
    } catch {
      return undefined
    }
  })()
  return (
    <div className="band fixed inset-0 z-[90] flex flex-col">
      <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <AcgLogo className="h-6 text-white" />
        <div className="flex rounded-full border border-white/10 p-0.5">
          {(['fa', 'en'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={cx('h-7 rounded-full px-3 text-[0.6875rem] font-semibold', lang === l ? 'bg-white text-band' : 'text-white/60')}>
              {l === 'fa' ? 'فا' : 'EN'}
            </button>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex flex-1 items-center px-6 sm:px-10">
        <div className="w-full max-w-xl rise">
          <div className="eyebrow !text-band-sub">ACG · {APP_NAME()}</div>
          <h1 className="display mt-4 text-5xl leading-[1.05] text-white sm:text-6xl">{L('وضوح برای تصمیم‌های مهم.', 'Clarity for consequential decisions.')}</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-band-sub">
            {L('با حساب گوگل سازمانی‌تان وارد شوید. دسترسی شما از روی ایمیل در تب Users مشخص می‌شود و تقویم گوگل‌تان هم وصل می‌شود.', 'Sign in with your Google work account. Your access comes from your email in the Users tab, and your Google Calendar is connected too.')}
          </p>
          {!useKey ? (
            <div className="mt-8 max-w-md">
              <button
                disabled={busy}
                onClick={() => signIn(config.googleClientId!, { hint }).catch(() => {})}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-6 text-[0.9375rem] font-semibold text-[#1f1f1f] shadow-pop transition hover:bg-white/90 disabled:opacity-70"
              >
                {busy ? <Loader size={18} className="animate-spin" /> : <GoogleG />}
                {L('ورود با گوگل', 'Sign in with Google')}
              </button>
              {(error || apiError) && <p className="mt-3 text-xs text-[#ff8a9a]">{apiError || L('ورود انجام نشد. دوباره تلاش کنید.', 'Sign-in failed. Please try again.')}</p>}
              <button onClick={() => setUseKey(true)} className="mt-4 text-[0.6875rem] text-white/45 hover:text-white">
                {L('ورود با کلید دسترسی', 'Use an access key instead')}
              </button>
            </div>
          ) : (
            <form
              className="mt-8 flex max-w-md items-center gap-2 rounded-full bg-white p-1.5 shadow-pop"
              onSubmit={(e) => {
                e.preventDefault()
                if (key.trim()) setConfig({ ...config, token: key.trim() })
              }}
            >
              <KeyRound size={18} className="ms-3 text-sub" />
              <input autoFocus value={key} onChange={(e) => setKey(e.target.value)} type="password" dir="ltr" placeholder={L('کلید دسترسی', 'Access key')} className="h-11 flex-1 bg-transparent px-2 font-mono text-sm text-band outline-none" />
              <button className="btn h-11 bg-band px-5 text-white" disabled={!key.trim()}>
                {L('ورود', 'Enter')} <ArrowRight size={15} className="rtl:rotate-180" />
              </button>
            </form>
          )}
          {useKey && config.googleClientId && (
            <button onClick={() => setUseKey(false)} className="mt-4 block text-[0.6875rem] text-white/45 hover:text-white">
              {L('ورود با گوگل', 'Sign in with Google')}
            </button>
          )}
          <button onClick={() => setConfig({ apiUrl: '', token: '', googleClientId: config.googleClientId })} className="mt-6 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-white/50 hover:text-white">
            {L('مشاهده‌ی نسخه‌ی نمایشی', 'Explore the demo')} →
          </button>
        </div>
      </div>
    </div>
  )
}

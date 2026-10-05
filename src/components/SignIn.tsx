import { useState } from 'react'
import { ArrowRight, KeyRound } from 'lucide-react'
import { useStore } from '../lib/store'
import { useI18n, L } from '../lib/i18n'
import { AcgLogo } from './Brand'
import { cx } from './ui'

/** Branded access screen shown when a Sheet is configured but no personal key is set. */
export function SignIn() {
  const { config, setConfig } = useStore()
  const { lang, setLang } = useI18n()
  const [key, setKey] = useState('')
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
          <div className="eyebrow !text-band-sub">ACG · PMO · {L('پورتفولیو', 'Portfolio')}</div>
          <h1 className="display mt-4 text-5xl leading-[1.05] text-white sm:text-6xl">{L('وضوح برای تصمیم‌های مهم.', 'Clarity for consequential decisions.')}</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-band-sub">{L('برای ورود، کلید دسترسی شخصی خود را وارد کنید. کلید را مدیر برنامه از تب Users گوگل شیت برایتان می‌سازد.', 'Enter your personal access key to continue. Your program manager issues keys from the Users tab of the Google Sheet.')}</p>
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
          <button onClick={() => setConfig({ apiUrl: '', token: '' })} className="mt-5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-white/50 hover:text-white">
            {L('مشاهده‌ی نسخه‌ی نمایشی', 'Explore the demo')} →
          </button>
        </div>
      </div>
    </div>
  )
}

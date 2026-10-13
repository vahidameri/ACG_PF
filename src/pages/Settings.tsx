import { useState } from 'react'
import { CheckCircle2, Link2, Loader2, RotateCcw, Unplug, XCircle, Zap, Server, MonitorSmartphone } from 'lucide-react'
import { useStore } from '../lib/store'
import { useGoogle } from '../lib/google'
import { useAuto, AUTOMATIONS } from '../lib/automations'
import { Band, Card, Overlap, Segmented, cx } from '../components/ui'
import { fetchAll } from '../lib/api'
import { fa, timeAgo } from '../lib/jalali'
import { L, lbl, tr, useI18n } from '../lib/i18n'
import { ROLE } from '../lib/labels'
import { APP_NAME } from '../lib/brand'

function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx('relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50', on ? 'bg-good' : 'bg-line-strong')}
    >
      <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'start-[1.375rem]' : 'start-0.5')} />
    </button>
  )
}

export default function Settings({ embedded }: { embedded?: boolean }) {
  const { config, setConfig, mode, resetDemo, role, db, access } = useStore()
  const { session } = useGoogle()
  const auto = useAuto()
  const { lang, setLang, cal, setCal } = useI18n()
  const [url, setUrl] = useState(config.apiUrl)
  const [client, setClient] = useState(config.googleClientId || '')
  const [token, setToken] = useState(config.token)
  const [test, setTest] = useState<{ state: 'idle' | 'loading' | 'ok' | 'err'; msg?: string }>({ state: 'idle' })
  const admin = access === 'super'

  const runTest = async () => {
    setTest({ state: 'loading' })
    try {
      const r = await fetchAll({ apiUrl: url.trim(), token: token.trim() })
      const n = Object.values(r.data).reduce((s, rows) => s + (rows as unknown[]).length, 0)
      setTest({ state: 'ok', msg: L(`اتصال موفق — ${fa(n)} ردیف · ${r.user.name} (${lbl(ROLE, r.user.role)})`, `Connected — ${n} rows · ${r.user.name} (${lbl(ROLE, r.user.role)})`) })
    } catch (e) {
      setTest({ state: 'err', msg: e instanceof Error ? e.message : String(e) })
    }
  }
  const code = (s: string) => (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.75rem]" dir="ltr">
      {s}
    </code>
  )

  return (
    <>
      {!embedded && <Band title={L('تنظیمات', 'Settings')} sub={L(`اتصال ${APP_NAME()} به گوگل، اتوماسیون‌ها و نمایش.`, `${APP_NAME()}’s Google connection, automations and display.`)} />}
      <Wrap embedded={embedded}>
        <Card
          eyebrow={<span className="flex items-center gap-1.5"><Zap size={12} /> {L('اتوماسیون', 'Automations')}</span>}
          title={L('کارهایی که خودکار انجام می‌شوند', 'Work that happens on its own')}
          className="@xl:row-span-2"
        >
          <ul className="divide-y divide-line">
            {AUTOMATIONS.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-ink">
                  <a.icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{tr(a.title)}</div>
                  <div className="mt-0.5 text-xs leading-5 text-sub">{tr(a.desc)}</div>
                  <span className="mt-1 inline-flex items-center gap-1 text-[0.625rem] text-sub">
                    {a.where === 'server' ? <Server size={10} /> : <MonitorSmartphone size={10} />}
                    {a.where === 'server' ? L('روی سرور (Apps Script)', 'On the server (Apps Script)') : L('داخل اپ', 'In the app')}
                  </span>
                </div>
                <Switch on={auto.on(a.id)} onChange={(v) => auto.setOn(a.id, v)} disabled={!admin} />
              </li>
            ))}
          </ul>
          {!admin && <p className="mt-2 text-[0.6875rem] text-sub">{L('فقط ادمین می‌تواند اتوماسیون‌ها را روشن یا خاموش کند.', 'Only an admin can switch automations.')}</p>}
          {auto.log.length > 0 && (
            <div className="mt-4 rounded-2xl bg-muted/60 p-3">
              <div className="eyebrow mb-2">{L('آخرین اجراها', 'Recent runs')}</div>
              <ul className="space-y-1 text-xs">
                {auto.log.slice(0, 6).map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{l.text}</span>
                    <span className="shrink-0 text-sub">{timeAgo(l.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card eyebrow="Google" title={L('ورود با گوگل و تقویم', 'Google sign-in & calendar')}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/70 p-4 text-xs leading-6 text-sub">
              {L('وضعیت', 'Status')}:{' '}
              <b className="text-ink">
                {mode === 'demo'
                  ? L('حالت نمایشی (تقویم نمونه)', 'Demo (sample calendar)')
                  : session
                    ? L(`وارد شده با ${session.email} · تقویم ${auto.calStatus === 'live' ? 'متصل' : 'در دسترس نیست'}`, `Signed in as ${session.email} · calendar ${auto.calStatus === 'live' ? 'connected' : 'unavailable'}`)
                    : L(`ورود با کلید · ${lbl(ROLE, role)}`, `Key sign-in · ${lbl(ROLE, role)}`)}
              </b>
              <br />
              {L(`پروژه‌ها ${fa(db.Projects.length)} · تسک‌ها ${fa(db.Tasks.length)} · جلسات ${fa(db.Meetings.length)} · فایل‌ها ${fa(db.Files.length)}`, `Projects ${db.Projects.length} · Tasks ${db.Tasks.length} · Meetings ${db.Meetings.length} · Files ${db.Files.length}`)}
            </div>
            <div>
              <label className="label">{L('آدرس Web App (از Apps Script → Deploy)', 'Web App URL (Apps Script → Deploy)')}</label>
              <input className="input font-mono text-xs" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
            </div>
            <div>
              <label className="label">Google OAuth Client ID</label>
              <input className="input font-mono text-xs" dir="ltr" value={client} onChange={(e) => setClient(e.target.value)} placeholder="1234-abc.apps.googleusercontent.com" />
              <p className="mt-1 text-[0.6875rem] leading-5 text-sub">{L('از Google Cloud → APIs & Services → Credentials (نوع Web application). آدرس سایت را در Authorized JavaScript origins بگذارید و Calendar API را فعال کنید.', 'From Google Cloud → APIs & Services → Credentials (Web application). Add the site URL to Authorized JavaScript origins and enable the Calendar API.')}</p>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-sub">{L('ورود با کلید (بدون گوگل)', 'Key sign-in (without Google)')}</summary>
              <input className="input mt-2 font-mono text-xs" dir="ltr" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="••••••••••••" />
            </details>
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline" onClick={runTest} disabled={!url || !token || test.state === 'loading'} title={L('تست با کلید', 'Tests with the key')}>
                {test.state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} {L('تست', 'Test')}
              </button>
              <button className="btn-primary" disabled={!url} onClick={() => setConfig({ apiUrl: url.trim(), token: token.trim(), googleClientId: client.trim() })}>
                {L('ذخیره و اتصال', 'Save & connect')}
              </button>
              {mode === 'live' && (
                <button className="btn-ghost" onClick={() => setConfig({ apiUrl: '', token: '', googleClientId: client.trim() })}>
                  <Unplug size={16} /> {L('قطع اتصال', 'Disconnect')}
                </button>
              )}
            </div>
            {test.state === 'ok' && (
              <div className="flex items-center gap-2 rounded-2xl bg-good/10 px-4 py-3 text-sm text-good">
                <CheckCircle2 size={16} /> {test.msg}
              </div>
            )}
            {test.state === 'err' && (
              <div className="flex items-center gap-2 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">
                <XCircle size={16} /> {test.msg}
              </div>
            )}
            <ol className="space-y-2 border-t border-line pt-4 text-xs leading-6 text-sub">
              <li>۱. {L('Google Sheet خالی → Extensions → Apps Script → ', 'Empty Google Sheet → Extensions → Apps Script → paste ')}{code('Code.gs')}</li>
              <li>۲. {L('اجرای ', 'Run ')}{code('setup')}{L(' و سپس ', ' then ')}{code('installAutomations')}</li>
              <li>۳. {L('در Project Settings → Script properties مقدار ', 'In Project Settings → Script properties set ')}{code('GOOGLE_CLIENT_ID')}</li>
              <li>۴. {L('Deploy → Web app (Execute as: Me، Anyone) و آدرس را این‌جا بگذارید', 'Deploy → Web app (Execute as: Me, Anyone) and paste the URL here')}</li>
              <li>۵. {L('ایمیل هر نفر را در تب Users با نقش admin / editor / viewer بگذارید', 'Add each person’s email to the Users tab with admin / editor / viewer')}</li>
            </ol>
          </div>
        </Card>

        <Card eyebrow={L('نمایش', 'Display')} title={L('زبان و تقویم', 'Language & calendar')}>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{L('زبان', 'Language')}</div>
              <Segmented value={lang} onChange={setLang} options={[{ value: 'fa', label: 'فارسی' }, { value: 'en', label: 'English' }]} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{L('تقویم', 'Calendar')}</div>
              <Segmented value={cal} onChange={setCal} options={[{ value: 'jalali', label: L('شمسی', 'Jalali') }, { value: 'gregorian', label: L('میلادی', 'Gregorian') }]} />
            </div>
            {mode === 'demo' && (
              <div className="border-t border-line pt-4">
                <p className="text-xs text-sub">{L('تغییرات حالت نمایشی فقط در همین مرورگر ذخیره می‌شود. برای دیدن دسترسی‌ها، از منوی پایین سایدبار «مشاهده به‌عنوان» را عوض کنید.', 'Demo changes stay in this browser. To see permissions, switch “View as” from the menu at the bottom of the sidebar.')}</p>
                <button className="btn-outline btn-sm mt-3" onClick={resetDemo}>
                  <RotateCcw size={14} /> {L('بازنشانی داده‌های نمونه', 'Reset sample data')}
                </button>
              </div>
            )}
          </div>
        </Card>
      </Wrap>
    </>
  )
}

function Wrap({ embedded, children }: { embedded?: boolean; children: React.ReactNode }) {
  const cls = 'grid items-start gap-4 @xl:grid-cols-[3fr_2fr]'
  return embedded ? <div className={cls}>{children}</div> : <Overlap className={cls}>{children}</Overlap>
}

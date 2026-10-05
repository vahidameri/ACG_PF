import { useState } from 'react'
import { CheckCircle2, Link2, Loader2, RotateCcw, Unplug, XCircle } from 'lucide-react'
import { useStore } from '../lib/store'
import { Band, Card, Overlap, Segmented } from '../components/ui'
import { fetchAll } from '../lib/api'
import { fa } from '../lib/jalali'
import { L, lbl, useI18n } from '../lib/i18n'
import { ROLE } from '../lib/labels'

export default function Settings() {
  const { config, setConfig, mode, me, setMe, resetDemo, role, db } = useStore()
  const { lang, setLang, cal, setCal } = useI18n()
  const [url, setUrl] = useState(config.apiUrl)
  const [token, setToken] = useState(config.token)
  const [name, setName] = useState(me)
  const [test, setTest] = useState<{ state: 'idle' | 'loading' | 'ok' | 'err'; msg?: string }>({ state: 'idle' })

  const runTest = async () => {
    setTest({ state: 'loading' })
    try {
      const r = await fetchAll({ apiUrl: url.trim(), token: token.trim() })
      const n = Object.values(r.data).reduce((s, rows) => s + (rows as unknown[]).length, 0)
      setTest({ state: 'ok', msg: L(`اتصال موفق — ${fa(n)} ردیف · کاربر: ${r.user.name} (${lbl(ROLE, r.user.role)})`, `Connected — ${n} rows · user: ${r.user.name} (${lbl(ROLE, r.user.role)})`) })
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
      <Band eyebrow={<span>{L('سیستم', 'System')}</span>} title={L('تنظیمات و اتصال', 'Settings & connection')} sub={L('زبان، تقویم، پروفایل و اتصال به Google Sheets.', 'Language, calendar, profile and the Google Sheets connection.')} />
      <Overlap className="grid gap-4 @xl:grid-cols-2">
        <Card eyebrow={L('نمایش', 'Display')} title={L('زبان و تقویم', 'Language & calendar')}>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{L('زبان رابط', 'Interface language')}</div>
                <div className="text-xs text-sub">{L('جهت صفحه (راست‌چین/چپ‌چین) خودکار تنظیم می‌شود.', 'Layout direction switches automatically.')}</div>
              </div>
              <Segmented value={lang} onChange={setLang} options={[{ value: 'fa', label: 'فارسی' }, { value: 'en', label: 'English' }]} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{L('تقویم', 'Calendar')}</div>
                <div className="text-xs text-sub">{L('داده‌ها همیشه میلادی ذخیره می‌شوند.', 'Data is always stored as ISO dates.')}</div>
              </div>
              <Segmented value={cal} onChange={setCal} options={[{ value: 'jalali', label: L('شمسی', 'Jalali') }, { value: 'gregorian', label: L('میلادی', 'Gregorian') }]} />
            </div>
          </div>
        </Card>

        <Card eyebrow={L('پروفایل', 'Profile')} title={L('من کی هستم؟', 'Who am I?')}>
          <label className="label">{L('نام من (برای «میز کار من» و تسک‌های من)', 'My name (for “My desk” and my tasks)')}</label>
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} list="team-names" />
            <button className="btn-primary h-11" onClick={() => setMe(name.trim())}>
              {L('ذخیره', 'Save')}
            </button>
          </div>
          <datalist id="team-names">
            {db.Team.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
          <p className="mt-2 text-[0.6875rem] text-sub">{L('باید با نام شما در ستون assignee تسک‌ها یکی باشد.', 'Must match your name in the tasks’ assignee column.')}</p>
          {mode === 'demo' && (
            <div className="mt-6 border-t border-line pt-4">
              <div className="text-sm font-medium">{L('داده‌های نمونه', 'Sample data')}</div>
              <p className="mt-1 text-xs text-sub">{L('تغییرات حالت نمایشی فقط در همین مرورگر ذخیره می‌شود.', 'Demo changes are kept in this browser only.')}</p>
              <button className="btn-outline btn-sm mt-3" onClick={resetDemo}>
                <RotateCcw size={14} /> {L('بازنشانی داده‌های نمونه', 'Reset sample data')}
              </button>
            </div>
          )}
        </Card>

        <Card eyebrow="Google Sheets" title={L('اتصال به دیتابیس', 'Database connection')} className="@xl:col-span-2">
          <div className="grid gap-6 @lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="label">{L('آدرس Web App (از Apps Script → Deploy)', 'Web App URL (Apps Script → Deploy)')}</label>
                <input className="input font-mono text-xs" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
              </div>
              <div>
                <label className="label">{L('کلید دسترسی', 'Access key')}</label>
                <input className="input font-mono text-xs" dir="ltr" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="••••••••••••" />
                <p className="mt-1 text-[0.6875rem] text-sub">{L('هر نفر کلید شخصی دارد؛ نقش (مدیر / ویرایشگر / فقط مشاهده) روی سرور تعیین می‌شود.', 'Everyone has a personal key; their role (admin / editor / viewer) is enforced server-side.')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-outline" onClick={runTest} disabled={!url || test.state === 'loading'}>
                  {test.state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} {L('تست اتصال', 'Test')}
                </button>
                <button className="btn-primary" disabled={!url} onClick={() => setConfig({ apiUrl: url.trim(), token: token.trim() })}>
                  {L('ذخیره و اتصال', 'Save & connect')}
                </button>
                {mode === 'live' && (
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setConfig({ apiUrl: '', token: '' })
                      setUrl('')
                      setToken('')
                    }}
                  >
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
              <div className="rounded-2xl bg-muted/70 p-4 text-xs leading-6 text-sub">
                {L('وضعیت', 'Status')}: <b className="text-ink">{mode === 'demo' ? L('حالت نمایشی', 'Demo mode') : `${L('متصل', 'Connected')} · ${lbl(ROLE, role)}`}</b>
                <br />
                {L(`پروژه‌ها ${fa(db.Projects.length)} · تسک‌ها ${fa(db.Tasks.length)} · فالوآپ‌ها ${fa(db.FollowUps.length)} · یادداشت‌ها ${fa(db.Comments.length)}`, `Projects ${db.Projects.length} · Tasks ${db.Tasks.length} · Follow-ups ${db.FollowUps.length} · Comments ${db.Comments.length}`)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-3">{L('راه‌اندازی در ۵ دقیقه', 'Set up in 5 minutes')}</div>
              <ol className="space-y-3 text-sm leading-7">
                {[
                  L('یک Google Sheet خالی بسازید.', 'Create an empty Google Sheet.'),
                  <>{L('از Extensions → Apps Script، محتوای ', 'In Extensions → Apps Script, paste ')}{code('apps-script/Code.gs')}{L(' را جایگزین و ذخیره کنید.', ' and save.')}</>,
                  <>{L('تابع ', 'Run ')}{code('setup')}{L(' را یک بار اجرا کنید؛ تب‌ها و کلید ادمین ساخته می‌شوند. (اختیاری: ', ' once — it creates every tab and your admin key. (Optional: ')}{code('seedDemo')})</>,
                  L('Deploy → Web app — Execute as: Me، Who has access: Anyone.', 'Deploy → Web app — Execute as: Me, Who has access: Anyone.'),
                  L('آدرس و کلید را اینجا وارد کنید. برای لیدرشیپ از منوی ACG Portfolio داخل شیت کاربر viewer بسازید.', 'Enter the URL and key here. Create viewer keys for leadership from the sheet’s ACG Portfolio menu.'),
                  <>{L('اختیاری: ', 'Optional: ')}{code('installDailyDigest')}{L(' برای ایمیل خلاصه‌ی هر صبح.', ' for a morning email digest.')}</>,
                ].map((x, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[0.6875rem] text-surface">{i + 1}</span>
                    <span>{x}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      </Overlap>
    </>
  )
}

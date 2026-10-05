import { useState } from 'react'
import { CheckCircle2, Link2, Loader2, RotateCcw, Unplug, XCircle } from 'lucide-react'
import { useStore } from '../lib/store'
import { Card, PageHeader } from '../components/ui'
import { fetchAll } from '../lib/api'
import { fa } from '../lib/jalali'

export default function Settings() {
  const { config, setConfig, mode, me, setMe, resetDemo, role, db } = useStore()
  const [url, setUrl] = useState(config.apiUrl)
  const [token, setToken] = useState(config.token)
  const [name, setName] = useState(me)
  const [test, setTest] = useState<{ state: 'idle' | 'loading' | 'ok' | 'err'; msg?: string }>({ state: 'idle' })

  const runTest = async () => {
    setTest({ state: 'loading' })
    try {
      const r = await fetchAll({ apiUrl: url.trim(), token: token.trim() })
      const n = Object.values(r.data).reduce((s, rows) => s + (rows as unknown[]).length, 0)
      setTest({ state: 'ok', msg: `اتصال موفق — ${fa(n)} ردیف خوانده شد · کاربر: ${r.user.name} (${r.user.role})` })
    } catch (e) {
      setTest({ state: 'err', msg: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <>
      <PageHeader title="تنظیمات و اتصال به Google Sheets" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="اتصال به Google Sheet">
          <div className="space-y-4">
            <div>
              <label className="label">آدرس Web App (از Apps Script → Deploy)</label>
              <input className="input text-left" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/XXXX/exec" />
            </div>
            <div>
              <label className="label">کلید دسترسی (Access Key)</label>
              <input className="input text-left" dir="ltr" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="کلیدی که در شیت Users تعریف شده" />
              <p className="mt-1 text-[11px] text-sub">هر نفر کلید شخصی خودش را دارد؛ نقش (مدیر / ویرایشگر / فقط مشاهده) روی سرور تعیین می‌شود.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline" onClick={runTest} disabled={!url || test.state === 'loading'}>
                {test.state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} تست اتصال
              </button>
              <button className="btn-primary" disabled={!url} onClick={() => setConfig({ apiUrl: url.trim(), token: token.trim() })}>
                ذخیره و اتصال
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
                  <Unplug size={16} /> قطع اتصال (بازگشت به حالت نمایشی)
                </button>
              )}
            </div>
            {test.state === 'ok' && (
              <div className="flex items-center gap-2 rounded-xl bg-good/10 px-3 py-2 text-sm text-good">
                <CheckCircle2 size={16} /> {test.msg}
              </div>
            )}
            {test.state === 'err' && (
              <div className="flex items-center gap-2 rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
                <XCircle size={16} /> {test.msg}
              </div>
            )}
            <div className="rounded-xl bg-muted/60 p-3 text-xs text-sub leading-6">
              وضعیت فعلی: <b className="text-ink">{mode === 'demo' ? 'حالت نمایشی (داده‌ها فقط در مرورگر شما ذخیره می‌شود)' : `متصل · نقش شما: ${role}`}</b>
              <br />
              تعداد پروژه‌ها: {fa(db.Projects.length)} · تسک‌ها: {fa(db.Tasks.length)} · فالوآپ‌ها: {fa(db.FollowUps.length)}
            </div>
          </div>
        </Card>

        <Card title="پروفایل من">
          <div className="space-y-4">
            <div>
              <label className="label">نام من (برای «میز کار من» و تسک‌های من)</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} list="team-names" />
              <datalist id="team-names">
                {db.Team.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-sub">باید دقیقاً با نام شما در ستون assignee تسک‌ها یکی باشد.</p>
            </div>
            <button className="btn-primary" onClick={() => setMe(name.trim())}>
              ذخیره
            </button>
          </div>
          {mode === 'demo' && (
            <div className="mt-6 border-t border-line pt-4">
              <div className="text-sm font-semibold">داده‌های نمونه</div>
              <p className="mt-1 text-xs text-sub">تغییراتی که در حالت نمایشی می‌دهید در مرورگر ذخیره می‌شود. برای شروع دوباره:</p>
              <button className="btn-outline mt-3" onClick={resetDemo}>
                <RotateCcw size={16} /> بازنشانی داده‌های نمونه
              </button>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-2" title="راه‌اندازی در ۵ دقیقه">
          <ol className="list-decimal space-y-3 pr-5 text-sm leading-7">
            <li>
              یک Google Sheet خالی بسازید (مثلاً «ACG Portfolio DB»).
            </li>
            <li>
              از منوی <b>Extensions → Apps Script</b>، محتوای فایل <code className="rounded bg-muted px-1.5" dir="ltr">apps-script/Code.gs</code> را در ریپازیتوری کپی و جایگزین کنید و ذخیره کنید.
            </li>
            <li>
              تابع <code className="rounded bg-muted px-1.5" dir="ltr">setup</code> را یک بار اجرا کنید (Run). همه‌ی تب‌ها با ستون‌های درست ساخته می‌شوند و یک کلید ادمین در تب <b>Users</b> ایجاد می‌شود. اگر می‌خواهید با داده‌ی نمونه شروع کنید <code className="rounded bg-muted px-1.5" dir="ltr">seedDemo</code> را هم اجرا کنید.
            </li>
            <li>
              <b>Deploy → New deployment → Web app</b> — گزینه‌ی Execute as: <b>Me</b> و Who has access: <b>Anyone</b>. (امنیت با کلید دسترسی هر کاربر تأمین می‌شود.)
            </li>
            <li>آدرس Web App و کلید را در فرم بالا وارد کنید. برای هر عضو لیدرشیپ یک ردیف در تب Users با نقش viewer بسازید.</li>
            <li>
              اختیاری: تابع <code className="rounded bg-muted px-1.5" dir="ltr">installDailyDigest</code> را اجرا کنید تا هر صبح ایمیل خلاصه‌ی تسک‌ها و فالوآپ‌های سررسیدشده برایتان ارسال شود.
            </li>
          </ol>
        </Card>
      </div>
    </>
  )
}

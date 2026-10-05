import { Printer, Copy } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, HealthBadge, HealthDot, Progress, cx, healthText } from '../components/ui'
import { portfolioSummary, riskScore } from '../lib/metrics'
import { fa, fmtDate, todayISO, relDays } from '../lib/jalali'
import { HEALTH, RISK_TYPE } from '../lib/labels'
import { money, useProjectName } from '../components/shared'

export default function Report() {
  const { db, toast } = useStore()
  const pname = useProjectName()
  const s = portfolioSummary(db)
  const today = todayISO()
  const rows = [...s.live].sort((a, b) => s.metrics.get(a.id)!.score - s.metrics.get(b.id)!.score)
  const lastUpdate = (pid: string) => db.Updates.filter((u) => u.project_id === pid).sort((a, b) => (a.week_date < b.week_date ? 1 : -1))[0]
  const topRisks = db.Risks.filter((r) => r.status !== 'closed' && r.type !== 'decision').sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 6)
  const decisions = db.Risks.filter((r) => r.type === 'decision' && r.status !== 'closed')

  const copyText = () => {
    const lines = [
      `گزارش وضعیت پورتفولیو — ${fmtDate(today, 'long')}`,
      `پروژه‌های جاری: ${fa(s.live.length)} | سالم: ${fa(s.counts.green)} | نیازمند توجه: ${fa(s.counts.amber)} | در خطر: ${fa(s.counts.red)}`,
      `میانگین پیشرفت: ${fa(s.avgProgress)}٪ | مصرف بودجه: ${fa(s.budget ? Math.round((s.spent / s.budget) * 100) : 0)}٪`,
      '',
      ...rows.map((p) => {
        const m = s.metrics.get(p.id)!
        const icon = m.health === 'red' ? '🔴' : m.health === 'amber' ? '🟡' : '🟢'
        return `${icon} ${p.name} — ${fa(m.progress)}٪ — ${m.reasons[0].text}`
      }),
      '',
      decisions.length ? 'تصمیم‌های مورد نیاز:' : '',
      ...decisions.map((d) => `• ${d.title} (${pname(d.project_id)})`),
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '')
    navigator.clipboard?.writeText(lines.join('\n')).then(() => toast('خلاصه‌ی متنی کپی شد'))
  }

  return (
    <>
      <PageHeader
        title="گزارش مدیریتی پورتفولیو"
        sub="نسخه‌ی قابل چاپ / PDF برای جلسات هیئت‌مدیره و کمیته‌ی راهبری"
        actions={
          <>
            <button className="btn-outline" onClick={copyText}>
              <Copy size={16} /> کپی خلاصه‌ی متنی
            </button>
            <button className="btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> چاپ / ذخیره PDF
            </button>
          </>
        }
      />

      <div className="card mx-auto max-w-5xl p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-line pb-5">
          <div>
            <div className="text-xs text-sub">ACG · دفتر مدیریت برنامه</div>
            <h2 className="mt-1 text-2xl font-bold">گزارش وضعیت پورتفولیو پروژه‌ها</h2>
          </div>
          <div className="text-left text-sm text-sub">{fmtDate(today, 'long')}</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ['پروژه‌های جاری', fa(s.live.length), ''],
            ['سالم', fa(s.counts.green), 'text-good'],
            ['نیازمند توجه', fa(s.counts.amber), 'text-warn'],
            ['در خطر', fa(s.counts.red), 'text-bad'],
            ['میانگین پیشرفت', `${fa(s.avgProgress)}٪`, ''],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-muted/60 p-3 text-center">
              <div className={cx('text-2xl font-black num', c)}>{v}</div>
              <div className="text-xs text-sub">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-sm text-sub">
          بودجه‌ی کل پروژه‌های جاری: <b className="text-ink">{money(s.budget)} ریال</b> · هزینه‌شده: <b className="text-ink">{money(s.spent)} ریال</b> ({fa(s.budget ? Math.round((s.spent / s.budget) * 100) : 0)}٪)
        </div>

        <h3 className="mt-8 mb-3 font-bold">وضعیت پروژه‌ها</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-line">
              <th className="th">پروژه</th>
              <th className="th">سلامت</th>
              <th className="th w-40">پیشرفت</th>
              <th className="th">ددلاین</th>
              <th className="th">مهم‌ترین نکته</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => {
              const m = s.metrics.get(p.id)!
              return (
                <tr key={p.id}>
                  <td className="td">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-[11px] text-sub">{p.owner}</div>
                  </td>
                  <td className="td">
                    <HealthBadge h={m.health} />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Progress value={m.progress} h={m.health} marker={m.elapsed} />
                      <span className="text-xs num">{fa(m.progress)}٪</span>
                    </div>
                  </td>
                  <td className="td text-xs num">
                    {fmtDate(p.end_date)}
                    <div className={cx(m.daysLeft < 0 ? 'text-bad' : 'text-sub')}>{relDays(p.end_date)}</div>
                  </td>
                  <td className={cx('td text-xs', healthText[m.health])}>{fa(m.reasons[0].text)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <h3 className="mt-8 mb-3 font-bold">خلاصه‌ی گزارش مدیران پروژه</h3>
        <div className="space-y-3">
          {rows.map((p) => {
            const u = lastUpdate(p.id)
            if (!u) return null
            return (
              <div key={p.id} className="flex gap-3 border-r-4 pr-3" style={{ borderColor: `rgb(var(--${u.health === 'green' ? 'good' : u.health === 'amber' ? 'warn' : 'bad'}))` }}>
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {p.name} <span className="text-xs font-normal text-sub">· {u.author} · {fmtDate(u.week_date)}</span>
                  </div>
                  <div className="text-sm leading-7">{u.summary}</div>
                  {u.blockers && <div className="text-xs text-bad">موانع: {u.blockers.split('\n').join('، ')}</div>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-bold">ریسک‌ها و مسائل کلیدی</h3>
            <ul className="space-y-2">
              {topRisks.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-sm">
                  <span className={cx('mt-0.5 rounded px-1.5 text-[11px] font-bold text-white num', riskScore(r) >= 15 ? 'bg-bad' : riskScore(r) >= 8 ? 'bg-warn' : 'bg-good')}>{fa(riskScore(r))}</span>
                  <div>
                    {r.title} <span className="text-xs text-sub">({RISK_TYPE[r.type]} · {pname(r.project_id)})</span>
                    <div className="text-xs text-sub">اقدام: {r.mitigation}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-bold">تصمیم‌های مورد نیاز از مدیریت</h3>
            {decisions.length ? (
              <ol className="list-decimal space-y-2 pr-5 text-sm">
                {decisions.map((d) => (
                  <li key={d.id}>
                    {d.title} <span className="text-xs text-sub">({pname(d.project_id)} · مهلت {fmtDate(d.due_date)})</span>
                    <div className="text-xs text-sub">{d.mitigation}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-sub">موردی نیست.</div>
            )}
            <h3 className="mt-6 mb-3 font-bold">مایلستون‌های ۳۰ روز آینده</h3>
            <ul className="space-y-1.5 text-sm">
              {s.upcomingMilestones.slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="w-20 text-xs text-sub num">{fmtDate(m.planned_date)}</span>
                  <span>{m.title}</span>
                  <span className="text-xs text-sub">· {pname(m.project_id)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 border-t border-line pt-4 text-[11px] text-sub">
          {(['green', 'amber', 'red'] as const).map((h) => (
            <span key={h} className="flex items-center gap-1.5">
              <HealthDot h={h} /> {HEALTH[h]}
            </span>
          ))}
          <span className="mr-auto">سلامت به‌صورت خودکار از زمان، مایلستون‌ها، ریسک‌ها، بودجه و اسپرینت‌ها محاسبه شده است.</span>
        </div>
      </div>
    </>
  )
}

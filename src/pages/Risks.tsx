import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from '../components/Editor'
import { Card, Empty, FilterSelect, PageHeader, Toolbar, Person, Chip, cx, Stat } from '../components/ui'
import { RiskMatrix, riskTone } from '../components/widgets'
import { riskScore } from '../lib/metrics'
import { RISK_STATUS, RISK_TYPE } from '../lib/labels'
import { fa, todayISO, fmtDate } from '../lib/jalali'
import { useProjectName } from '../components/shared'
import { ShieldAlert, AlertOctagon, Link2, Gavel } from 'lucide-react'

export default function Risks() {
  const { db, canEdit } = useStore()
  const { open } = useEditor()
  const pname = useProjectName()
  const [project, setProject] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('active')
  const today = todayISO()

  const list = db.Risks.filter(
    (r) => (!project || r.project_id === project) && (!type || r.type === type) && (status === 'active' ? r.status !== 'closed' : !status || r.status === status),
  ).sort((a, b) => riskScore(b) - riskScore(a))
  const openAll = db.Risks.filter((r) => r.status !== 'closed')
  const count = (t: string) => openAll.filter((r) => r.type === t).length

  return (
    <>
      <PageHeader
        title="ریسک‌ها، مسائل، وابستگی‌ها و تصمیم‌ها"
        sub="لاگ RAID کل پورتفولیو — امتیاز = احتمال × اثر"
        actions={
          canEdit && (
            <button className="btn-primary" onClick={() => open('Risks', { project_id: project })}>
              <Plus size={16} /> مورد جدید
            </button>
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <Stat label="ریسک‌های باز" value={fa(count('risk'))} sub={`${fa(openAll.filter((r) => r.type === 'risk' && riskScore(r) >= 15).length)} بحرانی`} icon={<ShieldAlert size={18} />} tone="amber" />
        <Stat label="مسائل (Issue)" value={fa(count('issue'))} icon={<AlertOctagon size={18} />} tone="red" />
        <Stat label="وابستگی‌ها" value={fa(count('dependency'))} icon={<Link2 size={18} />} tone="brand" />
        <Stat label="تصمیم‌های معوق" value={fa(count('decision'))} icon={<Gavel size={18} />} tone="brand" />
      </div>
      <Toolbar>
        <FilterSelect value={project} onChange={setProject} placeholder="همه‌ی پروژه‌ها" options={db.Projects.map((p) => ({ value: p.id, label: p.name }))} />
        <FilterSelect value={type} onChange={setType} placeholder="همه‌ی انواع" options={Object.entries(RISK_TYPE).map(([value, label]) => ({ value, label }))} />
        <FilterSelect value={status} onChange={setStatus} placeholder="همه‌ی وضعیت‌ها" options={[{ value: 'active', label: 'فعال (باز + در حال کاهش)' }, ...Object.entries(RISK_STATUS).map(([value, label]) => ({ value, label }))]} />
      </Toolbar>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="ماتریس احتمال × اثر">
          <RiskMatrix risks={list} onPick={(r) => open('Risks', r as never)} />
          <p className="mt-3 text-xs text-sub">اعداد روی ماتریس، شماره‌ی ردیف در جدول کناری است.</p>
        </Card>
        <Card className="xl:col-span-2" pad={false}>
          {list.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-line bg-muted/40">
                  <tr>
                    <th className="th">#</th>
                    <th className="th">امتیاز</th>
                    <th className="th">عنوان و اقدام</th>
                    <th className="th">نوع</th>
                    <th className="th">پروژه</th>
                    <th className="th">مالک</th>
                    <th className="th">مهلت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((r, i) => (
                    <tr key={r.id} onClick={() => open('Risks', r as never)} className="cursor-pointer hover:bg-muted/40">
                      <td className="td text-sub num">{fa(i + 1)}</td>
                      <td className="td">
                        <span className={cx('inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold num', riskTone(r))}>{fa(riskScore(r))}</span>
                      </td>
                      <td className="td max-w-sm">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-sub line-clamp-1">{r.mitigation}</div>
                      </td>
                      <td className="td">
                        <Chip>{RISK_TYPE[r.type]}</Chip>
                        {r.status === 'mitigating' && <Chip className="mr-1 bg-brand/10 text-brand">{RISK_STATUS.mitigating}</Chip>}
                      </td>
                      <td className="td text-xs text-sub">{pname(r.project_id)}</td>
                      <td className="td"><Person name={r.owner} /></td>
                      <td className={cx('td text-xs num', r.status !== 'closed' && r.due_date && r.due_date < today ? 'text-bad font-semibold' : 'text-sub')}>{fmtDate(r.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

import { NavLink } from 'react-router-dom'
import { L } from '../lib/i18n'
import { cx } from './ui'

// Related pages share one sidebar entry and switch with these tabs on the band.
export const HUBS = {
  overview: () => [
    { to: '/', label: L('نمای کلی', 'Overview') },
    { to: '/pulse', label: L('برد وضعیت', 'Status board') },
    { to: '/risks', label: L('ریسک و تصمیم', 'Risks & decisions') },
    { to: '/report', label: L('گزارش مدیریتی', 'Exec report') },
  ],
  work: () => [
    { to: '/tasks', label: L('تسک‌ها', 'Tasks') },
    { to: '/followups', label: L('فالوآپ‌ها', 'Follow-ups') },
    { to: '/sprints', label: L('اسپرینت‌ها', 'Sprints') },
  ],
  plan: () => [
    { to: '/plan', label: L('برنامه‌ی تحویل', 'Delivery plan') },
    { to: '/roadmap', label: L('رودمپ', 'Roadmap') },
    { to: '/teams', label: L('پروداکت و تک', 'Product & Tech') },
  ],
}
export type Hub = keyof typeof HUBS
export const hubOf = (path: string): Hub | undefined => (Object.keys(HUBS) as Hub[]).find((h) => HUBS[h]().some((x) => x.to === path))

export function HubNav({ hub }: { hub: Hub }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 no-print">
      {HUBS[hub]().map((x) => (
        <NavLink key={x.to} to={x.to} end className={({ isActive }) => cx('h-8 rounded-full px-3.5 text-xs font-medium leading-8 transition', isActive ? 'bg-white text-band' : 'text-white/65 hover:text-white')}>
          {x.label}
        </NavLink>
      ))}
    </div>
  )
}

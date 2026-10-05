import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, GanttChartSquare, Zap, ListChecks, BellRing, ShieldAlert, Users, FileText, Settings, Moon, Sun, Search, Plus, RefreshCw, Menu, X, Sparkles, Printer, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { useEditor } from './Editor'
import { cx } from './ui'
import { fa, todayISO } from '../lib/jalali'
import { isTaskOverdue } from '../lib/metrics'
import { CommandPalette } from './CommandPalette'

export function Layout({ children }: { children: ReactNode }) {
  const { db, me, mode, loading, error, refresh, lastSync, toasts, canEdit, role } = useStore()
  const { open } = useEditor()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [nav, setNav] = useState(false)
  const [palette, setPalette] = useState(false)
  const loc = useLocation()
  const navigate = useNavigate()

  useEffect(() => setNav(false), [loc.pathname])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(true)
      } else if (!typing && canEdit && (e.key === 'n' || e.key === 'ن')) {
        e.preventDefault()
        open('Tasks', { assignee: me })
      } else if (!typing && canEdit && (e.key === 'f' || e.key === 'ب')) {
        e.preventDefault()
        open('FollowUps')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [canEdit, me, open])

  const toggleTheme = () => {
    const d = !dark
    setDark(d)
    document.documentElement.classList.toggle('dark', d)
    try {
      localStorage.setItem('acg.theme', d ? 'dark' : 'light')
    } catch {}
  }

  const badges = useMemo(() => {
    const myOverdue = db.Tasks.filter((t) => t.assignee === me && t.status !== 'done' && isTaskOverdue(t)).length
    const fuDue = db.FollowUps.filter((f) => f.status !== 'done' && f.due_date && f.due_date <= todayISO()).length
    return { my: myOverdue + fuDue, fu: fuDue }
  }, [db, me])

  const links = [
    { to: '/', label: 'نمای کلی پورتفولیو', icon: LayoutDashboard },
    { to: '/my', label: 'میز کار من', icon: Sparkles, badge: badges.my },
    { to: '/projects', label: 'پروژه‌ها', icon: Briefcase },
    { to: '/roadmap', label: 'رودمپ', icon: GanttChartSquare },
    { to: '/sprints', label: 'اسپرینت‌ها', icon: Zap },
    { to: '/tasks', label: 'تسک‌ها', icon: ListChecks },
    { to: '/followups', label: 'فالوآپ‌ها', icon: BellRing, badge: badges.fu },
    { to: '/risks', label: 'ریسک‌ها و مسائل', icon: ShieldAlert },
    { to: '/team', label: 'تیم و منابع', icon: Users },
    { to: '/updates', label: 'گزارش‌های هفتگی', icon: FileText },
    { to: '/report', label: 'گزارش مدیریتی', icon: Printer },
  ]

  const syncText = loading ? 'در حال همگام‌سازی…' : error ? 'خطا در اتصال' : lastSync ? `به‌روز شده ${fa(lastSync.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}` : ''

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-l border-line bg-surface">
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-line">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet-500 text-white text-[11px] font-black tracking-tight shadow-sm">ACG</div>
        <div className="leading-tight">
          <div className="text-sm font-bold">پورتفولیو پروژه‌ها</div>
          <div className="text-[11px] text-sub">دفتر مدیریت برنامه</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              cx('flex items-center gap-3 rounded-xl px-3 h-10 text-sm transition', isActive ? 'bg-brand/10 text-brand font-semibold' : 'text-ink/75 hover:bg-muted hover:text-ink')
            }
          >
            <l.icon size={18} strokeWidth={1.8} />
            <span className="flex-1">{l.label}</span>
            {!!l.badge && <span className="rounded-full bg-bad px-1.5 text-[11px] font-semibold text-white num leading-5">{fa(l.badge)}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3 space-y-0.5">
        <NavLink to="/settings" className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 h-10 text-sm', isActive ? 'bg-brand/10 text-brand font-semibold' : 'text-ink/75 hover:bg-muted')}>
          <Settings size={18} strokeWidth={1.8} />
          تنظیمات و اتصال
        </NavLink>
        <div className="px-3 pt-2 text-[11px] text-sub flex items-center gap-1.5">
          <span className={cx('h-1.5 w-1.5 rounded-full', mode === 'demo' ? 'bg-warn' : error ? 'bg-bad' : 'bg-good')} />
          {mode === 'demo' ? 'حالت نمایشی (داده‌ی نمونه)' : `متصل به Google Sheets · ${role === 'viewer' ? 'فقط مشاهده' : role === 'admin' ? 'مدیر' : 'ویرایشگر'}`}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-full">
      <div className="hidden lg:block shrink-0 no-print">{sidebar}</div>
      {nav && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNav(false)} />
          <div className="absolute inset-y-0 right-0 slide-in">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface/80 px-4 backdrop-blur-md sm:px-6 no-print">
          <button className="btn-ghost h-9 w-9 px-0 lg:hidden" onClick={() => setNav(true)}>
            <Menu size={20} />
          </button>
          <button onClick={() => setPalette(true)} className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-xl border border-line bg-muted/60 px-3 text-sm text-sub hover:border-brand/40 transition">
            <Search size={16} />
            <span className="flex-1 truncate text-right">جستجو…<span className="hidden sm:inline"> پروژه‌ها، تسک‌ها، افراد</span></span>
            <kbd className="hidden sm:inline rounded-md border border-line bg-surface px-1.5 text-[10px] font-sans" dir="ltr">
              Ctrl K
            </kbd>
          </button>
          <div className="flex-1" />
          <span className={cx('hidden md:inline text-xs', error ? 'text-bad' : 'text-sub')} title={error}>
            {syncText}
          </span>
          <button className="btn-ghost h-9 w-9 px-0" onClick={() => refresh()} title="همگام‌سازی">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn-ghost h-9 w-9 px-0" onClick={toggleTheme} title="تم">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {canEdit && (
            <div className="relative group">
              <button className="btn-primary" onClick={() => open('Tasks', { assignee: me })}>
                <Plus size={16} />
                <span className="hidden sm:inline">ایجاد</span>
              </button>
              <div className="invisible absolute left-0 top-full pt-1.5 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <div className="w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-pop">
                  {(
                    [
                      ['Tasks', 'تسک جدید', 'N'],
                      ['FollowUps', 'فالوآپ جدید', 'F'],
                      ['Updates', 'گزارش هفتگی'],
                      ['Risks', 'ریسک / مسئله'],
                      ['Milestones', 'مایلستون'],
                      ['Projects', 'پروژه‌ی جدید'],
                    ] as const
                  ).map(([s, l, k]) => (
                    <button key={s} className="flex w-full items-center justify-between rounded-xl px-3 h-9 text-sm hover:bg-muted" onClick={() => open(s, s === 'Tasks' ? { assignee: me } : undefined)}>
                      {l}
                      {k && <kbd className="text-[10px] text-sub">{k}</kbd>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </header>

        {mode === 'demo' && (
          <div className="no-print flex flex-wrap items-center justify-center gap-2 bg-warn/10 px-4 py-2 text-xs text-warn">
            داشبورد در حالت نمایشی با داده‌ی نمونه است. برای اتصال به Google Sheet شرکت به
            <button className="font-semibold underline" onClick={() => navigate('/settings')}>
              تنظیمات
            </button>
            بروید.
          </div>
        )}
        {error && mode === 'live' && (
          <div className="no-print bg-bad/10 px-4 py-2 text-center text-xs text-bad">
            اتصال به Google Sheet برقرار نشد: {error}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 print-full fade-in" key={loc.pathname}>
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />

      <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div key={t.id} className={cx('flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm shadow-pop fade-in', t.kind === 'err' ? 'bg-bad text-white' : 'bg-ink text-bg')}>
            {t.kind === 'err' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MobileClose({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-ghost h-8 w-8 px-0" onClick={onClick}>
      <X size={18} />
    </button>
  )
}

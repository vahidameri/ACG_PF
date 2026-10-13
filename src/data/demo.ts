// Sample data for the demo mode: the real ACG team and project list, with illustrative
// (generic product-lifecycle) milestones, tasks, contracts and risks. Replace with real data
// in the Google Sheet. Dates are relative to today so the demo always looks "live".
import type { DB, Task, Milestone, Sprint, FollowUp, Risk, ScopeItem, Update, Allocation, Comment, Project, Health, Member, Deliverable, Meeting, TimeOff, Track, FileRef, ConfigRow, Contract } from '../lib/types'
import { addDays, daysBetween, todayISO } from '../lib/jalali'
import { locale } from '../lib/i18n'
import { weekStart } from '../lib/weeks'

const x = (fa: string, en: string) => (locale.lang === 'en' ? en : fa)

export const demoMe = () => x('وحید عامری', 'Vahid Ameri')

// ------------------------------------------------------------------ people
const P = {
  vahid: () => x('وحید عامری', 'Vahid Ameri'),
  jalil: () => x('جلیل علیزاده', 'Jalil Alizadeh'),
  keyvan: () => x('وحید کیوانیان', 'Vahid Keyvanian'),
  mehrzad: () => x('مهرزاد گلی', 'Mehrzad Goli'),
  atena: () => x('آتنا دهقان', 'Athena Dehghan'),
  sormeili: () => x('علی سرمیلی', 'Ali Sormeili'),
  salemeh: () => x('علی سالمه', 'Ali Salemeh'),
  mehrsa: () => x('مهرسا دبیر', 'Mehrsa Dabir'),
  babak: () => x('بابک معروفی', 'Babak Maroufi'),
  amin: () => x('امین ظفری', 'Amin Zafari'),
  hanie: () => x('هانیه منصورکیایی', 'Hanie Mansurkiae'),
}

interface Spec {
  id: string
  code: string
  name: string
  pm: () => string
  sponsor: () => string
  status: Project['status']
  priority: Project['priority']
  start: number
  end: number
  progress: number
  mood: Health // scenario used to shape risks, blockers and update history
  category: [string, string]
}

const SPECS: Spec[] = [
  { id: 'p1', code: 'CXO', name: 'CX Orbit', pm: P.atena, sponsor: P.jalil, status: 'active', priority: 'critical', start: -120, end: 70, progress: 56, mood: 'amber', category: ['تجربه‌ی مشتری', 'Customer experience'] },
  { id: 'p2', code: 'IXP', name: 'Insight X Padida', pm: P.sormeili, sponsor: P.jalil, status: 'active', priority: 'high', start: -110, end: 30, progress: 61, mood: 'red', category: ['داده و تحلیل', 'Data & analytics'] },
  { id: 'p3', code: 'RBR', name: 'Roo B Roo', pm: P.salemeh, sponsor: P.mehrzad, status: 'active', priority: 'medium', start: -60, end: 90, progress: 44, mood: 'green', category: ['محصول', 'Product'] },
  { id: 'p4', code: 'KDN', name: 'Kadiner', pm: P.mehrsa, sponsor: P.jalil, status: 'active', priority: 'high', start: -90, end: 45, progress: 58, mood: 'amber', category: ['محصول', 'Product'] },
  { id: 'p5', code: 'HMF', name: 'HamAfza', pm: P.babak, sponsor: P.mehrzad, status: 'planning', priority: 'medium', start: 12, end: 180, progress: 0, mood: 'green', category: ['پلتفرم', 'Platform'] },
  { id: 'p6', code: 'MYC', name: 'Myca', pm: P.amin, sponsor: P.jalil, status: 'active', priority: 'high', start: -35, end: 130, progress: 24, mood: 'green', category: ['محصول', 'Product'] },
  { id: 'p7', code: 'MLK', name: 'malek', pm: P.atena, sponsor: P.mehrzad, status: 'on_hold', priority: 'low', start: -70, end: 100, progress: 18, mood: 'amber', category: ['داخلی', 'Internal'] },
  { id: 'p8', code: 'SMP', name: 'SimiPass', pm: P.sormeili, sponsor: P.jalil, status: 'active', priority: 'critical', start: -150, end: -6, progress: 84, mood: 'red', category: ['هویت و دسترسی', 'Identity & access'] },
  { id: 'p9', code: 'INO', name: 'Ino School', pm: P.mehrsa, sponsor: P.mehrzad, status: 'active', priority: 'medium', start: -50, end: 75, progress: 45, mood: 'green', category: ['آموزش', 'Education'] },
  { id: 'p10', code: 'AISN', name: 'AISN', pm: P.amin, sponsor: P.jalil, status: 'active', priority: 'high', start: -80, end: 60, progress: 49, mood: 'amber', category: ['هوش مصنوعی', 'AI'] },
  { id: 'p11', code: 'CLP', name: 'Clarity Pass', pm: P.babak, sponsor: P.jalil, status: 'completed', priority: 'high', start: -210, end: -25, progress: 100, mood: 'green', category: ['هویت و دسترسی', 'Identity & access'] },
]

const MS_TEMPLATE: [number, string, string, number][] = [
  [0.1, 'نیازسنجی و کشف', 'Discovery', 1],
  [0.28, 'طراحی تجربه و معماری', 'Experience & architecture design', 1],
  [0.55, 'نسخه‌ی MVP', 'MVP release', 2],
  [0.8, 'بتا با کاربران واقعی', 'Beta with real users', 2],
  [1, 'لانچ', 'Launch', 1],
]

export function buildDemo(): DB {
  const t = todayISO()
  const d = (n: number) => addDays(t, n)
  const daysBetweenToday = (iso: string) => daysBetween(t, iso)
  const me = P.vahid()

  const Team: Member[] = [
    { id: 'm1', name: P.vahid(), name_en: '', role: x('مدیر پروگرم', 'Program Manager'), email: 'vahid.ameri@acg.example', team: 'PMO', track: '', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'super', active: 'true' },
    { id: 'm2', name: P.jalil(), name_en: '', role: x('مدیرعامل', 'CEO'), email: 'jalil@acg.example', team: x('مدیریت', 'Leadership'), track: '', capacity: 100, photo: '', tasks_private: '1', phone: '' , access: 'exec', active: 'true' },
    { id: 'm3', name: P.keyvan(), name_en: '', role: x('هد تک', 'Head of Tech'), email: 'keyvanian@acg.example', team: x('تک', 'Tech'), track: 'tech', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'head', active: 'true' },
    { id: 'm4', name: P.mehrzad(), name_en: '', role: x('هد پروداکت', 'Head of Product'), email: 'mehrzad@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'head', active: 'true' },
    { id: 'm5', name: P.atena(), name_en: '', role: x('پروداکت منیجر', 'Product Manager'), email: 'athena@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'member', active: 'true' },
    { id: 'm6', name: P.sormeili(), name_en: '', role: x('پروداکت منیجر', 'Product Manager'), email: 'sormeili@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'member', active: 'true' },
    { id: 'm7', name: P.salemeh(), name_en: '', role: x('پروداکت منیجر', 'Product Manager'), email: 'salemeh@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'member', active: 'true' },
    { id: 'm8', name: P.mehrsa(), name_en: '', role: x('پروداکت منیجر', 'Product Manager'), email: 'mehrsa@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'member', active: 'true' },
    { id: 'm9', name: P.babak(), name_en: '', role: x('پروداکت منیجر', 'Product Manager'), email: 'babak@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'member', active: 'true' },
    { id: 'm10', name: P.amin(), name_en: '', role: x('پروداکت منیجر', 'Product Manager'), email: 'amin@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'member', active: 'true' },
    { id: 'm11', name: P.hanie(), name_en: '', role: x('پروداکت دیزاینر', 'Product Designer'), email: 'hanie@acg.example', team: x('پروداکت', 'Product'), track: 'product', capacity: 100, photo: '', tasks_private: '', phone: '' , access: 'member', active: 'true' },
  ]

  const Projects: Project[] = SPECS.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    description: x('شرح پروژه را در گوگل شیت تکمیل کنید.', 'Add the project description in the Google Sheet.'),
    category: x(...s.category),
    owner: s.pm(),
    sponsor: s.sponsor(),
    status: s.status,
    priority: s.priority,
    phase: s.status === 'planning' ? x('برنامه‌ریزی', 'Planning') : s.status === 'completed' ? x('تحویل‌شده', 'Delivered') : s.progress < 30 ? x('طراحی', 'Design') : s.progress < 75 ? x('توسعه', 'Build') : x('بتا و آماده‌سازی لانچ', 'Beta & launch prep'),
    start_date: d(s.start),
    end_date: d(s.end),
    progress: s.progress,
    health_override: '',
    objective: '',
    paused_at: s.status === 'on_hold' ? d(-21) : '',
    pause_reason: s.status === 'on_hold' ? x('منتظر تصمیم کمیته‌ی فصلی', 'Waiting for the quarterly committee decision') : '',
  }))

  // ---------------------------------------------------------- milestones
  let mid = 0
  const Milestones: Milestone[] = []
  SPECS.forEach((s) => {
    const span = s.end - s.start
    MS_TEMPLATE.forEach(([f, fa, en, w], i) => {
      const planned = Math.round(s.start + span * f)
      const thr = Math.round(f * 100)
      const prevThr = i ? Math.round(MS_TEMPLATE[i - 1][0] * 100) : 0
      let status: Milestone['status'] = 'pending'
      let actual: number | undefined
      if (s.progress >= thr) {
        status = 'done'
        actual = Math.min(-1, planned + (s.mood === 'red' ? 9 : s.mood === 'amber' ? 4 : -1))
      } else if (s.progress >= prevThr) status = s.status === 'active' ? 'in_progress' : 'pending'
      if (s.status === 'on_hold' && status !== 'done' && planned < 0) status = 'missed'
      Milestones.push({ id: `ms${++mid}`, project_id: s.id, title: x(fa, en), planned_date: d(planned), actual_date: actual !== undefined ? d(actual) : '', status, owner: i === 2 || i === 3 ? P.keyvan() : s.pm(), weight: w })
    })
  })

  // ---------------------------------------------------------- sprints
  const Sprints: Sprint[] = []
  let sid = 0
  const liveSpecs = SPECS.filter((s) => s.status === 'active')
  liveSpecs.forEach((s, k) => {
    const n = 4 + k
    Sprints.push(
      { id: `s${++sid}`, project_id: s.id, name: x(`اسپرینت ${n - 2}`, `Sprint ${n - 2}`), start_date: d(-34), end_date: d(-21), goal: x('هسته‌ی جریان اصلی', 'Core flow foundations'), committed_points: 32, completed_points: s.mood === 'red' ? 22 : s.mood === 'amber' ? 27 : 31, status: 'closed' },
      { id: `s${++sid}`, project_id: s.id, name: x(`اسپرینت ${n - 1}`, `Sprint ${n - 1}`), start_date: d(-20), end_date: d(-7), goal: x('تکمیل امکانات MVP', 'MVP feature completion'), committed_points: 34, completed_points: s.mood === 'red' ? 21 : s.mood === 'amber' ? 28 : 33, status: 'closed' },
      { id: `s${++sid}`, project_id: s.id, name: x(`اسپرینت ${n}`, `Sprint ${n}`), start_date: d(-6), end_date: d(7), goal: s.progress > 70 ? x('رفع باگ و آماده‌سازی لانچ', 'Bug fixing & launch readiness') : x('امکانات اصلی نسخه‌ی بعد', 'Next release core features'), committed_points: 0, completed_points: 0, status: 'active' },
    )
  })
  const activeSprint = (pid: string) => Sprints.find((y) => y.project_id === pid && y.status === 'active')?.id || ''

  // ---------------------------------------------------------- tasks
  let tid = 0
  const Tasks: Task[] = []
  const T = (o: Partial<Task> & { project_id: string; title: string; assignee: string; status: Task['status']; due: number | null }): Task => {
    const task: Task = {
      id: `t${++tid}`, project_id: o.project_id, sprint_id: o.sprint_id || '', title: o.title, description: o.description || '', assignee: o.assignee, reporter: me, status: o.status,
      priority: o.priority || 'medium', due_date: o.due === null ? '' : d(o.due), points: o.points || 0, tags: o.tags || '', created_at: d(-24),
      completed_at: o.status === 'done' ? d(Math.min(-1, (o.due ?? -2) - 1)) : '', track: o.track || '', depends_on: '', meeting_id: o.meeting_id || '', private: o.private || '',
    }
    Tasks.push(task)
    return task
  }
  liveSpecs.forEach((s, k) => {
    const sp = activeSprint(s.id)
    const red = s.mood === 'red'
    const amber = s.mood === 'amber'
    const late = s.progress > 75
    const prd = T({ project_id: s.id, title: x('تدوین PRD نسخه‌ی بعد', 'Write the next-release PRD'), assignee: s.pm(), status: late || k % 2 ? 'done' : 'in_progress', due: late ? -9 : 2, priority: 'high', points: 3, tags: 'spec', sprint_id: sp })
    const ux = T({ project_id: s.id, title: x('طراحی UX جریان اصلی', 'UX for the core flow'), assignee: P.hanie(), status: late ? 'done' : amber ? 'review' : k % 3 === 0 ? 'in_progress' : 'done', due: late ? -7 : 4, priority: 'high', points: 5, tags: 'design', sprint_id: sp })
    T({ project_id: s.id, title: x('مصاحبه با کاربران و جمع‌بندی بینش‌ها', 'User interviews & insight synthesis'), assignee: s.pm(), status: k % 2 ? 'todo' : 'done', due: k % 2 ? 9 : -5, tags: 'research' })
    T({ project_id: s.id, title: x('اولویت‌بندی بک‌لاگ با هد پروداکت', 'Backlog prioritisation with Head of Product'), assignee: s.pm(), status: 'todo', due: 3 + (k % 4), tags: 'planning' })
    const arch = T({ project_id: s.id, title: x('طراحی معماری و قرارداد API', 'Architecture & API contract'), assignee: P.keyvan(), status: late || k % 3 !== 0 ? 'done' : 'in_progress', due: late ? -14 : 1, priority: 'high', points: 5, track: 'tech', tags: 'backend', sprint_id: sp })
    const build = T({
      project_id: s.id, title: x('پیاده‌سازی جریان اصلی', 'Build the core flow'), assignee: P.keyvan(), status: red ? 'blocked' : late ? 'done' : 'in_progress', due: red ? -3 : 5, priority: 'critical', points: 8, track: 'tech', tags: 'frontend,backend', sprint_id: sp,
      description: red ? x('منتظر تصمیم درباره‌ی دامنه‌ی نسخه و دسترسی به سرویس‌های بیرونی', 'Waiting on a scope decision and access to external services') : '',
    })
    const qa = T({ project_id: s.id, title: x('تست یکپارچه و QA', 'Integration testing & QA'), assignee: P.keyvan(), status: late ? 'in_progress' : 'todo', due: late ? -2 : 6, priority: 'high', points: 5, track: 'tech', tags: 'qa', sprint_id: sp })
    T({ project_id: s.id, title: x('استقرار و مانیتورینگ', 'Deployment & monitoring'), assignee: P.keyvan(), status: 'todo', due: late ? 1 : 12, points: 3, track: 'tech', tags: 'devops', sprint_id: late ? sp : '' })
    if (red || amber) T({ project_id: s.id, title: x('رفع باگ‌های گزارش‌شده', 'Fix reported bugs'), assignee: P.keyvan(), status: red ? 'in_progress' : 'todo', due: red ? -4 : 3, priority: 'high', points: 5, track: 'tech', tags: 'bug', sprint_id: sp })
    arch.depends_on = prd.id
    build.depends_on = [arch.id, ux.id].join(',')
    qa.depends_on = build.id
  })
  // Program manager's own work
  T({ project_id: '', title: x('آماده‌سازی گزارش کمیته‌ی راهبری', 'Prepare the steering committee report'), assignee: me, status: 'in_progress', due: 0, priority: 'high' })
  T({ project_id: 'p8', title: x('برنامه‌ی بازیابی SimiPass با هد تک', 'SimiPass recovery plan with Head of Tech'), assignee: me, status: 'todo', due: -1, priority: 'critical' })
  T({ project_id: 'p2', title: x('بازتعریف دامنه‌ی فاز ۲ با کارفرمای Insight X Padida', 'Re-scope phase 2 with the Insight X Padida client'), assignee: me, status: 'todo', due: -2, priority: 'critical' })
  T({ project_id: '', title: x('به‌روزرسانی رودمپ فصل', 'Update the quarterly roadmap'), assignee: me, status: 'todo', due: 3 })
  T({ project_id: 'p5', title: x('کیک‌آف HamAfza و تعیین تیم', 'HamAfza kickoff & team setup'), assignee: me, status: 'todo', due: 6, priority: 'high' })
  T({ project_id: '', title: x('جلسه‌ی ۱:۱ با هد پروداکت و هد تک', '1:1 with Head of Product & Head of Tech'), assignee: me, status: 'done', due: -1 })

  // The CEO's own tasks are private: only he (and whoever assigned one) can see them.
  const ceo = P.jalil()
  const CT = (title: string, due: number, status: Task['status'] = 'todo', priority: Task['priority'] = 'high', reporter = ceo) => {
    const k = T({ project_id: '', title, assignee: ceo, status, due, priority })
    k.reporter = reporter
  }
  CT(x('جلسه با سرمایه‌گذار درباره‌ی راند بعدی', 'Investor meeting on the next round'), 2, 'todo', 'critical')
  CT(x('بازبینی ساختار سازمانی سال آینده', 'Review next year’s org structure'), 9)
  CT(x('مذاکره‌ی قرارداد با شریک پدیدا', 'Negotiate the Padida partner contract'), 4, 'in_progress')
  CT(x('تأیید الحاقیه‌ی قرارداد Insight X Padida', 'Approve the Insight X Padida contract amendment'), 1, 'todo', 'critical', me)

  // ---------------------------------------------------------- follow-ups
  let fid = 0
  const F = (project_id: string, subject: string, person: string, channel: FollowUp['channel'], due: number, status: FollowUp['status'], priority: FollowUp['priority'], notes = '', owner = me): FollowUp => ({
    id: `f${++fid}`, project_id, subject, person, channel, due_date: d(due), status, priority, notes, created_at: d(-8), done_at: status === 'done' ? d(-1) : '', owner,
  })
  const FollowUps: FollowUp[] = [
    F('p8', x('تأیید تاریخ جدید لانچ SimiPass', 'Approve the new SimiPass launch date'), P.jalil(), 'meeting', -2, 'open', 'critical', x('در جلسه‌ی هفته‌ی قبل به این هفته موکول شد', 'Deferred to this week in the last meeting')),
    F('p2', x('تأیید دامنه‌ی فاز ۲ Insight X Padida', 'Phase 2 scope sign-off — Insight X Padida'), P.jalil(), 'email', 1, 'waiting', 'critical', x('پیش‌نویس ارسال شد', 'Draft sent')),
    F('p2', x('ظرفیت تیم تک برای اسپرینت بعد', 'Tech capacity for next sprint'), P.keyvan(), 'chat', 0, 'open', 'high'),
    F('p1', x('بازخورد دمو از واحد فروش', 'Sales feedback on the demo'), P.atena(), 'meeting', 3, 'open', 'medium'),
    F('p4', x('مایلستون عقب‌افتاده‌ی Kadiner', 'Kadiner late milestone'), P.mehrsa(), 'call', -1, 'open', 'high'),
    F('p10', x('ارزیابی ریسک داده‌های آموزشی AISN', 'AISN training-data risk review'), P.amin(), 'meeting', 4, 'open', 'high'),
    F('p5', x('اسپانسر و تیم HamAfza', 'HamAfza sponsor & team'), P.mehrzad(), 'meeting', 5, 'open', 'medium'),
    F('p7', x('تصمیم درباره‌ی ادامه‌ی malek', 'Decide whether to resume malek'), P.jalil(), 'meeting', 9, 'open', 'low'),
    F('', x('هماهنگی منابع دیزاین بین پروژه‌ها', 'Design capacity across projects'), P.hanie(), 'chat', 2, 'waiting', 'medium'),
    F('p11', x('جمع‌بندی درس‌آموخته‌های Clarity Pass', 'Clarity Pass retrospective'), P.babak(), 'meeting', -6, 'done', 'low'),
    // the CEO's own follow-ups — private to him, like his tasks
    F('', x('پیگیری پیشنهاد همکاری با شریک خارجی', 'Chase the partnership proposal'), x('شریک خارجی', 'Foreign partner'), 'email', 2, 'waiting', 'high', '', ceo),
    F('p2', x('هماهنگی جلسه با مدیرعامل پدیدا', 'Set up a meeting with Padida’s CEO'), me, 'chat', 1, 'open', 'high', '', ceo),
    // everyone chases their own items
    F('p1', x('دریافت فیدبک طراحی از هانیه', 'Design feedback from Hanie'), P.hanie(), 'chat', 1, 'open', 'medium', '', P.atena()),
    F('p8', x('تاریخ تست پذیرش با کارفرما', 'UAT date with the client'), x('کارفرمای SimiPass', 'SimiPass client'), 'call', 0, 'open', 'high', '', P.sormeili()),
  ]

  // ---------------------------------------------------------- risks & decisions
  let rid = 0
  const R = (project_id: string, title: string, type: Risk['type'], probability: number, impact: number, owner: string, mitigation: string, status: Risk['status'], due: number): Risk => ({ id: `r${++rid}`, project_id, title, type, probability, impact, owner, mitigation, status, due_date: d(due) })
  const Risks: Risk[] = [
    R('p8', x('تأخیر لانچ از ددلاین تعهدشده', 'Launch slipping past the committed deadline'), 'issue', 5, 4, P.sormeili(), x('برنامه‌ی بازیابی و کاهش دامنه‌ی نسخه‌ی اول', 'Recovery plan and a reduced first-release scope'), 'open', 2),
    R('p8', x('اختلاف برداشت از دامنه با کارفرما', 'Scope disagreement with the client'), 'issue', 5, 3, me, x('جلسه‌ی مشترک و ثبت دامنه در الحاقیه', 'Joint session and scope in an amendment'), 'open', 1),
    R('p2', x('وابستگی به داده‌های بیرونی پدیدا', 'Dependency on Padida external data'), 'dependency', 4, 4, P.keyvan(), x('قرارداد دسترسی و داده‌ی آزمایشی', 'Access agreement and test data'), 'open', -1),
    R('p2', x('کمبود ظرفیت تیم تک', 'Tech team capacity shortfall'), 'risk', 4, 4, P.keyvan(), x('اولویت‌بندی مجدد بین پروژه‌ها', 'Re-prioritise across projects'), 'mitigating', 6),
    R('p1', x('یکپارچگی با سیستم‌های موجود مشتری', 'Integration with existing customer systems'), 'risk', 3, 5, P.keyvan(), x('Mock API و تست زودهنگام', 'Mock APIs and early testing'), 'open', 8),
    R('p4', x('تغییر نیازمندی‌ها در میانه‌ی توسعه', 'Requirements changing mid-build'), 'risk', 3, 3, P.mehrsa(), x('فریز اسکوپ نسخه‌ی اول', 'Freeze first-release scope'), 'open', 10),
    R('p10', x('کیفیت و مالکیت داده‌های آموزشی', 'Training data quality & ownership'), 'risk', 3, 5, P.amin(), x('ممیزی داده و قرارداد مالکیت', 'Data audit and ownership agreement'), 'open', 5),
    R('p6', x('پذیرش کاربر در نسخه‌ی اول', 'User adoption of the first release'), 'risk', 2, 3, P.amin(), x('پایلوت با گروه کوچک', 'Pilot with a small group'), 'open', 30),
    R('p8', x('کاهش دامنه‌ی نسخه‌ی اول SimiPass', 'Reduce SimiPass first-release scope'), 'decision', 3, 4, P.jalil(), x('انتخاب بین لانچ با امکانات کمتر یا تعویق دو هفته‌ای', 'Choose: launch with fewer features or slip two weeks'), 'open', 2),
    R('p7', x('ادامه یا توقف malek', 'Resume or stop malek'), 'decision', 2, 2, P.jalil(), x('بررسی در کمیته‌ی فصلی', 'Review at the quarterly committee'), 'open', 9),
  ]

  // ---------------------------------------------------------- scope
  let scid = 0
  const S = (project_id: string, item: string, type: ScopeItem['type'], status: ScopeItem['status'], change_note = '', date = -30): ScopeItem => ({ id: `sc${++scid}`, project_id, item, type, status, change_note, date: d(date) })
  const Scope: ScopeItem[] = []
  SPECS.filter((s) => s.status !== 'planning').forEach((s) => {
    Scope.push(
      S(s.id, x('جریان اصلی کاربر', 'Core user flow'), 'in', s.progress >= 55 ? 'delivered' : 'in_progress'),
      S(s.id, x('پنل مدیریت', 'Admin panel'), 'in', s.progress >= 80 ? 'delivered' : 'planned'),
      S(s.id, x('گزارش‌ها و داشبورد', 'Reports & dashboard'), 'in', 'planned'),
    )
    if (s.mood !== 'green') Scope.push(S(s.id, x('امکان درخواستی جدید', 'Newly requested feature'), 'in', 'changed', x('درخواست اسپانسر — نیازمند تأیید کمیته', 'Sponsor request — needs committee approval'), -12))
    if (s.mood === 'red') Scope.push(S(s.id, x('اپ موبایل', 'Mobile app'), 'out', 'removed', x('به فاز ۲ منتقل شد', 'Moved to phase 2'), -20))
  })

  // ---------------------------------------------------------- allocations (people over 100% surface as a resourcing signal)
  const Allocations: Allocation[] = []
  const A = (member_id: string, project_id: string, percent: number, start_date = '', end_date = '') =>
    Allocations.push({ id: `a${Allocations.length + 1}`, member_id, project_id, percent, start_date, end_date })
  const pmIds: [() => string, string][] = [[P.atena, 'm5'], [P.sormeili, 'm6'], [P.salemeh, 'm7'], [P.mehrsa, 'm8'], [P.babak, 'm9'], [P.amin, 'm10']]
  const hamStart = d(12)
  SPECS.filter((s) => s.status !== 'completed').forEach((s) => {
    const pm = pmIds.find(([f]) => f === s.pm)?.[1]
    // Ali Sormeili carries two critical projects at 60% each until the SimiPass recovery launch
    if (pm) {
      if (s.id === 'p8') A(pm, s.id, 60, '', d(21))
      else if (s.status === 'planning') A(pm, s.id, 20, '', hamStart), A(pm, s.id, 40, addDays(hamStart, 1))
      else A(pm, s.id, s.status === 'on_hold' ? 10 : pm === 'm6' ? 60 : 50)
    }
    if (s.status === 'active') {
      // Vahid Keyvanian is the whole tech team for now: red projects take more of him
      A('m3', s.id, s.mood === 'red' ? 18 : 10, '', s.id === 'p8' ? d(28) : '')
      A('m4', s.id, 10)
    }
  })
  // HamAfza pulls Tech in from kickoff — this is what tips the team over capacity
  A('m3', 'p5', 15, hamStart)
  A('m4', 'p5', 10, hamStart)
  ;['p1', 'p2', 'p4', 'p10'].forEach((pid) => A('m11', pid, 20))
  A('m11', 'p6', 20, '', d(28))
  A('m11', 'p5', 20, d(28))
  A('m1', 'p8', 30)
  A('m1', 'p2', 25)
  A('m1', 'p1', 20)
  A('m1', 'p5', 15)
  A('m2', 'p8', 5)

  const ws = weekStart(t)
  const W = (weeks: number, day = 0) => addDays(ws, weeks * 7 + day)
  const TimeOff: TimeOff[] = [
    { id: 'to1', member_id: 'm11', start_date: W(2), end_date: W(2, 4), kind: 'leave', note: x('مرخصی سالانه', 'Annual leave') },
    { id: 'to2', member_id: 'm3', start_date: W(1, 3), end_date: W(1, 4), kind: 'training', note: x('دوره‌ی معماری ابری', 'Cloud architecture course') },
    { id: 'to3', member_id: 'm10', start_date: W(3), end_date: W(3, 2), kind: 'leave', note: '' },
    { id: 'to4', member_id: 'm7', start_date: W(0, 3), end_date: W(0, 4), kind: 'leave', note: '' },
  ]

  // ---------------------------------------------------------- weekly updates (history drives the trend arrows)
  const Updates: Update[] = []
  let uid = 0
  const lines: Record<Health, string[]> = {
    green: [x('طبق برنامه پیش می‌رویم.', 'On plan.'), x('اسپرینت با تحویل کامل بسته شد.', 'Sprint closed with full delivery.')],
    amber: [x('یک مایلستون عقب افتاده؛ برنامه‌ی جبران در جریان است.', 'One milestone slipped; recovery plan in progress.'), x('ظرفیت تیم محدود است و اولویت‌ها بازبینی شد.', 'Capacity is tight; priorities reviewed.')],
    red: [x('ددلاین در خطر است و به تصمیم مدیریت نیاز داریم.', 'Deadline at risk; leadership decision needed.'), x('کار مسدود داریم و به تصمیم کارفرما نیاز است.', 'Work is blocked and needs a client decision.')],
  }
  // Reports are due Sunday of each week; three projects have not reported yet this week.
  const missingThisWeek = ['RBR', 'KDN', 'AISN']
  liveSpecs.forEach((s) => {
    const hist: Health[] = s.mood === 'red' ? ['amber', 'amber', 'red', 'red'] : s.mood === 'amber' ? ['green', 'green', 'amber', 'amber'] : s.code === 'INO' ? ['green', 'green', 'amber', 'green'] : ['green', 'amber', 'green', 'green']
    hist.forEach((h, i) => {
      const weeksAgo = hist.length - 1 - i
      if (weeksAgo === 0 && missingThisWeek.includes(s.code)) return
      // one report came in a day late last week, so the cycle has a "late" example
      const day = weeksAgo === 1 && s.code === 'IXP' ? 3 : s.code === 'CXO' ? 0 : 1
      const date = W(-weeksAgo, day)
      Updates.push({
        id: `u${++uid}`, project_id: s.id, week_date: date > t ? t : date, author: s.pm(), health: h, summary: lines[h][i % 2],
        done: x('بستن اسپرینت\nبازبینی طراحی', 'Sprint closed\nDesign review'), next: x('تست یکپارچه\nآماده‌سازی دمو', 'Integration testing\nDemo prep'),
        blockers: h === 'green' ? '' : h === 'amber' ? x('ظرفیت تیم تک', 'Tech capacity') : x('تصمیم اسکوپ\nتأیید کارفرما', 'Scope decision\nClient sign-off'),
      })
    })
  })

  // ---------------------------------------------------------- delivery plan
  const Deliverables: Deliverable[] = []
  const DL: [string, string, Track, number][] = [
    ['PRD نسخه‌ی بعد', 'Next-release PRD', 'product', -3],
    ['طراحی UI جریان اصلی', 'Core flow UI design', 'product', -1],
    ['API و سرویس‌های بک‌اند', 'Backend APIs & services', 'tech', 0],
    ['نسخه‌ی بتا روی محیط تست', 'Beta on staging', 'tech', 1],
    ['داشبورد گزارش‌ها', 'Reports dashboard', 'product', 3],
    ['پنل مدیریت', 'Admin panel', 'tech', 5],
    ['ریلیز عمومی', 'Public release', 'tech', 8],
  ]
  let did = 0
  const ownerFor = (s: Spec, tr: Track) => (tr === 'product' ? (did % 3 === 1 ? P.hanie() : s.pm()) : P.keyvan())
  liveSpecs.forEach((s, k) => {
    const shift = (k % 3) - 1 // spread projects across weeks
    DL.forEach(([fa_, en, tr, wk], i) => {
      const baseWeek = wk + shift
      const base = W(baseWeek, 1 + (i % 4))
      if (base > d(s.end + 7)) return
      const red = s.mood === 'red'
      const amber = s.mood === 'amber'
      // red projects slipped their in-flight items by two weeks; amber by one
      // …except one red-project item that simply ran past its date (overdue)
      const stuck = red && i === 1
      const slip = stuck ? 0 : baseWeek >= -1 && baseWeek <= 2 ? (red ? 14 : amber && i % 2 === 0 ? 7 : 0) : 0
      const target = addDays(base, slip)
      let status: Deliverable['status'] = 'planned'
      let delivered = ''
      if (target < t && !stuck) {
        status = 'delivered'
        delivered = addDays(target, red || (amber && i === 1) ? 2 : -1)
      } else if (target < t) status = 'in_progress' // overdue
      else if (baseWeek <= 1) status = red || (amber && i === 3) ? 'at_risk' : 'in_progress'
      did++
      Deliverables.push({
        id: `d${did}`, project_id: s.id, title: x(fa_, en), track: tr, owner: ownerFor(s, tr), target_date: target, baseline_date: base, delivered_date: delivered, status,
        confidence: status === 'delivered' ? 'high' : red ? 'low' : amber ? 'medium' : 'high',
        notes: slip ? x('به‌دلیل وابستگی به تیم تک جابجا شد', 'Moved due to a Tech dependency') : '',
      })
    })
  })
  // HamAfza (planning) and Clarity Pass (done) have a lighter plan
  Deliverables.push(
    { id: `d${++did}`, project_id: 'p5', title: x('کیک‌آف و منشور پروژه', 'Kickoff & project charter'), track: 'product', owner: P.babak(), target_date: W(2, 1), baseline_date: W(2, 1), delivered_date: '', status: 'planned', confidence: 'high', notes: '' },
    { id: `d${++did}`, project_id: 'p5', title: x('PRD نسخه‌ی اول', 'First-release PRD'), track: 'product', owner: P.babak(), target_date: W(5, 2), baseline_date: W(5, 2), delivered_date: '', status: 'planned', confidence: 'medium', notes: '' },
    { id: `d${++did}`, project_id: 'p5', title: x('طراحی معماری', 'Architecture design'), track: 'tech', owner: P.keyvan(), target_date: W(7, 3), baseline_date: W(7, 3), delivered_date: '', status: 'planned', confidence: 'low', notes: x('به ظرفیت تیم تک بستگی دارد', 'Depends on Tech capacity') },
    // SimiPass recovery: the launch moved from the original deadline to a reduced-scope release
    { id: `d${++did}`, project_id: 'p8', title: x('تست پذیرش کاربر', 'User acceptance testing'), track: 'product', owner: P.sormeili(), target_date: W(1, 3), baseline_date: d(-10), delivered_date: '', status: 'at_risk', confidence: 'medium', notes: '' },
    { id: `d${++did}`, project_id: 'p8', title: x('لانچ نسخه‌ی اول با دامنه‌ی کاهش‌یافته', 'Reduced-scope first launch'), track: 'tech', owner: P.keyvan(), target_date: W(3, 1), baseline_date: d(-6), delivered_date: '', status: 'planned', confidence: 'low', notes: x('منوط به تصمیم کاهش دامنه', 'Pending the scope-reduction decision') },
    { id: `d${++did}`, project_id: 'p11', title: x('ریلیز عمومی', 'Public release'), track: 'tech', owner: P.keyvan(), target_date: d(-28), baseline_date: d(-35), delivered_date: d(-26), status: 'delivered', confidence: 'high', notes: '' },
    { id: `d${++did}`, project_id: 'p7', title: x('پایلوت داخلی', 'Internal pilot'), track: 'product', owner: P.atena(), target_date: W(6, 1), baseline_date: W(-2, 1), delivered_date: '', status: 'planned', confidence: 'low', notes: x('تا تصمیم ادامه‌ی پروژه متوقف است', 'Paused until the resume decision') },
  )

  // ---------------------------------------------------------- weekly meetings (each series one row per week)
  const Meetings: Meeting[] = []
  const leaders = [me, P.jalil(), P.keyvan(), P.mehrzad()].join(', ')
  const productPeople = [P.mehrzad(), me, P.atena(), P.sormeili(), P.salemeh(), P.mehrsa(), P.babak(), P.amin(), P.hanie()].join(', ')
  const series: [Meeting['series'], string, string, number, string, () => string, string, string][] = [
    ['portfolio', 'ویکلی پورتفولیو', 'Portfolio weekly', 2, '10:00', P.vahid, leaders, ''],
    ['product', 'ویکلی پروداکت', 'Product weekly', 1, '14:00', P.mehrzad, productPeople, ''],
    ['tech', 'ویکلی تک', 'Tech weekly', 3, '11:00', P.keyvan, [P.keyvan(), me, P.mehrzad()].join(', '), ''],
    ['project', 'ویکلی SimiPass', 'SimiPass weekly', 4, '15:00', P.sormeili, [P.sormeili(), P.keyvan(), me, P.hanie()].join(', '), 'p8'],
  ]
  const pastNotes: Record<string, [string, string]> = {
    portfolio: [
      'وضعیت SimiPass و Insight X Padida بررسی شد. دامنه‌ی هر دو پروژه بزرگ‌تر از تعهد شده و تاریخ لانچ SimiPass قابل نگه‌داشتن نیست.',
      'SimiPass and Insight X Padida reviewed. Both have grown past the committed scope and the SimiPass launch date cannot hold.',
    ],
    product: ['اولویت‌های بک‌لاگ هر پروژه مرور شد و ظرفیت دیزاین بین پروژه‌ها تقسیم شد.', 'Backlog priorities reviewed and design capacity split across projects.'],
    tech: ['ظرفیت تیم تک برای سه هفته‌ی آینده و شروع HamAfza بررسی شد.', 'Tech capacity for the next three weeks and the HamAfza start reviewed.'],
    project: ['برنامه‌ی بازیابی SimiPass و گزینه‌های کاهش دامنه بررسی شد.', 'SimiPass recovery plan and scope-reduction options reviewed.'],
  }
  const pastDecisions: Record<string, [string, string]> = {
    portfolio: ['برنامه‌ی بازیابی SimiPass تا هفته‌ی بعد ارائه شود\nدامنه‌ی فاز ۲ Insight X Padida با کارفرما بازتعریف شود', 'SimiPass recovery plan due next week\nRe-scope Insight X Padida phase 2 with the client'],
    product: ['هانیه روی چهار پروژه می‌ماند؛ Myca از هفته‌ی ۴ آزاد می‌شود', 'Hanie stays on four projects; Myca frees up from week 4'],
    tech: ['شروع فنی HamAfza منوط به آزاد شدن ظرفیت SimiPass است', 'HamAfza tech start depends on SimiPass freeing capacity'],
    project: ['اپ موبایل به فاز ۲ منتقل شد', 'Mobile app moved to phase 2'],
  }
  let mtid = 0
  series.forEach(([se, fa_, en, day, time, fac, att, pid]) => {
    for (let w = -2; w <= 1; w++) {
      const date = W(w, day)
      const held = date < t
      Meetings.push({
        id: `mt${++mtid}`, series: se, title: x(fa_, en), project_id: pid, date, time, facilitator: fac(), attendees: att, status: held ? 'held' : 'scheduled',
        notes: held ? x(...pastNotes[se]) : '', decisions: held && w === -1 ? x(...pastDecisions[se]) : held ? x('ادامه‌ی روال فعلی', 'Continue as planned') : '',
        gcal_id: `g-${se}-${w}`, meet_url: se === 'project' ? '' : `https://meet.google.com/acg-${se.slice(0, 3)}-${w + 3}`, duration: se === 'portfolio' ? 60 : 45,
      })
    }
  })
  const lastPortfolio = Meetings.find((m) => m.series === 'portfolio' && m.date === W(-1, 2))!
  const prevPortfolio = Meetings.find((m) => m.series === 'portfolio' && m.date === W(-2, 2))!
  const lastTech = Meetings.find((m) => m.series === 'tech' && m.date === W(-1, 3))!
  // Action items agreed in meetings are ordinary tasks with a meeting_id
  T({ project_id: 'p8', title: x('ارائه‌ی برنامه‌ی بازیابی SimiPass', 'Present the SimiPass recovery plan'), assignee: P.sormeili(), status: 'in_progress', due: daysBetweenToday(W(0, 2)), priority: 'critical', meeting_id: lastPortfolio.id })
  T({ project_id: 'p2', title: x('یک صفحه خلاصه‌ی تغییر دامنه برای کارفرما', 'One-pager on the scope change for the client'), assignee: me, status: 'done', due: daysBetweenToday(W(0, 0)), priority: 'high', meeting_id: lastPortfolio.id })
  T({ project_id: '', title: x('برآورد ظرفیت تک برای شروع HamAfza', 'Estimate Tech capacity for the HamAfza start'), assignee: P.keyvan(), status: 'todo', due: daysBetweenToday(W(0, 0)), priority: 'high', meeting_id: lastPortfolio.id })
  T({ project_id: 'p4', title: x('علت عقب‌افتادن مایلستون Kadiner', 'Root cause for the Kadiner slip'), assignee: P.mehrsa(), status: 'todo', due: daysBetweenToday(W(0, 4)), meeting_id: lastPortfolio.id })
  T({ project_id: 'p10', title: x('مالک داده‌های آموزشی AISN مشخص شود', 'Name an owner for AISN training data'), assignee: P.amin(), status: 'done', due: daysBetweenToday(W(-1, 4)), meeting_id: prevPortfolio.id })
  T({ project_id: '', title: x('جابجایی دو مهندس از Roo B Roo به SimiPass', 'Move two engineers from Roo B Roo to SimiPass'), assignee: P.keyvan(), status: 'done', due: daysBetweenToday(W(-1, 0)), meeting_id: lastTech.id, track: 'tech' })

  // ---------------------------------------------------------- comments
  const at = (days: number, hm: string) => `${d(days)} ${hm}`
  const blockedSimi = Tasks.find((k) => k.project_id === 'p8' && k.status === 'blocked')
  const Comments: Comment[] = [
    ...(blockedSimi
      ? [
          { id: 'c1', entity: 'Tasks' as const, entity_id: blockedSimi.id, author: P.keyvan(), body: x('تا تصمیم درباره‌ی دامنه‌ی نسخه، تیم روی این کار متوقف است.', 'The team is paused on this until the scope decision is made.'), created_at: at(-1, '10:20') },
          { id: 'c2', entity: 'Tasks' as const, entity_id: blockedSimi.id, author: me, body: x(`@${P.jalil()} این مورد در دستور جلسه‌ی فردا است.`, `@${P.jalil()} this is on tomorrow's agenda.`), created_at: at(0, '09:05') },
        ]
      : []),
    { id: 'c3', entity: 'Projects', entity_id: 'p8', author: P.jalil(), body: x('قبل از تعویق، گزینه‌ی کاهش دامنه را ببینیم.', 'Before slipping the date, let’s look at reducing scope.'), created_at: at(-1, '17:40') },
    { id: 'c4', entity: 'Projects', entity_id: 'p2', author: P.mehrzad(), body: x(`@${me} برای تغییر دامنه یک صفحه‌ی خلاصه برای کارفرما آماده کنیم.`, `@${me} let’s prepare a one-pager on the scope change for the client.`), created_at: at(-2, '12:10') },
    { id: 'c5', entity: 'FollowUps', entity_id: 'f2', author: me, body: x('پیش‌نویس درخواست ارسال شد.', 'Request draft sent.'), created_at: at(-1, '11:00') },
  ]

  const Files: FileRef[] = [
    { id: 'fl1', entity: 'Meetings', entity_id: lastPortfolio.id, name: x('ارائه-وضعیت-پورتفولیو.pdf', 'portfolio-status.pdf'), mime: 'application/pdf', size: 1_420_000, url: '', uploaded_by: me, created_at: W(-1, 2) },
    { id: 'fl3', entity: 'Contracts', entity_id: 'k4', name: x('قرارداد-SimiPass-امضاشده.pdf', 'SimiPass-signed.pdf'), mime: 'application/pdf', size: 2_100_000, url: '', uploaded_by: me, created_at: d(-150) },
    { id: 'fl2', entity: 'Projects', entity_id: 'p8', name: x('برنامه-بازیابی-SimiPass.xlsx', 'SimiPass-recovery-plan.xlsx'), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 86_000, url: '', uploaded_by: P.sormeili(), created_at: d(-2) },
  ]
  const Config: ConfigRow[] = []
  // Contracts — visible only to the CEO and the program manager
  const K = (id: string, project_id: string, title: [string, string], kind: Contract['kind'], status: Contract['status'], start: number, end: number, value: [string, string], notes: [string, string] = ['', '']): Contract => ({
    id, project_id, title: x(...title), counterparty: x('کارفرمای ' + (SPECS.find((p) => p.id === project_id)?.name || ''), (SPECS.find((p) => p.id === project_id)?.name || '') + ' client'),
    number: `ACG-${project_id.toUpperCase()}-${id.slice(1)}`, kind, status, start_date: d(start), end_date: d(end), value: x(...value), notes: x(...notes),
  })
  const Contracts: Contract[] = [
    K('k1', 'p1', ['قرارداد مشاوره و پیاده‌سازی CX Orbit', 'CX Orbit consulting & delivery'], 'client', 'active', -125, 75, ['ماهانه + پاداش تحویل', 'Monthly + delivery bonus']),
    K('k2', 'p2', ['قرارداد Insight X Padida — فاز ۱', 'Insight X Padida — phase 1'], 'client', 'active', -115, 30, ['ثابت', 'Fixed fee'], ['الحاقیه‌ی فاز ۲ در حال مذاکره', 'Phase 2 amendment under negotiation']),
    K('k3', 'p2', ['الحاقیه‌ی فاز ۲ Insight X Padida', 'Insight X Padida phase 2 amendment'], 'client', 'negotiation', 30, 150, ['در حال مذاکره', 'Under negotiation']),
    K('k4', 'p8', ['قرارداد SimiPass', 'SimiPass agreement'], 'client', 'active', -155, -6, ['ثابت + جریمه‌ی تأخیر', 'Fixed + delay penalty'], ['بند جریمه‌ی تأخیر از ددلاین فعال است', 'Delay-penalty clause active since the deadline']),
    K('k5', 'p4', ['قرارداد Kadiner', 'Kadiner agreement'], 'client', 'signed', -95, 50, ['ماهانه', 'Monthly']),
    K('k6', 'p10', ['توافق‌نامه‌ی محرمانگی داده‌ی AISN', 'AISN data NDA'], 'nda', 'signed', -80, 285, ['—', '—']),
    K('k7', 'p5', ['قرارداد HamAfza', 'HamAfza agreement'], 'client', 'draft', 12, 185, ['پیش‌نویس', 'Draft']),
  ]
  return { Projects, Scope, Milestones, Sprints, Tasks, FollowUps, Risks, Team, Allocations, Updates, Comments, Deliverables, Meetings, TimeOff, Files, Config, Contracts }
}

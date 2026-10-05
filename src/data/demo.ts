// Sample data for the demo mode: the real ACG team and project list, with illustrative
// (generic product-lifecycle) milestones, tasks, budgets and risks. Replace with real data
// in the Google Sheet. Dates are relative to today so the demo always looks "live".
import type { DB, Task, Milestone, Sprint, FollowUp, Risk, ScopeItem, Update, Allocation, Comment, Project, Health, Member } from '../lib/types'
import { addDays, todayISO } from '../lib/jalali'
import { locale } from '../lib/i18n'

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
  tech: () => x('تیم تک', 'Tech team'),
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
  budget: number
  spent: number
  mood: Health // scenario used to shape risks, blockers and update history
  category: [string, string]
}

const SPECS: Spec[] = [
  { id: 'p1', code: 'CXO', name: 'CX Orbit', pm: P.atena, sponsor: P.jalil, status: 'active', priority: 'critical', start: -120, end: 70, progress: 56, budget: 9_500_000_000, spent: 5_400_000_000, mood: 'amber', category: ['تجربه‌ی مشتری', 'Customer experience'] },
  { id: 'p2', code: 'IXP', name: 'Insight X Padida', pm: P.sormeili, sponsor: P.jalil, status: 'active', priority: 'high', start: -110, end: 30, progress: 61, budget: 7_000_000_000, spent: 7_350_000_000, mood: 'red', category: ['داده و تحلیل', 'Data & analytics'] },
  { id: 'p3', code: 'RBR', name: 'Roo B Roo', pm: P.salemeh, sponsor: P.mehrzad, status: 'active', priority: 'medium', start: -60, end: 90, progress: 44, budget: 3_800_000_000, spent: 1_500_000_000, mood: 'green', category: ['محصول', 'Product'] },
  { id: 'p4', code: 'KDN', name: 'Kadiner', pm: P.mehrsa, sponsor: P.jalil, status: 'active', priority: 'high', start: -90, end: 45, progress: 58, budget: 5_200_000_000, spent: 3_700_000_000, mood: 'amber', category: ['محصول', 'Product'] },
  { id: 'p5', code: 'HMF', name: 'HamAfza', pm: P.babak, sponsor: P.mehrzad, status: 'planning', priority: 'medium', start: 12, end: 180, progress: 0, budget: 4_500_000_000, spent: 0, mood: 'green', category: ['پلتفرم', 'Platform'] },
  { id: 'p6', code: 'MYC', name: 'Myca', pm: P.amin, sponsor: P.jalil, status: 'active', priority: 'high', start: -35, end: 130, progress: 24, budget: 6_000_000_000, spent: 1_200_000_000, mood: 'green', category: ['محصول', 'Product'] },
  { id: 'p7', code: 'MLK', name: 'malek', pm: P.atena, sponsor: P.mehrzad, status: 'on_hold', priority: 'low', start: -70, end: 100, progress: 18, budget: 2_000_000_000, spent: 450_000_000, mood: 'amber', category: ['داخلی', 'Internal'] },
  { id: 'p8', code: 'SMP', name: 'SimiPass', pm: P.sormeili, sponsor: P.jalil, status: 'active', priority: 'critical', start: -150, end: -6, progress: 84, budget: 8_000_000_000, spent: 8_600_000_000, mood: 'red', category: ['هویت و دسترسی', 'Identity & access'] },
  { id: 'p9', code: 'INO', name: 'Ino School', pm: P.mehrsa, sponsor: P.mehrzad, status: 'active', priority: 'medium', start: -50, end: 75, progress: 45, budget: 3_000_000_000, spent: 1_250_000_000, mood: 'green', category: ['آموزش', 'Education'] },
  { id: 'p10', code: 'AISN', name: 'AISN', pm: P.amin, sponsor: P.jalil, status: 'active', priority: 'high', start: -80, end: 60, progress: 49, budget: 6_500_000_000, spent: 4_100_000_000, mood: 'amber', category: ['هوش مصنوعی', 'AI'] },
  { id: 'p11', code: 'CLP', name: 'Clarity Pass', pm: P.babak, sponsor: P.jalil, status: 'completed', priority: 'high', start: -210, end: -25, progress: 100, budget: 4_200_000_000, spent: 4_050_000_000, mood: 'green', category: ['هویت و دسترسی', 'Identity & access'] },
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
  const me = P.vahid()

  const Team: Member[] = [
    { id: 'm1', name: P.vahid(), role: x('مدیر پروگرم', 'Program Manager'), email: 'vahid.ameri@acg.example', team: 'PMO', track: '' },
    { id: 'm2', name: P.jalil(), role: x('مدیرعامل', 'CEO'), email: 'jalil@acg.example', team: x('مدیریت', 'Leadership'), track: '' },
    { id: 'm3', name: P.keyvan(), role: x('هد تک', 'Head of Tech'), email: 'keyvanian@acg.example', team: x('تک', 'Tech'), track: 'tech' },
    { id: 'm4', name: P.mehrzad(), role: x('هد پروداکت', 'Head of Product'), email: 'mehrzad@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm5', name: P.atena(), role: x('پروداکت منیجر', 'Product Manager'), email: 'athena@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm6', name: P.sormeili(), role: x('پروداکت منیجر', 'Product Manager'), email: 'sormeili@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm7', name: P.salemeh(), role: x('پروداکت منیجر', 'Product Manager'), email: 'salemeh@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm8', name: P.mehrsa(), role: x('پروداکت منیجر', 'Product Manager'), email: 'mehrsa@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm9', name: P.babak(), role: x('پروداکت منیجر', 'Product Manager'), email: 'babak@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm10', name: P.amin(), role: x('پروداکت منیجر', 'Product Manager'), email: 'amin@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm11', name: P.hanie(), role: x('پروداکت دیزاینر', 'Product Designer'), email: 'hanie@acg.example', team: x('پروداکت', 'Product'), track: 'product' },
    { id: 'm12', name: P.tech(), role: x('مهندسی (تیمی)', 'Engineering (team)'), email: '', team: x('تک', 'Tech'), track: 'tech' },
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
    budget: s.budget,
    spent: s.spent,
    progress: s.progress,
    health_override: '',
    objective: '',
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
      completed_at: o.status === 'done' ? d(Math.min(-1, (o.due ?? -2) - 1)) : '', track: o.track || '', depends_on: '',
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
      project_id: s.id, title: x('پیاده‌سازی جریان اصلی', 'Build the core flow'), assignee: P.tech(), status: red ? 'blocked' : late ? 'done' : 'in_progress', due: red ? -3 : 5, priority: 'critical', points: 8, track: 'tech', tags: 'frontend,backend', sprint_id: sp,
      description: red ? x('منتظر تصمیم درباره‌ی دامنه‌ی نسخه و دسترسی به سرویس‌های بیرونی', 'Waiting on a scope decision and access to external services') : '',
    })
    const qa = T({ project_id: s.id, title: x('تست یکپارچه و QA', 'Integration testing & QA'), assignee: P.tech(), status: late ? 'in_progress' : 'todo', due: late ? -2 : 6, priority: 'high', points: 5, track: 'tech', tags: 'qa', sprint_id: sp })
    T({ project_id: s.id, title: x('استقرار و مانیتورینگ', 'Deployment & monitoring'), assignee: P.tech(), status: 'todo', due: late ? 1 : 12, points: 3, track: 'tech', tags: 'devops', sprint_id: late ? sp : '' })
    if (red || amber) T({ project_id: s.id, title: x('رفع باگ‌های گزارش‌شده', 'Fix reported bugs'), assignee: P.tech(), status: red ? 'in_progress' : 'todo', due: red ? -4 : 3, priority: 'high', points: 5, track: 'tech', tags: 'bug', sprint_id: sp })
    arch.depends_on = prd.id
    build.depends_on = [arch.id, ux.id].join(',')
    qa.depends_on = build.id
  })
  // Program manager's own work
  T({ project_id: '', title: x('آماده‌سازی گزارش کمیته‌ی راهبری', 'Prepare the steering committee report'), assignee: me, status: 'in_progress', due: 0, priority: 'high' })
  T({ project_id: 'p8', title: x('برنامه‌ی بازیابی SimiPass با هد تک', 'SimiPass recovery plan with Head of Tech'), assignee: me, status: 'todo', due: -1, priority: 'critical' })
  T({ project_id: 'p2', title: x('درخواست بودجه‌ی تکمیلی Insight X Padida', 'Supplementary budget request — Insight X Padida'), assignee: me, status: 'todo', due: -2, priority: 'critical' })
  T({ project_id: '', title: x('به‌روزرسانی رودمپ فصل', 'Update the quarterly roadmap'), assignee: me, status: 'todo', due: 3 })
  T({ project_id: 'p5', title: x('کیک‌آف HamAfza و تعیین تیم', 'HamAfza kickoff & team setup'), assignee: me, status: 'todo', due: 6, priority: 'high' })
  T({ project_id: '', title: x('جلسه‌ی ۱:۱ با هد پروداکت و هد تک', '1:1 with Head of Product & Head of Tech'), assignee: me, status: 'done', due: -1 })

  // ---------------------------------------------------------- follow-ups
  let fid = 0
  const F = (project_id: string, subject: string, person: string, channel: FollowUp['channel'], due: number, status: FollowUp['status'], priority: FollowUp['priority'], notes = ''): FollowUp => ({
    id: `f${++fid}`, project_id, subject, person, channel, due_date: d(due), status, priority, notes, created_at: d(-8), done_at: status === 'done' ? d(-1) : '',
  })
  const FollowUps: FollowUp[] = [
    F('p8', x('تأیید تاریخ جدید لانچ SimiPass', 'Approve the new SimiPass launch date'), P.jalil(), 'meeting', -2, 'open', 'critical', x('در جلسه‌ی هفته‌ی قبل به این هفته موکول شد', 'Deferred to this week in the last meeting')),
    F('p2', x('بودجه‌ی تکمیلی Insight X Padida', 'Supplementary budget — Insight X Padida'), P.jalil(), 'email', 1, 'waiting', 'critical', x('پیش‌نویس ارسال شد', 'Draft sent')),
    F('p2', x('ظرفیت تیم تک برای اسپرینت بعد', 'Tech capacity for next sprint'), P.keyvan(), 'chat', 0, 'open', 'high'),
    F('p1', x('بازخورد دمو از واحد فروش', 'Sales feedback on the demo'), P.atena(), 'meeting', 3, 'open', 'medium'),
    F('p4', x('مایلستون عقب‌افتاده‌ی Kadiner', 'Kadiner late milestone'), P.mehrsa(), 'call', -1, 'open', 'high'),
    F('p10', x('ارزیابی ریسک داده‌های آموزشی AISN', 'AISN training-data risk review'), P.amin(), 'meeting', 4, 'open', 'high'),
    F('p5', x('اسپانسر و تیم HamAfza', 'HamAfza sponsor & team'), P.mehrzad(), 'meeting', 5, 'open', 'medium'),
    F('p7', x('تصمیم درباره‌ی ادامه‌ی malek', 'Decide whether to resume malek'), P.jalil(), 'meeting', 9, 'open', 'low'),
    F('', x('هماهنگی منابع دیزاین بین پروژه‌ها', 'Design capacity across projects'), P.hanie(), 'chat', 2, 'waiting', 'medium'),
    F('p11', x('جمع‌بندی درس‌آموخته‌های Clarity Pass', 'Clarity Pass retrospective'), P.babak(), 'meeting', -6, 'done', 'low'),
  ]

  // ---------------------------------------------------------- risks & decisions
  let rid = 0
  const R = (project_id: string, title: string, type: Risk['type'], probability: number, impact: number, owner: string, mitigation: string, status: Risk['status'], due: number): Risk => ({ id: `r${++rid}`, project_id, title, type, probability, impact, owner, mitigation, status, due_date: d(due) })
  const Risks: Risk[] = [
    R('p8', x('تأخیر لانچ از ددلاین تعهدشده', 'Launch slipping past the committed deadline'), 'issue', 5, 4, P.sormeili(), x('برنامه‌ی بازیابی و کاهش دامنه‌ی نسخه‌ی اول', 'Recovery plan and a reduced first-release scope'), 'open', 2),
    R('p8', x('فراتر رفتن هزینه از بودجه', 'Spend above budget'), 'issue', 5, 3, me, x('درخواست بودجه‌ی تکمیلی و توقف کارهای غیرضروری', 'Supplementary budget request; pause non-essential work'), 'open', 1),
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
  const A = (member_id: string, project_id: string, percent: number) => Allocations.push({ id: `a${Allocations.length + 1}`, member_id, project_id, percent })
  const pmIds: [() => string, string][] = [[P.atena, 'm5'], [P.sormeili, 'm6'], [P.salemeh, 'm7'], [P.mehrsa, 'm8'], [P.babak, 'm9'], [P.amin, 'm10']]
  SPECS.filter((s) => s.status !== 'completed').forEach((s) => {
    const pm = pmIds.find(([f]) => f === s.pm)?.[1]
    // Ali Sormeili carries two critical projects at 60% each — a deliberate over-allocation signal
    if (pm) A(pm, s.id, s.status === 'on_hold' ? 10 : s.status === 'planning' ? 20 : pm === 'm6' ? 60 : 50)
    if (s.status === 'active') {
      A('m3', s.id, 10)
      A('m4', s.id, 10)
    }
  })
  ;['p1', 'p2', 'p4', 'p6', 'p10'].forEach((pid) => A('m11', pid, 20))
  A('m1', 'p8', 30)
  A('m1', 'p2', 25)
  A('m1', 'p1', 20)
  A('m1', 'p5', 15)
  A('m2', 'p8', 5)

  // ---------------------------------------------------------- weekly updates (history drives the trend arrows)
  const Updates: Update[] = []
  let uid = 0
  const lines: Record<Health, string[]> = {
    green: [x('طبق برنامه پیش می‌رویم.', 'On plan.'), x('اسپرینت با تحویل کامل بسته شد.', 'Sprint closed with full delivery.')],
    amber: [x('یک مایلستون عقب افتاده؛ برنامه‌ی جبران در جریان است.', 'One milestone slipped; recovery plan in progress.'), x('ظرفیت تیم محدود است و اولویت‌ها بازبینی شد.', 'Capacity is tight; priorities reviewed.')],
    red: [x('ددلاین در خطر است و به تصمیم مدیریت نیاز داریم.', 'Deadline at risk; leadership decision needed.'), x('هزینه از بودجه جلو زده و کار مسدود داریم.', 'Spend is ahead of budget and work is blocked.')],
  }
  liveSpecs.forEach((s) => {
    const hist: Health[] = s.mood === 'red' ? ['amber', 'amber', 'red', 'red'] : s.mood === 'amber' ? ['green', 'green', 'amber', 'amber'] : ['green', 'amber', 'green', 'green']
    hist.forEach((h, i) => {
      // one green project is deliberately stale so the "no update" nudge has something to show
      const age = (hist.length - 1 - i) * 7 + (s.code === 'RBR' ? 9 : 2)
      Updates.push({
        id: `u${++uid}`, project_id: s.id, week_date: d(-age), author: s.pm(), health: h, summary: lines[h][i % 2],
        done: x('بستن اسپرینت\nبازبینی طراحی', 'Sprint closed\nDesign review'), next: x('تست یکپارچه\nآماده‌سازی دمو', 'Integration testing\nDemo prep'),
        blockers: h === 'green' ? '' : h === 'amber' ? x('ظرفیت تیم تک', 'Tech capacity') : x('تصمیم اسکوپ\nبودجه', 'Scope decision\nBudget'),
      })
    })
  })

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
    { id: 'c4', entity: 'Projects', entity_id: 'p2', author: P.mehrzad(), body: x(`@${me} برای بودجه‌ی تکمیلی یک صفحه‌ی خلاصه آماده کنیم.`, `@${me} let’s prepare a one-pager for the extra budget.`), created_at: at(-2, '12:10') },
    { id: 'c5', entity: 'FollowUps', entity_id: 'f2', author: me, body: x('پیش‌نویس درخواست ارسال شد.', 'Request draft sent.'), created_at: at(-1, '11:00') },
  ]

  return { Projects, Scope, Milestones, Sprints, Tasks, FollowUps, Risks, Team, Allocations, Updates, Comments }
}

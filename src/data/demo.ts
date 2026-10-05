// Sample data so the dashboard is fully usable before the Google Sheet is connected.
// Dates are relative to today so the demo always looks "live".
import type { DB, Task, Milestone, Sprint, FollowUp, Risk, ScopeItem, Update, Allocation, Comment } from '../lib/types'
import { addDays, todayISO } from '../lib/jalali'
import { locale } from '../lib/i18n'
import { EN, translateDemo } from './demo-en'

const DEMO_ME = 'وحید عامری'
export const demoMe = () => (locale.lang === 'en' ? EN[DEMO_ME] : DEMO_ME)

/** Sample data in the current interface language. */
export function buildDemo(): DB {
  const db = buildDemoFa()
  return locale.lang === 'en' ? translateDemo(db) : db
}

function buildDemoFa(): DB {
  const t = todayISO()
  const d = (n: number) => addDays(t, n)

  const Team: DB['Team'] = [
    { id: 'm1', name: DEMO_ME, role: 'Program Manager', email: 'pm@acg.example', team: 'PMO', track: '' },
    { id: 'm2', name: 'سارا محمدی', role: 'Product Owner', email: 'sara@acg.example', team: 'محصول', track: 'product' },
    { id: 'm3', name: 'علی رضایی', role: 'Tech Lead', email: 'ali@acg.example', team: 'فنی', track: 'tech' },
    { id: 'm4', name: 'نگار حسینی', role: 'UX Designer', email: 'negar@acg.example', team: 'طراحی', track: 'product' },
    { id: 'm5', name: 'رضا کریمی', role: 'Backend Developer', email: 'reza@acg.example', team: 'فنی', track: 'tech' },
    { id: 'm6', name: 'مریم احمدی', role: 'Frontend Developer', email: 'maryam@acg.example', team: 'فنی', track: 'tech' },
    { id: 'm7', name: 'امیر نوری', role: 'QA Engineer', email: 'amir@acg.example', team: 'فنی', track: 'tech' },
    { id: 'm8', name: 'الهام صادقی', role: 'Business Analyst', email: 'elham@acg.example', team: 'محصول', track: 'product' },
    { id: 'm9', name: 'حمید جعفری', role: 'DevOps Engineer', email: 'hamid@acg.example', team: 'فنی', track: 'tech' },
    { id: 'm10', name: 'دکتر کامرانی', role: 'CEO', email: 'ceo@acg.example', team: 'مدیریت', track: '' },
  ]

  const Projects = [
    { id: 'p1', code: 'ACG-CRM', name: 'سامانه CRM یکپارچه', description: 'یکپارچه‌سازی فروش، پشتیبانی و بازاریابی در یک پلتفرم واحد', category: 'تحول دیجیتال', owner: 'سارا محمدی', sponsor: 'دکتر کامرانی', status: 'active', priority: 'critical', phase: 'توسعه', start_date: d(-120), end_date: d(60), budget: 8500000000, spent: 5200000000, progress: 58, health_override: '', objective: 'افزایش ۲۰٪ نرخ تبدیل لید تا پایان سال' },
    { id: 'p2', code: 'ACG-APP', name: 'اپلیکیشن موبایل مشتریان', description: 'اپ iOS و اندروید برای سفارش، پیگیری و پرداخت', category: 'محصول', owner: 'علی رضایی', sponsor: 'دکتر کامرانی', status: 'active', priority: 'high', phase: 'توسعه', start_date: d(-90), end_date: d(25), budget: 6000000000, spent: 5600000000, progress: 72, health_override: '', objective: '۵۰ هزار کاربر فعال ماهانه در ۶ ماه اول' },
    { id: 'p3', code: 'ACG-BI', name: 'داشبورد هوش تجاری', description: 'انبار داده و داشبوردهای مدیریتی برای واحدهای کسب‌وکار', category: 'داده', owner: 'الهام صادقی', sponsor: 'دکتر کامرانی', status: 'active', priority: 'medium', phase: 'تحلیل و طراحی', start_date: d(-30), end_date: d(150), budget: 3200000000, spent: 600000000, progress: 14, health_override: '', objective: 'تصمیم‌گیری داده‌محور در کمیته‌ی مدیریت' },
    { id: 'p4', code: 'ACG-ERP', name: 'مهاجرت ERP به نسخه‌ی ابری', description: 'انتقال سیستم ERP قدیمی به زیرساخت ابری', category: 'زیرساخت', owner: 'حمید جعفری', sponsor: 'دکتر کامرانی', status: 'active', priority: 'high', phase: 'مهاجرت', start_date: d(-150), end_date: d(-5), budget: 12000000000, spent: 12900000000, progress: 82, health_override: '', objective: 'کاهش ۳۰٪ هزینه‌ی نگهداری زیرساخت' },
    { id: 'p5', code: 'ACG-WEB', name: 'بازطراحی وب‌سایت شرکتی', description: 'هویت بصری جدید، CMS و بهینه‌سازی سئو', category: 'برند', owner: 'نگار حسینی', sponsor: 'سارا محمدی', status: 'active', priority: 'medium', phase: 'پیاده‌سازی', start_date: d(-60), end_date: d(40), budget: 1500000000, spent: 800000000, progress: 52, health_override: '', objective: 'دو برابر شدن ترافیک ارگانیک' },
    { id: 'p6', code: 'ACG-SEC', name: 'برنامه‌ی امنیت اطلاعات ISO 27001', description: 'استقرار سیستم مدیریت امنیت اطلاعات و اخذ گواهی', category: 'انطباق', owner: 'حمید جعفری', sponsor: 'دکتر کامرانی', status: 'planning', priority: 'high', phase: 'برنامه‌ریزی', start_date: d(10), end_date: d(200), budget: 2500000000, spent: 0, progress: 0, health_override: '', objective: 'اخذ گواهی ISO 27001' },
    { id: 'p7', code: 'ACG-HR', name: 'پرتال منابع انسانی', description: 'خودخدمت کارکنان: مرخصی، فیش، ارزیابی عملکرد', category: 'داخلی', owner: 'الهام صادقی', sponsor: 'سارا محمدی', status: 'on_hold', priority: 'low', phase: 'طراحی', start_date: d(-80), end_date: d(90), budget: 900000000, spent: 250000000, progress: 20, health_override: '', objective: 'حذف فرآیندهای کاغذی منابع انسانی' },
    { id: 'p8', code: 'ACG-PAY', name: 'درگاه پرداخت B2B', description: 'تسویه‌ی خودکار با شرکا و صدور فاکتور الکترونیک', category: 'محصول', owner: 'رضا کریمی', sponsor: 'دکتر کامرانی', status: 'completed', priority: 'high', phase: 'تحویل', start_date: d(-200), end_date: d(-20), budget: 4000000000, spent: 3800000000, progress: 100, health_override: '', objective: 'تسویه‌ی کمتر از ۲۴ ساعت با شرکا' },
  ] as DB['Projects']

  let mid = 0
  const M = (project_id: string, title: string, planned: number, status: Milestone['status'], owner: string, actual?: number, weight = 1): Milestone => ({
    id: `ms${++mid}`, project_id, title, planned_date: d(planned), actual_date: actual !== undefined ? d(actual) : '', status, owner, weight,
  })
  const Milestones: Milestone[] = [
    M('p1', 'نیازسنجی و تحلیل', -100, 'done', 'الهام صادقی', -98),
    M('p1', 'طراحی معماری و UX', -70, 'done', 'نگار حسینی', -65),
    M('p1', 'ماژول فروش (MVP)', -20, 'done', 'علی رضایی', -15, 2),
    M('p1', 'ماژول پشتیبانی', 10, 'in_progress', 'رضا کریمی', undefined, 2),
    M('p1', 'یکپارچه‌سازی با ERP', 35, 'pending', 'حمید جعفری', undefined, 2),
    M('p1', 'Go-Live', 60, 'pending', 'سارا محمدی'),
    M('p2', 'طراحی UI', -60, 'done', 'نگار حسینی', -55),
    M('p2', 'نسخه‌ی آلفا', -25, 'done', 'مریم احمدی', -18, 2),
    M('p2', 'نسخه‌ی بتا (تست کاربر)', -5, 'in_progress', 'امیر نوری', undefined, 2),
    M('p2', 'انتشار در استورها', 25, 'pending', 'علی رضایی', undefined, 2),
    M('p3', 'تعریف KPIها با واحدها', -10, 'done', 'الهام صادقی', -8),
    M('p3', 'طراحی انبار داده', 30, 'in_progress', 'رضا کریمی', undefined, 2),
    M('p3', 'داشبوردهای فاز ۱', 90, 'pending', 'الهام صادقی', undefined, 2),
    M('p3', 'آموزش کاربران', 150, 'pending', 'الهام صادقی'),
    M('p4', 'ارزیابی زیرساخت', -130, 'done', 'حمید جعفری', -128),
    M('p4', 'مهاجرت داده‌ها', -60, 'done', 'حمید جعفری', -40, 2),
    M('p4', 'تست موازی', -25, 'in_progress', 'امیر نوری', undefined, 2),
    M('p4', 'Cut-over نهایی', -5, 'pending', 'حمید جعفری', undefined, 2),
    M('p5', 'هویت بصری', -40, 'done', 'نگار حسینی', -42),
    M('p5', 'طراحی صفحات', -15, 'done', 'نگار حسینی', -12),
    M('p5', 'پیاده‌سازی CMS', 15, 'in_progress', 'مریم احمدی', undefined, 2),
    M('p5', 'انتشار', 40, 'pending', 'نگار حسینی'),
    M('p6', 'تحلیل شکاف', 40, 'pending', 'حمید جعفری'),
    M('p6', 'تدوین سیاست‌ها', 100, 'pending', 'حمید جعفری'),
    M('p6', 'ممیزی خارجی', 190, 'pending', 'حمید جعفری'),
    M('p7', 'نیازسنجی', -60, 'done', 'الهام صادقی', -58),
    M('p7', 'طراحی', -20, 'missed', 'نگار حسینی'),
    M('p8', 'تحویل نهایی', -20, 'done', 'رضا کریمی', -22),
  ]

  const Sprints: Sprint[] = [
    { id: 's1', project_id: 'p1', name: 'اسپرینت ۷', start_date: d(-35), end_date: d(-22), goal: 'تکمیل گزارش‌های فروش', committed_points: 34, completed_points: 30, status: 'closed' },
    { id: 's2', project_id: 'p1', name: 'اسپرینت ۸', start_date: d(-21), end_date: d(-8), goal: 'تیکتینگ پایه', committed_points: 38, completed_points: 36, status: 'closed' },
    { id: 's3', project_id: 'p1', name: 'اسپرینت ۹', start_date: d(-7), end_date: d(6), goal: 'SLA و اسکالیشن تیکت‌ها', committed_points: 0, completed_points: 0, status: 'active' },
    { id: 's4', project_id: 'p2', name: 'اسپرینت ۵', start_date: d(-28), end_date: d(-15), goal: 'پرداخت درون‌برنامه‌ای', committed_points: 40, completed_points: 28, status: 'closed' },
    { id: 's5', project_id: 'p2', name: 'اسپرینت ۶', start_date: d(-14), end_date: d(-1), goal: 'پیگیری سفارش', committed_points: 36, completed_points: 25, status: 'closed' },
    { id: 's6', project_id: 'p2', name: 'اسپرینت ۷', start_date: d(0), end_date: d(13), goal: 'رفع باگ‌های بتا و آماده‌سازی انتشار', committed_points: 0, completed_points: 0, status: 'active' },
    { id: 's7', project_id: 'p5', name: 'اسپرینت ۳', start_date: d(-5), end_date: d(8), goal: 'قالب‌های CMS', committed_points: 0, completed_points: 0, status: 'active' },
    { id: 's8', project_id: 'p1', name: 'اسپرینت ۶', start_date: d(-49), end_date: d(-36), goal: 'پایپ‌لاین فروش', committed_points: 30, completed_points: 29, status: 'closed' },
    { id: 's9', project_id: 'p2', name: 'اسپرینت ۴', start_date: d(-42), end_date: d(-29), goal: 'احراز هویت و پروفایل', committed_points: 32, completed_points: 30, status: 'closed' },
  ]

  let tid = 0
  const T = (project_id: string, sprint_id: string, title: string, assignee: string, status: Task['status'], priority: Task['priority'], due: number | null, points: number, completed?: number, tags = '', description = ''): Task => ({
    id: `t${++tid}`, project_id, sprint_id, title, description, assignee, reporter: DEMO_ME, status, priority,
    due_date: due === null ? '' : d(due), points, tags, created_at: d(-20), completed_at: completed !== undefined ? d(completed) : '', track: '', depends_on: '',
  })
  const Tasks: Task[] = [
    // CRM active sprint
    T('p1', 's3', 'طراحی موتور SLA تیکت', 'رضا کریمی', 'done', 'high', -3, 8, -4, 'backend'),
    T('p1', 's3', 'قوانین اسکالیشن خودکار', 'رضا کریمی', 'in_progress', 'high', 3, 5, undefined, 'backend'),
    T('p1', 's3', 'UI صف تیکت‌ها', 'مریم احمدی', 'done', 'medium', -2, 5, -2, 'frontend'),
    T('p1', 's3', 'اعلان ایمیلی تیکت', 'رضا کریمی', 'review', 'medium', 1, 3, undefined, 'backend'),
    T('p1', 's3', 'گزارش زمان پاسخ‌گویی', 'مریم احمدی', 'todo', 'medium', 5, 5, undefined, 'frontend'),
    T('p1', 's3', 'تست یکپارچه‌ی ماژول پشتیبانی', 'امیر نوری', 'todo', 'high', 6, 5, undefined, 'qa'),
    T('p1', 's3', 'دسترسی API از ERP برای مشتریان', 'حمید جعفری', 'blocked', 'critical', -1, 3, undefined, 'integration', 'منتظر تأیید تیم ERP برای دسترسی سرویس‌ها'),
    T('p1', 's3', 'مهاجرت داده‌ی تیکت‌های قدیمی', 'رضا کریمی', 'done', 'low', -5, 3, -6),
    T('p1', '', 'جلسه‌ی دمو با واحد فروش', DEMO_ME, 'todo', 'high', 2, 0, undefined, 'stakeholder'),
    T('p1', '', 'به‌روزرسانی Business Case برای کمیته', DEMO_ME, 'in_progress', 'high', 0, 0),
    // APP active sprint
    T('p2', 's6', 'رفع کرش صفحه‌ی پرداخت در اندروید ۱۰', 'مریم احمدی', 'in_progress', 'critical', 2, 5, undefined, 'bug'),
    T('p2', 's6', 'بهینه‌سازی زمان بارگذاری', 'مریم احمدی', 'todo', 'high', 7, 8),
    T('p2', 's6', 'آماده‌سازی متادیتای App Store', 'نگار حسینی', 'todo', 'medium', 10, 3),
    T('p2', 's6', 'تست رگرسیون کامل', 'امیر نوری', 'todo', 'high', 11, 8, undefined, 'qa'),
    T('p2', 's6', 'Push Notification سفارش', 'رضا کریمی', 'blocked', 'high', 4, 5, undefined, 'backend', 'سرویس پوش هنوز تهیه نشده'),
    T('p2', 's6', 'رفع باگ‌های گزارش‌شده‌ی بتا (۱۲ مورد)', 'مریم احمدی', 'todo', 'high', 9, 8, undefined, 'bug'),
    T('p2', 's5', 'نقشه‌ی پیگیری سفارش', 'مریم احمدی', 'done', 'high', -3, 8, -2),
    T('p2', 's5', 'وب‌سرویس وضعیت سفارش', 'رضا کریمی', 'done', 'high', -6, 5, -6),
    T('p2', '', 'قرارداد سرویس پوش با تأمین‌کننده', DEMO_ME, 'todo', 'critical', -2, 0, undefined, 'procurement'),
    T('p2', '', 'هماهنگی کمپین لانچ با مارکتینگ', 'سارا محمدی', 'todo', 'medium', 15, 0),
    // BI
    T('p3', '', 'مصاحبه با واحد مالی درباره‌ی KPIها', 'الهام صادقی', 'done', 'medium', -12, 0, -11),
    T('p3', '', 'انتخاب ابزار BI (Power BI / Metabase)', 'الهام صادقی', 'in_progress', 'high', 5, 0),
    T('p3', '', 'مدل داده‌ی ستاره‌ای فروش', 'رضا کریمی', 'todo', 'medium', 20, 0),
    T('p3', '', 'دسترسی به دیتابیس‌های عملیاتی', 'حمید جعفری', 'todo', 'high', 8, 0),
    // ERP
    T('p4', '', 'رفع مغایرت داده‌های انبار', 'حمید جعفری', 'in_progress', 'critical', -10, 0, undefined, 'data'),
    T('p4', '', 'تست موازی ماژول حسابداری', 'امیر نوری', 'blocked', 'critical', -7, 0, undefined, 'qa', 'محیط تست ناپایدار است'),
    T('p4', '', 'آموزش کاربران کلیدی', 'الهام صادقی', 'todo', 'high', -3, 0),
    T('p4', '', 'برنامه‌ی Rollback', 'حمید جعفری', 'todo', 'high', -1, 0),
    T('p4', '', 'تأیید نهایی واحد مالی', DEMO_ME, 'todo', 'critical', -4, 0),
    T('p4', '', 'بستن قرارداد پشتیبانی ابری', DEMO_ME, 'done', 'high', -30, 0, -28),
    // WEB
    T('p5', 's7', 'قالب صفحه‌ی خدمات', 'مریم احمدی', 'done', 'medium', -1, 5, -1),
    T('p5', 's7', 'قالب بلاگ', 'مریم احمدی', 'in_progress', 'medium', 3, 5),
    T('p5', 's7', 'مهاجرت محتوای قدیمی', 'نگار حسینی', 'todo', 'low', 7, 3),
    T('p5', 's7', 'تنظیم ریدایرکت‌های سئو', 'مریم احمدی', 'todo', 'high', 8, 3),
    T('p5', '', 'تأیید متن‌های صفحه‌ی اصلی توسط مدیرعامل', DEMO_ME, 'todo', 'medium', 4, 0),
    // SEC
    T('p6', '', 'انتخاب مشاور ISO', DEMO_ME, 'in_progress', 'high', 6, 0),
    T('p6', '', 'تشکیل کمیته‌ی امنیت', 'حمید جعفری', 'todo', 'medium', 14, 0),
    // HR
    T('p7', '', 'بازنگری اولویت پروژه در کمیته', DEMO_ME, 'todo', 'low', 12, 0),
  ]
  // Product-team work that hands off to engineering (tech tasks depend on these).
  Tasks.push(
    T('p1', 's3', 'تعریف سیاست‌های SLA با واحد پشتیبانی', 'سارا محمدی', 'done', 'high', -6, 3, -7, 'spec'),
    T('p1', 's3', 'نیازمندی‌های اسکالیشن و سطوح دسترسی', 'الهام صادقی', 'in_progress', 'high', 1, 3, undefined, 'spec'),
    T('p1', '', 'طراحی UX صف تیکت', 'نگار حسینی', 'done', 'medium', -9, 3, -8, 'design'),
    T('p2', 's6', 'اولویت‌بندی باگ‌های بتا با تیم پشتیبانی', 'سارا محمدی', 'done', 'high', -1, 2, -1, 'triage'),
    T('p2', 's6', 'طراحی UX اعلان‌های سفارش', 'نگار حسینی', 'review', 'high', 2, 3, undefined, 'design'),
    T('p3', '', 'سند نیازمندی داشبورد فروش', 'الهام صادقی', 'in_progress', 'high', 7, 0, undefined, 'spec'),
    T('p5', 's7', 'نقشه‌ی سایت و معماری اطلاعات', 'نگار حسینی', 'done', 'medium', -6, 3, -6, 'design'),
  )
  const dep = (taskTitle: string, ...needs: string[]) => {
    const t = Tasks.find((x) => x.title === taskTitle)
    if (t) t.depends_on = needs.map((n) => Tasks.find((x) => x.title === n)?.id).filter(Boolean).join(',')
  }
  dep('طراحی موتور SLA تیکت', 'تعریف سیاست‌های SLA با واحد پشتیبانی')
  dep('قوانین اسکالیشن خودکار', 'نیازمندی‌های اسکالیشن و سطوح دسترسی')
  dep('UI صف تیکت‌ها', 'طراحی UX صف تیکت')
  dep('رفع باگ‌های گزارش‌شده‌ی بتا (۱۲ مورد)', 'اولویت‌بندی باگ‌های بتا با تیم پشتیبانی')
  dep('Push Notification سفارش', 'طراحی UX اعلان‌های سفارش')
  dep('مدل داده‌ی ستاره‌ای فروش', 'سند نیازمندی داشبورد فروش', 'انتخاب ابزار BI (Power BI / Metabase)')
  dep('قالب صفحه‌ی خدمات', 'نقشه‌ی سایت و معماری اطلاعات')
  dep('تنظیم ریدایرکت‌های سئو', 'نقشه‌ی سایت و معماری اطلاعات')
  // Closed sprints' tasks for velocity realism are represented by committed/completed points.

  let fid = 0
  const F = (project_id: string, subject: string, person: string, channel: FollowUp['channel'], due: number, status: FollowUp['status'], priority: FollowUp['priority'], notes = ''): FollowUp => ({
    id: `f${++fid}`, project_id, subject, person, channel, due_date: d(due), status, priority, notes, created_at: d(-7), done_at: status === 'done' ? d(-1) : '',
  })
  const FollowUps: FollowUp[] = [
    F('p1', 'دسترسی API سرویس‌های ERP', 'مدیر فناوری ERP', 'email', -1, 'waiting', 'critical', 'ایمیل اول ارسال شد، پاسخی نیامده'),
    F('p2', 'پیش‌فاکتور سرویس پوش نوتیفیکیشن', 'واحد تدارکات', 'call', 0, 'open', 'high'),
    F('p4', 'تأیید تاریخ Cut-over با مدیر مالی', 'مدیر مالی', 'meeting', -3, 'open', 'critical', 'در جلسه‌ی هفته‌ی قبل موکول شد'),
    F('p4', 'افزایش بودجه‌ی مهاجرت ERP', 'دکتر کامرانی', 'meeting', 2, 'open', 'high', 'نیاز به ۱.۵ میلیارد اضافه'),
    F('p3', 'نامه‌ی معرفی رابط از واحد فروش', 'مدیر فروش', 'chat', 3, 'waiting', 'medium'),
    F('p5', 'دریافت عکس‌های جدید تیم', 'روابط عمومی', 'chat', 5, 'open', 'low'),
    F('p6', 'پروپوزال سه مشاور ISO', 'حمید جعفری', 'email', 6, 'open', 'medium'),
    F('p1', 'فیدبک دمو از تیم فروش', 'مدیر فروش', 'meeting', 4, 'open', 'medium'),
    F('p2', 'وضعیت حساب اپل دولوپر', 'علی رضایی', 'chat', 1, 'open', 'high'),
    F('p7', 'تصمیم درباره‌ی ادامه‌ی پروژه‌ی HR', 'دکتر کامرانی', 'meeting', 10, 'open', 'low'),
    F('p1', 'ارسال گزارش ماهانه به هیئت‌مدیره', 'دبیر هیئت‌مدیره', 'email', -5, 'done', 'medium'),
  ]

  let rid = 0
  const R = (project_id: string, title: string, type: Risk['type'], probability: number, impact: number, owner: string, mitigation: string, status: Risk['status'], due: number): Risk => ({
    id: `r${++rid}`, project_id, title, type, probability, impact, owner, mitigation, status, due_date: d(due),
  })
  const Risks: Risk[] = [
    R('p1', 'تأخیر تیم ERP در ارائه‌ی API', 'dependency', 4, 4, 'حمید جعفری', 'جلسه‌ی اسکالیشن با مدیر فناوری؛ طراحی Mock API', 'open', 5),
    R('p1', 'مقاومت کاربران فروش در برابر تغییر', 'risk', 3, 3, 'سارا محمدی', 'برنامه‌ی Change Management و Champion در هر تیم', 'mitigating', 30),
    R('p2', 'رد شدن اپ در بررسی App Store', 'risk', 3, 5, 'علی رضایی', 'بررسی چک‌لیست راهنمای اپل قبل از سابمیت', 'open', 20),
    R('p2', 'کمبود نیروی فرانت‌اند', 'issue', 4, 4, 'علی رضایی', 'جذب پیمانکار موقت', 'open', 7),
    R('p2', 'سرویس پوش نوتیفیکیشن خریداری نشده', 'issue', 5, 3, DEMO_ME, 'پیگیری با تدارکات', 'open', 2),
    R('p4', 'فراتر رفتن از بودجه‌ی مهاجرت', 'issue', 5, 4, DEMO_ME, 'درخواست بودجه‌ی تکمیلی از مدیرعامل', 'open', 2),
    R('p4', 'مغایرت داده‌ها پس از مهاجرت', 'risk', 4, 5, 'حمید جعفری', 'اسکریپت‌های تطبیق خودکار و تست موازی', 'mitigating', 0),
    R('p4', 'Cut-over در پایان سال مالی', 'decision', 3, 4, 'دکتر کامرانی', 'تصمیم درباره‌ی جابجایی تاریخ Cut-over', 'open', 3),
    R('p3', 'کیفیت پایین داده‌های منبع', 'risk', 3, 3, 'الهام صادقی', 'پروفایلینگ داده در فاز اول', 'open', 40),
    R('p5', 'تأخیر در تأمین محتوا', 'risk', 3, 2, 'نگار حسینی', 'تقویم محتوا با روابط عمومی', 'open', 20),
    R('p6', 'نبود منابع داخلی برای ISO', 'risk', 2, 4, 'حمید جعفری', 'استفاده از مشاور خارجی', 'open', 30),
    R('p7', 'اولویت پایین در سبد پروژه‌ها', 'decision', 2, 2, 'سارا محمدی', 'بررسی در کمیته‌ی فصلی', 'open', 12),
  ]

  let sid = 0
  const S = (project_id: string, item: string, type: ScopeItem['type'], status: ScopeItem['status'], change_note = '', date = -30): ScopeItem => ({
    id: `sc${++sid}`, project_id, item, type, status, change_note, date: d(date),
  })
  const Scope: ScopeItem[] = [
    S('p1', 'مدیریت لید و پایپ‌لاین فروش', 'in', 'delivered'),
    S('p1', 'تیکتینگ و SLA پشتیبانی', 'in', 'in_progress'),
    S('p1', 'کمپین‌های ایمیلی', 'in', 'planned'),
    S('p1', 'یکپارچگی با ERP (مشتری و فاکتور)', 'in', 'planned'),
    S('p1', 'اپ موبایل CRM', 'out', 'removed', 'به فاز ۲ منتقل شد', -45),
    S('p1', 'چت‌بات پشتیبانی', 'in', 'changed', 'درخواست جدید واحد پشتیبانی — نیازمند تأیید کمیته', -10),
    S('p2', 'ثبت و پیگیری سفارش', 'in', 'delivered'),
    S('p2', 'پرداخت درون‌برنامه‌ای', 'in', 'delivered'),
    S('p2', 'باشگاه مشتریان', 'out', 'removed', 'به نسخه‌ی ۱.۱ منتقل شد', -40),
    S('p2', 'اعلان‌های لحظه‌ای', 'in', 'in_progress'),
    S('p3', 'داشبورد فروش', 'in', 'planned'),
    S('p3', 'داشبورد مالی', 'in', 'planned'),
    S('p3', 'تحلیل پیش‌بینی‌کننده', 'out', 'planned', 'فاز بعدی'),
    S('p4', 'ماژول حسابداری', 'in', 'in_progress'),
    S('p4', 'ماژول انبار', 'in', 'in_progress'),
    S('p4', 'ماژول حقوق و دستمزد', 'in', 'changed', 'به فاز ۲ موکول شد', -20),
    S('p5', 'CMS چندزبانه', 'in', 'in_progress'),
    S('p5', 'بلاگ و سئو', 'in', 'in_progress'),
  ]

  const Allocations: Allocation[] = []
  const A = (member_id: string, project_id: string, percent: number) => Allocations.push({ id: `a${Allocations.length + 1}`, member_id, project_id, percent })
  A('m1', 'p1', 30); A('m1', 'p2', 25); A('m1', 'p4', 30); A('m1', 'p6', 15)
  A('m2', 'p1', 60); A('m2', 'p2', 30); A('m2', 'p7', 10)
  A('m3', 'p2', 70); A('m3', 'p1', 30)
  A('m4', 'p5', 60); A('m4', 'p2', 30); A('m4', 'p1', 20)
  A('m5', 'p1', 60); A('m5', 'p2', 40); A('m5', 'p3', 30)
  A('m6', 'p2', 60); A('m6', 'p5', 40); A('m6', 'p1', 20)
  A('m7', 'p2', 50); A('m7', 'p4', 50)
  A('m8', 'p3', 70); A('m8', 'p7', 20); A('m8', 'p4', 10)
  A('m9', 'p4', 70); A('m9', 'p6', 20); A('m9', 'p1', 10)
  A('m10', 'p1', 5); A('m10', 'p4', 5)

  const U = (id: string, project_id: string, week: number, author: string, health: Update['health'], summary: string, done: string, next: string, blockers: string): Update => ({
    id, project_id, week_date: d(week), author, health, summary, done, next, blockers,
  })
  const Updates: Update[] = [
    U('u1', 'p1', -2, 'سارا محمدی', 'amber', 'ماژول پشتیبانی طبق برنامه پیش می‌رود اما یکپارچگی ERP به دلیل وابستگی در خطر است.', 'موتور SLA\nUI صف تیکت‌ها\nمهاجرت تیکت‌های قدیمی', 'قوانین اسکالیشن\nتست یکپارچه', 'دسترسی API از تیم ERP'),
    U('u2', 'p2', -1, 'علی رضایی', 'red', 'بودجه تقریباً تمام شده و کمبود نیروی فرانت‌اند داریم؛ تاریخ انتشار در خطر است.', 'پیگیری سفارش\nوب‌سرویس وضعیت', 'رفع باگ‌های بتا\nتست رگرسیون', 'سرویس پوش\nنیروی فرانت‌اند'),
    U('u3', 'p4', -3, 'حمید جعفری', 'red', 'ددلاین Cut-over گذشته و مغایرت داده‌ها حل نشده است.', 'مهاجرت داده‌ها', 'رفع مغایرت\nتست موازی', 'محیط تست ناپایدار\nبودجه'),
    U('u4', 'p3', -4, 'الهام صادقی', 'green', 'KPIها نهایی شد، انتخاب ابزار در جریان است.', 'مصاحبه با واحدها', 'انتخاب ابزار BI', ''),
    U('u5', 'p5', -2, 'نگار حسینی', 'green', 'پیاده‌سازی قالب‌ها خوب پیش می‌رود.', 'قالب صفحه‌ی خدمات', 'قالب بلاگ\nریدایرکت‌ها', 'تأمین محتوا'),
    U('u6', 'p1', -9, 'سارا محمدی', 'green', 'MVP فروش تحویل شد.', 'ماژول فروش', 'تیکتینگ', ''),
    U('u7', 'p1', -16, 'سارا محمدی', 'green', 'طراحی معماری تأیید شد و توسعه شروع شد.', 'طراحی معماری', 'ماژول فروش', ''),
    U('u8', 'p1', -23, 'سارا محمدی', 'amber', 'نیازسنجی کمی طول کشید؛ برنامه به‌روز شد.', 'نیازسنجی', 'طراحی معماری', 'هماهنگی واحدها'),
    U('u9', 'p2', -8, 'علی رضایی', 'amber', 'آلفا با تأخیر تحویل شد؛ ریسک نیرو جدی است.', 'نسخه‌ی آلفا', 'بتا', 'نیروی فرانت‌اند'),
    U('u10', 'p2', -15, 'علی رضایی', 'green', 'پرداخت درون‌برنامه‌ای کامل شد.', 'پرداخت درون‌برنامه‌ای', 'پیگیری سفارش', ''),
    U('u11', 'p2', -22, 'علی رضایی', 'green', 'طراحی UI نهایی شد.', 'طراحی UI', 'آلفا', ''),
    U('u12', 'p4', -10, 'حمید جعفری', 'amber', 'تست موازی با مغایرت داده روبه‌رو شد.', 'مهاجرت داده‌ها', 'تست موازی', 'مغایرت داده‌ها'),
    U('u13', 'p4', -17, 'حمید جعفری', 'amber', 'بودجه به سقف نزدیک است.', 'مهاجرت داده‌ها', 'تست موازی', 'بودجه'),
    U('u14', 'p4', -24, 'حمید جعفری', 'green', 'مهاجرت داده‌ها طبق برنامه پیش می‌رود.', 'ارزیابی زیرساخت', 'مهاجرت داده‌ها', ''),
    U('u15', 'p3', -11, 'الهام صادقی', 'green', 'مصاحبه با واحدها شروع شد.', 'مصاحبه با واحدها', 'تعریف KPIها', ''),
    U('u16', 'p5', -9, 'نگار حسینی', 'green', 'طراحی صفحات تأیید شد.', 'طراحی صفحات', 'پیاده‌سازی CMS', ''),
    U('u17', 'p5', -16, 'نگار حسینی', 'amber', 'هویت بصری دو هفته تأخیر داشت.', 'هویت بصری', 'طراحی صفحات', 'تأیید مدیریت'),
  ]

  const at = (days: number, hm: string) => `${d(days)} ${hm}`
  const Comments: Comment[] = [
    { id: 'c1', entity: 'Tasks', entity_id: 't7', author: 'حمید جعفری', body: 'تیم ERP گفتند تا پنجشنبه دسترسی تست می‌دهند. اگر نشد باید اسکالیشن کنیم.', created_at: at(-2, '10:15') },
    { id: 'c2', entity: 'Tasks', entity_id: 't7', author: DEMO_ME, body: '@دکتر کامرانی لطفاً در جلسه‌ی مدیریت پیگیری بفرمایید.', created_at: at(-1, '09:02') },
    { id: 'c3', entity: 'Tasks', entity_id: 't11', author: 'مریم احمدی', body: 'علت کرش پیدا شد؛ مربوط به SDK پرداخت است. فردا PR آماده می‌شود.', created_at: at(0, '08:40') },
    { id: 'c4', entity: 'Projects', entity_id: 'p4', author: 'دکتر کامرانی', body: 'تاریخ Cut-over را تا تأیید مالی جابه‌جا نکنید. جلسه‌ی دوشنبه تصمیم می‌گیریم.', created_at: at(-1, '17:30') },
    { id: 'c5', entity: 'FollowUps', entity_id: 'f1', author: DEMO_ME, body: 'ایمیل دوم ارسال شد.', created_at: at(-1, '11:20') },
  ]

  return { Projects, Scope, Milestones, Sprints, Tasks, FollowUps, Risks, Team, Allocations, Updates, Comments }
}

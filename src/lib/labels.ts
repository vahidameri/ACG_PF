import type { Health, Priority, ProjectStatus, TaskStatus, FollowUpStatus, Risk, Milestone, Sprint, ScopeItem, FollowUp } from './types'

export const PROJECT_STATUS: Record<ProjectStatus, string> = {
  planning: 'برنامه‌ریزی',
  active: 'در حال اجرا',
  on_hold: 'متوقف',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
}

export const PRIORITY: Record<Priority, string> = {
  critical: 'بحرانی',
  high: 'بالا',
  medium: 'متوسط',
  low: 'پایین',
}

export const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export const HEALTH: Record<Health, string> = {
  green: 'سالم',
  amber: 'نیازمند توجه',
  red: 'در خطر',
}

export const TASK_STATUS: Record<TaskStatus, string> = {
  todo: 'برای انجام',
  in_progress: 'در حال انجام',
  review: 'بازبینی',
  blocked: 'مسدود',
  done: 'انجام‌شده',
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'blocked', 'done']

export const FOLLOWUP_STATUS: Record<FollowUpStatus, string> = {
  open: 'باز',
  waiting: 'منتظر پاسخ',
  done: 'بسته‌شده',
}

export const CHANNEL: Record<FollowUp['channel'], string> = {
  meeting: 'جلسه',
  call: 'تماس',
  email: 'ایمیل',
  chat: 'پیام',
  other: 'سایر',
}

export const RISK_TYPE: Record<Risk['type'], string> = {
  risk: 'ریسک',
  issue: 'مسئله',
  dependency: 'وابستگی',
  decision: 'تصمیم',
}

export const RISK_STATUS: Record<Risk['status'], string> = {
  open: 'باز',
  mitigating: 'در حال کاهش',
  closed: 'بسته',
}

export const MILESTONE_STATUS: Record<Milestone['status'], string> = {
  pending: 'آینده',
  in_progress: 'در جریان',
  done: 'انجام‌شده',
  missed: 'از دست رفته',
}

export const SPRINT_STATUS: Record<Sprint['status'], string> = {
  planned: 'برنامه‌ریزی‌شده',
  active: 'فعال',
  closed: 'بسته‌شده',
}

export const SCOPE_STATUS: Record<ScopeItem['status'], string> = {
  planned: 'برنامه‌ریزی‌شده',
  in_progress: 'در حال انجام',
  delivered: 'تحویل‌شده',
  changed: 'تغییر یافته',
  removed: 'حذف‌شده',
}

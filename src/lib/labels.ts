import type { Health, Priority, ProjectStatus, TaskStatus, FollowUpStatus, Risk, Milestone, Sprint, ScopeItem, FollowUp } from './types'
import type { T2 } from './i18n'

export const PROJECT_STATUS: Record<ProjectStatus, T2> = {
  planning: ['برنامه‌ریزی', 'Planning'],
  active: ['در حال اجرا', 'Active'],
  on_hold: ['متوقف', 'On hold'],
  completed: ['تکمیل‌شده', 'Completed'],
  cancelled: ['لغوشده', 'Cancelled'],
}

export const PRIORITY: Record<Priority, T2> = {
  critical: ['بحرانی', 'Critical'],
  high: ['بالا', 'High'],
  medium: ['متوسط', 'Medium'],
  low: ['پایین', 'Low'],
}

export const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export const HEALTH: Record<Health, T2> = {
  green: ['سالم', 'On track'],
  amber: ['نیازمند توجه', 'At risk'],
  red: ['در خطر', 'Off track'],
}

export const TASK_STATUS: Record<TaskStatus, T2> = {
  todo: ['برای انجام', 'To do'],
  in_progress: ['در حال انجام', 'In progress'],
  review: ['بازبینی', 'In review'],
  blocked: ['مسدود', 'Blocked'],
  done: ['انجام‌شده', 'Done'],
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'blocked', 'done']

export const FOLLOWUP_STATUS: Record<FollowUpStatus, T2> = {
  open: ['باز', 'Open'],
  waiting: ['منتظر پاسخ', 'Waiting'],
  done: ['بسته‌شده', 'Closed'],
}

export const CHANNEL: Record<FollowUp['channel'], T2> = {
  meeting: ['جلسه', 'Meeting'],
  call: ['تماس', 'Call'],
  email: ['ایمیل', 'Email'],
  chat: ['پیام', 'Message'],
  other: ['سایر', 'Other'],
}

export const RISK_TYPE: Record<Risk['type'], T2> = {
  risk: ['ریسک', 'Risk'],
  issue: ['مسئله', 'Issue'],
  dependency: ['وابستگی', 'Dependency'],
  decision: ['تصمیم', 'Decision'],
}

export const RISK_STATUS: Record<Risk['status'], T2> = {
  open: ['باز', 'Open'],
  mitigating: ['در حال کاهش', 'Mitigating'],
  closed: ['بسته', 'Closed'],
}

export const MILESTONE_STATUS: Record<Milestone['status'], T2> = {
  pending: ['آینده', 'Upcoming'],
  in_progress: ['در جریان', 'In progress'],
  done: ['انجام‌شده', 'Done'],
  missed: ['از دست رفته', 'Missed'],
}

export const SPRINT_STATUS: Record<Sprint['status'], T2> = {
  planned: ['برنامه‌ریزی‌شده', 'Planned'],
  active: ['فعال', 'Active'],
  closed: ['بسته‌شده', 'Closed'],
}

export const SCOPE_STATUS: Record<ScopeItem['status'], T2> = {
  planned: ['برنامه‌ریزی‌شده', 'Planned'],
  in_progress: ['در حال انجام', 'In progress'],
  delivered: ['تحویل‌شده', 'Delivered'],
  changed: ['تغییر یافته', 'Changed'],
  removed: ['حذف‌شده', 'Removed'],
}

export const ROLE: Record<string, T2> = {
  admin: ['مدیر سیستم', 'Admin'],
  editor: ['ویرایشگر', 'Editor'],
  viewer: ['فقط مشاهده', 'Viewer'],
}

/** Bilingual label maps as option lists for selects. */
export const options = (map: Record<string, T2>, lang: 'fa' | 'en') => Object.entries(map).map(([value, l]) => ({ value, label: lang === 'fa' ? l[0] : l[1] }))

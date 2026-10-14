// Task rules, set by the program manager in the back office (Config tab, keys task.*).
import { addDays, todayISO } from './jalali'

export const TASK_KEYS = {
  defaultDue: 'task.default_due', // '' | days from today, for everyone
  flexDefaultDue: 'task.flex_default_due', // same, for people allowed to skip the deadline
  dueRequired: 'task.due_required', // on by default; '0' = deadline optional for everyone
  projectRequired: 'task.project_required', // '1' = a project is required (except the people below)
  noDue: 'task.no_due_people', // member ids who may leave the deadline empty
  personal: 'task.personal_people', // member ids who may log personal (no-project) tasks
} as const

interface Person { id: string; access?: string }
export interface TaskCfg { defaultDue: string; flexDefaultDue: string; dueRequired: boolean; projectRequired: boolean; noDue: string[]; personal: string[] }

let cfg: TaskCfg = { defaultDue: '0', flexDefaultDue: '', dueRequired: true, projectRequired: false, noDue: [], personal: [] }
export const taskCfg = () => cfg

/** Reads the rules; the people lists default to the CEO (exec). */
export function readTaskCfg(get: (k: string) => string | undefined, team: Person[]): TaskCfg {
  const ceo = team.filter((m) => m.access === 'exec').map((m) => m.id)
  const list = (k: string) => {
    const v = get(k)
    return v === undefined ? ceo : v.split(',').map((x) => x.trim()).filter(Boolean)
  }
  return {
    defaultDue: get(TASK_KEYS.defaultDue) ?? '0',
    flexDefaultDue: get(TASK_KEYS.flexDefaultDue) ?? '',
    dueRequired: get(TASK_KEYS.dueRequired) !== '0',
    projectRequired: get(TASK_KEYS.projectRequired) === '1',
    noDue: list(TASK_KEYS.noDue),
    personal: list(TASK_KEYS.personal),
  }
}
export const setTaskCfg = (c: TaskCfg) => (cfg = c)

export const canSkipDue = (m?: Person) => !!m && cfg.noDue.includes(m.id)
export const canPersonal = (m?: Person) => !!m && cfg.personal.includes(m.id)
export const needsDue = (m?: Person) => cfg.dueRequired && !canSkipDue(m)
export const needsProject = (m?: Person) => cfg.projectRequired && !canPersonal(m)
/** Default deadline offset in days for this person ('' = none). */
export const dueDaysFor = (m?: Person) => (canSkipDue(m) ? cfg.flexDefaultDue : cfg.defaultDue || '0')
export const dueFor = (m?: Person) => {
  const d = dueDaysFor(m)
  return d === '' ? '' : addDays(todayISO(), Number(d) || 0)
}

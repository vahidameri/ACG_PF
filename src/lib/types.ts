// Each type maps 1:1 to a tab in the Google Sheet. Column names = field names.

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Health = 'green' | 'amber' | 'red'

export interface Project {
  id: string
  code: string
  name: string
  description: string
  category: string
  owner: string
  sponsor: string
  status: ProjectStatus
  priority: Priority
  phase: string
  start_date: string
  end_date: string
  budget: number
  spent: number
  progress: number // 0..100 (manual). If empty, computed from milestones.
  health_override: Health | ''
  objective: string
}

export interface ScopeItem {
  id: string
  project_id: string
  item: string
  type: 'in' | 'out'
  status: 'planned' | 'in_progress' | 'delivered' | 'changed' | 'removed'
  change_note: string
  date: string
}

export interface Milestone {
  id: string
  project_id: string
  title: string
  planned_date: string
  actual_date: string
  status: 'pending' | 'in_progress' | 'done' | 'missed'
  owner: string
  weight: number
}

export interface Sprint {
  id: string
  project_id: string
  name: string
  start_date: string
  end_date: string
  goal: string
  committed_points: number
  completed_points: number
  status: 'planned' | 'active' | 'closed'
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'

export interface Task {
  id: string
  project_id: string
  sprint_id: string
  title: string
  description: string
  assignee: string
  reporter: string
  status: TaskStatus
  priority: Priority
  due_date: string
  points: number
  tags: string
  created_at: string
  completed_at: string
}

export type FollowUpStatus = 'open' | 'waiting' | 'done'

export interface FollowUp {
  id: string
  project_id: string
  subject: string
  person: string
  channel: 'meeting' | 'call' | 'email' | 'chat' | 'other'
  due_date: string
  status: FollowUpStatus
  priority: Priority
  notes: string
  created_at: string
  done_at: string
}

export interface Risk {
  id: string
  project_id: string
  title: string
  type: 'risk' | 'issue' | 'dependency' | 'decision'
  probability: number // 1..5
  impact: number // 1..5
  owner: string
  mitigation: string
  status: 'open' | 'mitigating' | 'closed'
  due_date: string
}

export interface Member {
  id: string
  name: string
  role: string
  email: string
  team: string
}

export interface Allocation {
  id: string
  member_id: string
  project_id: string
  percent: number
}

export interface Update {
  id: string
  project_id: string
  week_date: string
  author: string
  health: Health
  summary: string
  done: string
  next: string
  blockers: string
}

export interface DB {
  Projects: Project[]
  Scope: ScopeItem[]
  Milestones: Milestone[]
  Sprints: Sprint[]
  Tasks: Task[]
  FollowUps: FollowUp[]
  Risks: Risk[]
  Team: Member[]
  Allocations: Allocation[]
  Updates: Update[]
}

export type SheetName = keyof DB
export type Row<S extends SheetName> = DB[S][number]

export type Role = 'admin' | 'editor' | 'viewer'

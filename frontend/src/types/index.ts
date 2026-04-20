export type Role = string

export interface User {
  id: number
  email: string
  full_name: string
  role_id: number
  role_name: Role
  is_active: number
  created_at: string
  permissions?: string[]
}

export interface Project {
  id: number
  name: string
  description: string | null
  status: string
  owner_id: number
  owner_name: string
  created_at: string
  updated_at: string
}

export interface Sprint {
  id: number
  project_id: number
  name: string
  goal: string | null
  status: 'planned' | 'active' | 'completed'
  start_date: string | null
  end_date: string | null
  task_count?: number
  done_count?: number
}

export type ReqType = 'functional' | 'non_functional' | 'business' | 'constraint'
export type ReqPriority = 'critical' | 'high' | 'medium' | 'low'
export type ReqStatus = 'draft' | 'review' | 'approved' | 'implemented' | 'verified' | 'rejected'

export interface Requirement {
  id: number
  project_id: number
  code: string
  title: string
  description: string | null
  type: ReqType
  priority: ReqPriority
  status: ReqStatus
  version: number
  author_id: number
  author_name: string
  assignee_id: number | null
  assignee_name: string | null
  sprint_id: number | null
  sprint_name: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'

export interface Task {
  id: number
  project_id: number
  sprint_id: number | null
  sprint_name: string | null
  requirement_id: number | null
  title: string
  description: string | null
  type: 'task' | 'story' | 'subtask'
  status: TaskStatus
  priority: ReqPriority
  estimate_h: number | null
  spent_h: number
  assignee_id: number | null
  assignee_name: string | null
  reporter_id: number
  reporter_name: string
  created_at: string
  updated_at: string
}

export type BugSeverity = 'blocker' | 'critical' | 'major' | 'normal' | 'minor' | 'trivial'
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix'

export interface Bug {
  id: number
  project_id: number
  sprint_id: number | null
  task_id: number | null
  requirement_id: number | null
  title: string
  description: string | null
  steps_to_repro: string | null
  severity: BugSeverity
  priority: ReqPriority
  status: BugStatus
  assignee_id: number | null
  assignee_name: string | null
  reporter_id: number
  reporter_name: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: number
  project_id: number | null
  title: string
  content: string
  type: string
  version: number
  author_id: number
  author_name: string
  updated_by: number | null
  updated_by_name: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  entity_type: string
  entity_id: number
  author_id: number
  author_name: string
  body: string
  created_at: string
}

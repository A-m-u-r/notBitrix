export type Role = string

export interface User {
  id: number
  email: string
  full_name: string
  role_id: number
  role_name: Role
  is_active: number
  created_at: string
  updated_at: string
  permissions?: string[]
}

export interface Project {
  id: number
  name: string
  description: string | null
  status: string
  owner_id: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Sprint {
  id: number
  project_id: number
  name: string
  goal: string | null
  status: 'planned' | 'active' | 'completed'
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface Requirement {
  id: number
  project_id: number
  code: string
  title: string
  description: string | null
  type: 'functional' | 'non_functional' | 'business' | 'constraint'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'draft' | 'review' | 'approved' | 'implemented' | 'verified' | 'rejected'
  version: number
  author_id: number
  assignee_id: number | null
  sprint_id: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Task {
  id: number
  project_id: number
  sprint_id: number | null
  requirement_id: number | null
  title: string
  description: string | null
  type: 'task' | 'story' | 'subtask'
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimate_h: number | null
  spent_h: number
  assignee_id: number | null
  reporter_id: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Bug {
  id: number
  project_id: number
  sprint_id: number | null
  task_id: number | null
  requirement_id: number | null
  title: string
  description: string | null
  steps_to_repro: string | null
  severity: 'blocker' | 'critical' | 'major' | 'normal' | 'minor' | 'trivial'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix'
  assignee_id: number | null
  reporter_id: number
  resolved_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Document {
  id: number
  project_id: number | null
  title: string
  content: string
  type: 'general' | 'spec' | 'design' | 'test_plan' | 'meeting_notes'
  version: number
  author_id: number
  updated_by: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Comment {
  id: number
  entity_type: 'task' | 'bug' | 'requirement'
  entity_id: number
  author_id: number
  body: string
  created_at: string
  updated_at: string
}

export interface ApiError {
  message: string
  code?: string
}

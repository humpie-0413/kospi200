export interface FreshnessInfo {
  max_date: string | null
  count: number
}

export interface FreshnessResponse {
  ranking_long: FreshnessInfo
  ranking_short: FreshnessInfo
}

export interface PipelineStep {
  index: number
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface PipelineStatus {
  is_running: boolean
  current_action: string | null
  started_at: string | null
  last_completed_at: string | null
  last_status: string | null
  last_message: string | null
  current_step: number
  total_steps: number
  steps: PipelineStep[]
}

export interface PipelineLogEntry {
  id: number
  action: string
  status: string
  started_at: string
  finished_at: string | null
  message: string | null
  triggered_by: string
}

export type PipelineAction = 'daily' | 'collect' | 'predict' | 'run-all'

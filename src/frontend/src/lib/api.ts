import type { RankingsResponse, TimelineResponse, RankingItem } from '@/types/ranking'
import type { MetricsResponse, EquityCurveResponse, StrategySummary } from '@/types/backtest'
import type { FreshnessResponse, PipelineStatus, PipelineLogEntry, PipelineAction } from '@/types/admin'
import type { TokenResponse } from '@/types/auth'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('auth_user')
    }
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${detail}`)
  }
  return res.json()
}

export const api = {
  rankings: {
    list: (params: { date?: string; horizon?: string; page?: number; page_size?: number }) => {
      const sp = new URLSearchParams()
      if (params.date) sp.set('target_date', params.date)
      if (params.horizon) sp.set('horizon', params.horizon)
      if (params.page) sp.set('page', String(params.page))
      if (params.page_size) sp.set('page_size', String(params.page_size))
      return request<RankingsResponse>(`/rankings?${sp}`)
    },
    dates: (limit = 30) =>
      request<string[]>(`/rankings/dates?limit=${limit}`),
    timeline: (ticker: string, horizon = 'long_term', days = 30) =>
      request<TimelineResponse>(`/rankings/timeline/${ticker}?horizon=${horizon}&days=${days}`),
    history: (params: { strategy?: string; ticker?: string; page_size?: number }) => {
      const sp = new URLSearchParams()
      if (params.strategy) sp.set('strategy', params.strategy)
      if (params.ticker) sp.set('ticker', params.ticker)
      if (params.page_size) sp.set('page_size', String(params.page_size))
      return request<{ items: RankingItem[]; total: number }>(`/rankings/history?${sp}`)
    },
    price: (ticker: string) =>
      request<{ close: number; prev_close: number; change: number; change_pct: number; volume: number }>(
        `/rankings/${ticker}/price`
      ),
  },

  backtest: {
    metrics: (strategy: string) =>
      request<MetricsResponse>(`/backtest/metrics?strategy=${strategy}`),
    equityCurve: (strategy: string, phase?: string) => {
      const sp = new URLSearchParams({ strategy })
      if (phase) sp.set('phase', phase)
      return request<EquityCurveResponse>(`/backtest/equity-curve?${sp}`)
    },
    summary: () =>
      request<StrategySummary[]>('/backtest/summary'),
  },

  auth: {
    login: (username: string, password: string) =>
      request<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    refresh: (refreshToken: string) =>
      request<TokenResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
  },

  ai: {
    analysis: (ticker: string, horizon = 'long_term') =>
      request<{ ticker: string; name: string; horizon: string; analysis: string; provider: string }>(
        `/ai/analysis/${ticker}?horizon=${horizon}`
      ),
  },

  admin: {
    freshness: () =>
      request<FreshnessResponse>('/admin/freshness'),
    pipelineStatus: () =>
      request<PipelineStatus>('/admin/pipeline/status'),
    pipelineLogs: (limit = 10) =>
      request<PipelineLogEntry[]>(`/admin/pipeline/logs?limit=${limit}`),
    triggerPipeline: (action: PipelineAction) =>
      request<{ status: string; action: string }>(`/admin/pipeline/${action}`, {
        method: 'POST',
      }),
  },
}

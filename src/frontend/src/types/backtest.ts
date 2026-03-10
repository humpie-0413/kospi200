export interface BacktestMetric {
  phase: string
  top_k: number
  holding_days: number
  cost_bps: number
  gross_total_return: number
  net_total_return: number
  gross_cagr: number
  net_cagr: number
  gross_sharpe: number
  net_sharpe: number
  gross_mdd: number
  net_mdd: number
  gross_hit_ratio: number
  net_hit_ratio: number
  avg_turnover_oneway: number
  ic: number
  rank_ic: number
  gross_calmar_ratio: number
  net_calmar_ratio: number
  date_start: string
  date_end: string
}

export interface MetricsResponse {
  strategy: string
  metrics: BacktestMetric[]
}

export interface EquityPoint {
  date: string
  equity: number
  drawdown: number
}

export interface BenchmarkPoint {
  date: string
  equity: number
  drawdown: number | null
}

export interface EquityCurveResponse {
  strategy: string
  phase: string
  data: EquityPoint[]
  benchmark: BenchmarkPoint[]
}

export interface StrategySummary extends Record<string, unknown> {
  strategy: string
  phase: string
  gross_cagr: number
  net_cagr: number
  gross_sharpe: number
  net_sharpe: number
  gross_mdd: number
  net_mdd: number
  ic: number
  rank_ic: number
}

export const STRATEGY_LABELS: Record<string, string> = {
  bt120_long: '장기 매수',
  bt120_ens: '장기 AI 앙상블',
  bt20_short: '단기 매도',
  bt20_ens: '단기 AI 앙상블',
}

export const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  bt120_long: '상위 10종목을 사서 6개월 보유',
  bt120_ens: '4개 AI 모델의 평균 판단 (장기)',
  bt20_short: '하위 10종목을 매도하여 한 달 보유',
  bt20_ens: '4개 AI 모델의 평균 판단 (단기)',
}

export const VALID_STRATEGIES = ['bt120_long', 'bt120_ens', 'bt20_short', 'bt20_ens'] as const
export type Strategy = (typeof VALID_STRATEGIES)[number]

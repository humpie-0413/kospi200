export interface RankingItem {
  date: string
  ticker: string
  name: string
  score_total: number
  rank_total: number
  top_feature_1: string
  contrib_1: number
  percentile_1: number
  top_feature_2: string
  contrib_2: number
  percentile_2: number
  top_feature_3: string
  contrib_3: number
  percentile_3: number
  cat_momentum: number
  cat_risk: number
  cat_profitability: number
  cat_value: number
  cat_liquidity: number
  cat_sentiment: number
  cat_esg: number
}

export interface RankingsResponse {
  date: string
  horizon: string
  total: number
  page: number
  page_size: number
  items: RankingItem[]
}

export interface TimelinePoint {
  date: string
  score: number
  rank: number
  total: number
}

export interface TimelineResponse {
  ticker: string
  name: string
  horizon: string
  timeline: TimelinePoint[]
}

export type Horizon = 'long_term' | 'short_term'

export type CategoryKey = 'momentum' | 'risk' | 'profitability' | 'value' | 'liquidity' | 'sentiment' | 'esg'

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  momentum: '모멘텀',
  risk: '리스크',
  profitability: '수익성',
  value: '가치',
  liquidity: '유동성',
  sentiment: '감성',
  esg: 'ESG',
}

export const CATEGORY_COLORS: Record<CategoryKey, { bg: string; text: string }> = {
  momentum: { bg: 'bg-blue-500/12', text: 'text-blue-600 dark:text-blue-400' },
  risk: { bg: 'bg-red-500/12', text: 'text-red-600 dark:text-red-400' },
  profitability: { bg: 'bg-green-500/12', text: 'text-green-600 dark:text-green-400' },
  value: { bg: 'bg-orange-500/12', text: 'text-orange-600 dark:text-orange-400' },
  liquidity: { bg: 'bg-teal-500/12', text: 'text-teal-600 dark:text-teal-400' },
  sentiment: { bg: 'bg-purple-500/12', text: 'text-purple-600 dark:text-purple-400' },
  esg: { bg: 'bg-gray-500/12', text: 'text-gray-600 dark:text-gray-400' },
}

export const FEATURE_INFO: Record<string, { label: string; category: CategoryKey }> = {
  momentum_3m: { label: '3개월 모멘텀', category: 'momentum' },
  momentum_6m: { label: '6개월 모멘텀', category: 'momentum' },
  price_momentum: { label: '가격 모멘텀', category: 'momentum' },
  return_1m: { label: '1개월 수익률', category: 'momentum' },
  return_3m: { label: '3개월 수익률', category: 'momentum' },
  return_6m: { label: '6개월 수익률', category: 'momentum' },
  RSI_14: { label: 'RSI(14)', category: 'momentum' },
  bollinger_pctb: { label: '볼린저 %B', category: 'momentum' },
  volatility_60d: { label: '60일 변동성', category: 'risk' },
  max_drawdown_60d: { label: '60일 최대낙폭', category: 'risk' },
  beta_kospi: { label: 'KOSPI 베타', category: 'risk' },
  roe: { label: 'ROE', category: 'profitability' },
  net_income: { label: '순이익', category: 'profitability' },
  equity: { label: '자기자본', category: 'value' },
  debt_ratio: { label: '부채비율', category: 'value' },
  total_liabilities: { label: '총부채', category: 'value' },
  volume_ratio: { label: '거래량 비율', category: 'liquidity' },
  turnover: { label: '회전율', category: 'liquidity' },
  avg_volume_20d: { label: '20일 평균거래량', category: 'liquidity' },
  news_sentiment: { label: '뉴스 감성', category: 'sentiment' },
  news_volume: { label: '뉴스 건수', category: 'sentiment' },
  news_pos_ratio: { label: '긍정 비율', category: 'sentiment' },
  news_neg_ratio: { label: '부정 비율', category: 'sentiment' },
  sentiment_momentum: { label: '감성 모멘텀', category: 'sentiment' },
  sentiment_volatility: { label: '감성 변동성', category: 'sentiment' },
  esg_score: { label: 'ESG 점수', category: 'esg' },
  esg_env: { label: '환경(E)', category: 'esg' },
  esg_soc: { label: '사회(S)', category: 'esg' },
  esg_gov: { label: '지배구조(G)', category: 'esg' },
}

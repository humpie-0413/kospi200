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

export const CATEGORY_KEYS: CategoryKey[] = [
  'momentum', 'risk', 'profitability', 'value', 'liquidity', 'sentiment', 'esg',
]

export const CATEGORY_ICONS: Record<CategoryKey, string> = {
  momentum: '🚀',
  risk: '🛡️',
  profitability: '💰',
  value: '💎',
  liquidity: '🔄',
  sentiment: '📰',
  esg: '🌱',
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  momentum: '상승세',
  risk: '안전도',
  profitability: '수익성',
  value: '가치',
  liquidity: '거래활발도',
  sentiment: '시장반응',
  esg: '사회책임',
}

export const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  momentum: '최근 주가가 오르는 힘',
  risk: '주가가 얼마나 안정적인지',
  profitability: '회사가 돈을 잘 버는지',
  value: '주가가 실제 가치 대비 싼지',
  liquidity: '사고팔기 얼마나 쉬운지',
  sentiment: '뉴스/여론이 긍정적인지',
  esg: '환경/사회/투명경영 점수',
}

// FeatureTag에서 사용하는 카테고리별 고유색
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

// 점수 기반 색상 (눈 편한 톤: sky / slate / rose)
export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-sky-600 dark:text-sky-400'
  if (score >= 40) return 'text-slate-500 dark:text-slate-400'
  return 'text-rose-500 dark:text-rose-400'
}

export function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-sky-500/12'
  if (score >= 40) return 'bg-slate-500/10'
  return 'bg-rose-500/12'
}

export function getScoreBarColor(score: number): string {
  if (score >= 70) return 'bg-sky-500'
  if (score >= 40) return 'bg-slate-400'
  return 'bg-rose-400'
}

// 순위 → 등급 라벨
export function getRankLabel(rank: number): { text: string; className: string } {
  if (rank <= 10) return { text: '매우 좋음', className: 'text-sky-700 dark:text-sky-400 bg-sky-500/12' }
  if (rank <= 50) return { text: '좋음', className: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/12' }
  if (rank <= 150) return { text: '보통', className: 'text-slate-600 dark:text-slate-400 bg-slate-500/10' }
  return { text: '나쁨', className: 'text-rose-500 dark:text-rose-400 bg-rose-500/12' }
}

// 순위 → 100점 만점 점수
export function rankToScore(rank: number, total: number = 200): number {
  return Math.round((1 - (rank - 1) / Math.max(total - 1, 1)) * 100)
}

// 한글 조사 처리
function particle(word: string, consonant: string, vowel: string): string {
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xAC00 || last > 0xD7A3) return consonant
  return (last - 0xAC00) % 28 !== 0 ? consonant : vowel
}

// 한줄 요약 생성
export function generateSummary(item: RankingItem): string {
  const f1 = FEATURE_INFO[item.top_feature_1]
  const f2 = FEATURE_INFO[item.top_feature_2]
  if (!f1) return ''
  const c1 = CATEGORY_LABELS[f1.category]
  if (f2 && f2.category !== f1.category) {
    const c2 = CATEGORY_LABELS[f2.category]
    return `${c1}${particle(c1, '과', '와')} ${c2}${particle(c2, '이', '가')} 강한 종목`
  }
  return `${c1}${particle(c1, '이', '가')} 특히 강한 종목`
}

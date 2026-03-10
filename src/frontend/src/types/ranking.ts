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
  momentum_3m: { label: '3개월 상승률', category: 'momentum' },
  momentum_6m: { label: '6개월 상승률', category: 'momentum' },
  price_momentum: { label: '가격 상승추세', category: 'momentum' },
  return_1m: { label: '1개월 수익률', category: 'momentum' },
  return_3m: { label: '3개월 수익률', category: 'momentum' },
  return_6m: { label: '6개월 수익률', category: 'momentum' },
  RSI_14: { label: 'RSI (과매수/과매도)', category: 'momentum' },
  bollinger_pctb: { label: '볼린저밴드 위치', category: 'momentum' },
  volatility_60d: { label: '60일 변동성', category: 'risk' },
  max_drawdown_60d: { label: '60일 최대낙폭', category: 'risk' },
  beta_kospi: { label: '시장 민감도(베타)', category: 'risk' },
  roe: { label: '자기자본수익률(ROE)', category: 'profitability' },
  net_income: { label: '순이익', category: 'profitability' },
  equity: { label: '자기자본', category: 'value' },
  debt_ratio: { label: '부채비율', category: 'value' },
  total_liabilities: { label: '총부채', category: 'value' },
  volume_ratio: { label: '거래량 비율', category: 'liquidity' },
  turnover: { label: '회전율', category: 'liquidity' },
  avg_volume_20d: { label: '20일 평균 거래량', category: 'liquidity' },
  news_sentiment: { label: '뉴스 감성도', category: 'sentiment' },
  news_volume: { label: '뉴스 건수', category: 'sentiment' },
  news_pos_ratio: { label: '긍정 뉴스 비율', category: 'sentiment' },
  news_neg_ratio: { label: '부정 뉴스 비율', category: 'sentiment' },
  sentiment_momentum: { label: '감성 추세', category: 'sentiment' },
  sentiment_volatility: { label: '감성 변동성', category: 'sentiment' },
  esg_score: { label: 'ESG 종합', category: 'esg' },
  esg_env: { label: '환경(E) 점수', category: 'esg' },
  esg_soc: { label: '사회(S) 점수', category: 'esg' },
  esg_gov: { label: '지배구조(G) 점수', category: 'esg' },
}

// 피처별 초보자 설명 (S1-fix)
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  momentum_3m: '최근 3개월간 주가가 얼마나 올랐는지',
  momentum_6m: '최근 6개월간 주가 상승 정도',
  price_momentum: '최근 주가 상승 추세의 강도',
  return_1m: '지난 한 달간 수익률',
  return_3m: '지난 3개월간 수익률',
  return_6m: '지난 6개월간 수익률',
  RSI_14: '주가가 너무 올랐는지(70이상) 너무 빠졌는지(30이하) 판단 지표',
  bollinger_pctb: '주가가 정상 범위 내에 있는지 (0~1 사이가 정상)',
  volatility_60d: '최근 2개월간 주가가 얼마나 출렁였는지 (낮을수록 안정)',
  max_drawdown_60d: '최근 2개월 내 최고점에서 최저점까지 하락폭',
  beta_kospi: '코스피가 1% 오를 때 이 종목이 몇 % 오르는지',
  roe: '회사가 주주 돈으로 얼마나 벌었는지 (높을수록 좋음)',
  net_income: '회사의 최종 이익 (세금, 비용 다 뺀 후)',
  equity: '회사의 순자산 (자산 - 부채)',
  debt_ratio: '빚이 자본 대비 얼마나 되는지 (낮을수록 안전)',
  total_liabilities: '회사가 갚아야 할 전체 빚',
  volume_ratio: '평소 대비 오늘 거래가 얼마나 활발한지',
  turnover: '발행 주식 대비 거래되는 비율',
  avg_volume_20d: '최근 한 달간 하루 평균 거래량',
  news_sentiment: '최근 뉴스가 긍정적인지 부정적인지 (-1~+1)',
  news_volume: '최근 관련 뉴스가 얼마나 많은지',
  news_pos_ratio: '전체 뉴스 중 긍정적인 뉴스의 비율',
  news_neg_ratio: '전체 뉴스 중 부정적인 뉴스의 비율',
  sentiment_momentum: '뉴스 분위기가 최근 좋아지고 있는지 나빠지고 있는지',
  sentiment_volatility: '뉴스 분위기가 얼마나 급변하는지',
  esg_score: '환경/사회/지배구조 종합 점수',
  esg_env: '환경 보호 노력 (탄소배출, 재생에너지 등)',
  esg_soc: '사회적 책임 (노동환경, 지역사회 기여 등)',
  esg_gov: '경영 투명성 (이사회 독립성, 주주 권리 등)',
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

// 순위 해석 텍스트 (P1-1)
export function getRankInterpretation(rank: number): { text: string; className: string } {
  if (rank <= 10) return { text: '상위 5%', className: 'text-sky-600 dark:text-sky-400' }
  if (rank <= 50) return { text: '상위 25%', className: 'text-indigo-600 dark:text-indigo-400' }
  if (rank <= 150) return { text: '중간', className: 'text-slate-500 dark:text-slate-400' }
  return { text: '하위 25%', className: 'text-rose-500 dark:text-rose-400' }
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

// 한줄 요약 생성 (P1-3 강화: 점수+백분위 포함)
export function generateSummary(item: RankingItem): string {
  const f1 = FEATURE_INFO[item.top_feature_1]
  const f2 = FEATURE_INFO[item.top_feature_2]
  if (!f1) return ''
  const c1 = CATEGORY_LABELS[f1.category]
  const c1Score = Math.round((item[`cat_${f1.category}` as keyof RankingItem] as number) ?? 0)
  if (f2 && f2.category !== f1.category) {
    const c2 = CATEGORY_LABELS[f2.category]
    const c2Score = Math.round((item[`cat_${f2.category}` as keyof RankingItem] as number) ?? 0)
    const topPct = Math.max(1, Math.round(100 - Math.max(c1Score, c2Score)))
    return `${c1}(${c1Score})${particle(c1, '과', '와')} ${c2}(${c2Score})${particle(c2, '이', '가')} 강점 · 상위 ${topPct}%`
  }
  const topPct = Math.max(1, Math.round(100 - c1Score))
  return `${c1}(${c1Score})${particle(c1, '이', '가')} 특히 강점 · 상위 ${topPct}%`
}

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Trophy, Star, Lightbulb, BarChart3, Shield, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { SimpleBacktestData } from '@/types/backtest'

const PERIOD_PRESETS = [
  { key: 'all', label: '전체' },
  { key: '5y', label: '5년' },
  { key: '3y', label: '3년' },
  { key: '1y', label: '1년' },
] as const

function formatWon(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만`
  return v.toLocaleString()
}

function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </span>
  )
}

function ratingLabel(pct: number, thresholds: [number, number], labels: [string, string, string]) {
  if (pct > thresholds[0]) return { text: labels[0], color: 'text-emerald-600', icon: '✅' }
  if (pct > thresholds[1]) return { text: labels[1], color: 'text-amber-600', icon: '⚠️' }
  return { text: labels[2], color: 'text-red-500', icon: '❌' }
}

export function SimpleBacktest() {
  const [data, setData] = useState<SimpleBacktestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    api.backtest
      .simple()
      .then((res) => {
        setData(res)
        setError(false)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // 기간별 에쿼티 커브 슬라이스
  const chartData = useMemo(() => {
    if (!data) return []
    const curve = data.equity_curve
    const days: Record<string, number> = { '1y': 252, '3y': 756, '5y': 1260 }
    const d = days[period]
    if (!d || d >= curve.length) return curve
    return curve.slice(curve.length - d)
  }, [data, period])

  // 기간별 자동 코멘트
  const periodComment = useMemo(() => {
    if (!data) return ''
    const pr = data.period_returns
    const labels: Record<string, string> = { '1y': '최근 1년', '3y': '최근 3년', '5y': '최근 5년', all: '전체 기간' }
    let best = 'all'
    let bestDiff = -Infinity
    for (const k of ['1y', '3y', '5y', 'all'] as const) {
      const r = pr[k]
      if (r) {
        const diff = r.ai - r.benchmark
        if (diff > bestDiff) { bestDiff = diff; best = k }
      }
    }
    if (best === period) return `${labels[period]}은 코스피 대비 ${bestDiff > 0 ? '+' : ''}${bestDiff.toFixed(1)}%p 초과 수익이에요`
    return `${labels[best]}의 초과 수익(+${bestDiff.toFixed(1)}%p)이 가장 좋았어요`
  }, [data, period])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          <button
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            다시 시도
          </button>
        </CardContent>
      </Card>
    )
  }

  const returnRating = ratingLabel(data.total_return_pct, [30, 0], ['좋은 성과', '보통', '손실'])
  const mddRating = ratingLabel(-Math.abs(data.max_loss_pct), [-10, -20], ['낮은 위험', '중간 위험', '높은 위험'])
  const vsRating = ratingLabel(data.vs_benchmark_pct, [10, 0], ['시장 초과', '비슷한 수준', '시장 미달'])

  // 차트 시작/끝 값
  const chartStart = chartData[0]
  const chartEnd = chartData[chartData.length - 1]
  const startYear = chartStart?.date?.slice(0, 4)
  const periodAi = chartEnd && chartStart ? chartEnd.ai_value - chartStart.ai_value : 0
  const periodBm = chartEnd && chartStart ? chartEnd.benchmark_value - chartStart.benchmark_value : 0

  return (
    <div className="space-y-6">
      {/* 상단 한줄 요약 */}
      <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
        <p className="text-sm leading-relaxed">
          {startYear}년에 <strong className="text-foreground">100만원</strong>을 넣었다면,{' '}
          AI 추천은 <strong className="text-red-500">₩{data.final_amount.toLocaleString()}</strong>,{' '}
          코스피는 <strong className="text-muted-foreground">₩{(data.initial_amount + Math.round(data.initial_amount * data.benchmark_return_pct / 100)).toLocaleString()}</strong>이 됐어요
        </p>
      </div>

      {/* 3개 핵심 카드 (설계 3) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* 총 수익률 */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">총 수익률</span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${data.total_return_pct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
              {data.total_return_pct >= 0 ? '+' : ''}{data.total_return_pct}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              100만원 → {formatWon(data.final_amount)}원
            </p>
            <p className={`mt-2 text-xs font-medium ${returnRating.color}`}>
              {returnRating.icon} {returnRating.text}
            </p>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5 bg-red-500" />
          </CardContent>
        </Card>

        {/* 최대 손실 */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">최대 손실</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-blue-500">
              {data.max_loss_pct}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              가장 빠졌을 때 {Math.abs(data.max_loss_pct)}% 손실
            </p>
            <p className={`mt-2 text-xs font-medium ${mddRating.color}`}>
              {mddRating.icon} {mddRating.text}
            </p>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(Math.abs(data.max_loss_pct) * 2, 100)}%` }}
              />
            </div>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5 bg-blue-500" />
          </CardContent>
        </Card>

        {/* 코스피 대비 */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">코스피 대비</span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${data.vs_benchmark_pct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
              {data.vs_benchmark_pct >= 0 ? '+' : ''}{data.vs_benchmark_pct}%p
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              코스피보다 {Math.abs(data.vs_benchmark_pct)}%p {data.vs_benchmark_pct >= 0 ? '더 벌었어요' : '덜 벌었어요'}
            </p>
            <p className={`mt-2 text-xs font-medium ${vsRating.color}`}>
              {vsRating.icon} {vsRating.text}
            </p>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5 bg-amber-500" />
          </CardContent>
        </Card>
      </div>

      {/* 설계 2: 100만원 투자 시뮬레이션 차트 */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">100만원 투자 시뮬레이션</h3>
            <div className="flex gap-1.5">
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    period === p.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 기간 코멘트 (설계 7) */}
          <p className="text-xs text-muted-foreground mb-4">{periodComment}</p>

          {/* 차트 */}
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3182F6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3182F6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(v: string) => v.slice(0, 4)}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                width={65}
                tickFormatter={(v: number) => `₩${formatWon(v)}`}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  `₩${Number(value).toLocaleString()}`,
                  name === 'ai_value' ? 'AI 추천' : '코스피',
                ]}
                labelFormatter={(label) => String(label)}
              />
              <Legend formatter={(v) => (v === 'ai_value' ? 'AI 추천' : '코스피')} />
              <Area
                type="monotone"
                dataKey="ai_value"
                stroke="#3182F6"
                strokeWidth={2}
                fill="url(#aiGrad)"
                dot={false}
                name="ai_value"
              />
              <Area
                type="monotone"
                dataKey="benchmark_value"
                stroke="#8B95A1"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="none"
                dot={false}
                name="benchmark_value"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* 수익 요약 바 */}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span>
              <span className="inline-block w-3 h-3 rounded-full bg-[#3182F6] mr-1.5" />
              AI{' '}
              <span className={periodAi >= 0 ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>
                {periodAi >= 0 ? '+' : ''}₩{periodAi.toLocaleString()}
              </span>
            </span>
            <span>
              <span className="inline-block w-3 h-3 rounded-full bg-[#8B95A1] mr-1.5" />
              코스피{' '}
              <span className={periodBm >= 0 ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>
                {periodBm >= 0 ? '+' : ''}₩{periodBm.toLocaleString()}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 설계 4: AI 성적표 */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            AI 성적표
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">연평균 수익률</p>
              <p className={`text-xl font-bold tabular-nums ${data.annual_return_pct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {data.annual_return_pct >= 0 ? '+' : ''}{data.annual_return_pct}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">매년 평균 이만큼 벌었어요</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">위험 대비 효율</p>
              <Stars count={data.risk_efficiency_stars} />
              <p className="text-sm font-semibold mt-1">Sharpe {data.sharpe}</p>
              <p className="text-[11px] text-muted-foreground mt-1">위험 감수 대비 수익이에요</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">AI 정확도</p>
              <Stars count={data.ai_accuracy_stars} />
              <p className="text-sm font-semibold mt-1">IC {data.ic}</p>
              <p className="text-[11px] text-muted-foreground mt-1">AI 예측과 실제의 일치도예요</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">적중률</p>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <p className={`text-xl font-bold tabular-nums ${data.win_rate_pct >= 50 ? 'text-red-500' : 'text-blue-500'}`}>
                  {data.win_rate_pct}%
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">AI가 맞춘 비율이에요</p>
            </div>
          </div>

          {/* 추가 지표 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">수익/위험 비율</p>
                <p className="font-semibold">{data.net_calmar}</p>
                <p className="text-[10px] text-muted-foreground">손실 대비 벌어들인 수익</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
              <TrendingDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">출렁임</p>
                <p className="font-semibold">{data.volatility_pct}%</p>
                <p className="text-[10px] text-muted-foreground">수익이 얼마나 들쭉날쭉한지</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">하락 위험 효율</p>
                <p className="font-semibold">{data.net_sortino}</p>
                <p className="text-[10px] text-muted-foreground">떨어질 때 위험 대비 수익</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 설계 5: 따라하기 가이드 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">이 전략 따라하기</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: 1, title: '종목 확인', desc: '랭킹 페이지에서 장기 탭 → 상위 10개 종목을 확인하세요' },
              { step: 2, title: '동일 금액 매수', desc: '증권사 앱에서 10개 종목을 동일한 금액으로 매수하세요' },
              { step: 3, title: '6개월 보유', desc: '약 6개월(120거래일) 동안 보유하세요' },
              { step: 4, title: '리밸런싱', desc: '6개월 후 새 랭킹을 확인하고 종목을 교체하세요' },
            ].map((s) => (
              <div key={s.step} className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {s.step}
                  </span>
                  <span className="text-sm font-semibold">{s.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            ⚠️ 과거 성과가 미래를 보장하지 않아요. 투자 전 반드시 본인이 판단하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

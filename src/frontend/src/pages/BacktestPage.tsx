import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { MetricsCards } from '@/components/backtest/MetricsCards'
import { EquityCurveChart } from '@/components/backtest/EquityCurveChart'
import type { StrategySummary, BacktestMetric } from '@/types/backtest'

export function BacktestPage() {
  const [summaries, setSummaries] = useState<StrategySummary[]>([])
  const [selected, setSelected] = useState('bt120_long')
  const [metrics, setMetrics] = useState<BacktestMetric[]>([])
  const [phase, setPhase] = useState<string>('holdout')
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.backtest.summary()
      .then(setSummaries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.backtest.metrics(selected)
      .then((res) => setMetrics(res.metrics))
      .catch(() => setMetrics([]))
  }, [selected])

  const current = metrics.find((m) => m.phase === phase)
  const holdout = metrics.find((m) => m.phase === 'holdout')
  const dev = metrics.find((m) => m.phase === 'dev')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">백테스트 성과</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI가 추천한 종목으로 투자했다면 얼마나 벌었을까?
        </p>
      </div>

      {/* 전략 카드 */}
      <MetricsCards
        summaries={summaries}
        loading={loading}
        selected={selected}
        onSelect={setSelected}
      />

      {/* Phase 탭 */}
      <Tabs value={phase} onValueChange={setPhase}>
        <TabsList>
          <TabsTrigger value="holdout">검증 기간</TabsTrigger>
          <TabsTrigger value="dev">학습 기간</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 핵심 지표 3개 — 초보자용 대형 카드 */}
      {current && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 누적 수익률 */}
          <Card className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">누적 수익률</span>
              </div>
              <p className={cn(
                'text-3xl font-bold tabular-nums',
                current.net_cagr > 0 ? 'text-red-500' : 'text-blue-500'
              )}>
                {current.net_cagr > 0 ? '+' : ''}{(current.net_cagr * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                100만원 투자 시{' '}
                <span className="font-semibold text-foreground">
                  {(100 * (1 + current.net_cagr)).toFixed(0)}만원
                </span>
              </p>
              {/* 배경 장식 */}
              <div className={cn(
                'absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5',
                current.net_cagr > 0 ? 'bg-red-500' : 'bg-blue-500'
              )} />
            </CardContent>
          </Card>

          {/* 최대 손실 (MDD) */}
          <Card className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">최대 손실 (MDD)</span>
              </div>
              <p className="text-3xl font-bold tabular-nums text-blue-500">
                {(current.net_mdd * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                가장 많이 빠졌을 때{' '}
                <span className="font-semibold text-foreground">
                  {Math.abs(current.net_mdd * 100).toFixed(1)}% 손실
                </span>
              </p>
              {/* MDD 게이지 */}
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(Math.abs(current.net_mdd) * 100 * 2, 100)}%` }}
                />
              </div>
              <div className={cn(
                'absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5 bg-blue-500'
              )} />
            </CardContent>
          </Card>

          {/* 승률 */}
          <Card className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">승률</span>
              </div>
              <p className={cn(
                'text-3xl font-bold tabular-nums',
                current.net_hit_ratio >= 0.5 ? 'text-red-500' : 'text-blue-500'
              )}>
                {(current.net_hit_ratio * 100).toFixed(0)}%
              </p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                10번 투자 중{' '}
                <span className="font-semibold text-foreground">
                  {Math.round(current.net_hit_ratio * 10)}번 수익
                </span>
              </p>
              {/* 도넛 차트 — CSS로 구현 */}
              <div className="mt-3 flex items-center gap-2">
                <div className="relative h-8 w-8">
                  <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                      className="text-muted" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none"
                      className={current.net_hit_ratio >= 0.5 ? 'text-red-500' : 'text-blue-500'}
                      stroke="currentColor" strokeWidth="4"
                      strokeDasharray={`${current.net_hit_ratio * 88} 88`}
                      strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  수익 {Math.round(current.net_hit_ratio * 10)} / 손실 {10 - Math.round(current.net_hit_ratio * 10)}
                </span>
              </div>
              <div className={cn(
                'absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5',
                current.net_hit_ratio >= 0.5 ? 'bg-red-500' : 'bg-blue-500'
              )} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 에쿼티 커브 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            이 전략 vs 코스피200 (수익률 비교)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EquityCurveChart strategy={selected} />
        </CardContent>
      </Card>

      {/* 상세 지표 — 아코디언 */}
      {(holdout || dev) && (
        <Card>
          <CardHeader className="pb-0">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between px-0 hover:bg-transparent"
              onClick={() => setShowDetail(!showDetail)}
            >
              <CardTitle className="text-sm font-medium text-muted-foreground">
                상세 지표 보기
              </CardTitle>
              {showDetail
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </CardHeader>
          {showDetail && (
            <CardContent className="overflow-x-auto pt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">지표</th>
                    <th className="py-2 pr-4 font-medium">설명</th>
                    {holdout && <th className="py-2 pr-4 font-medium">검증</th>}
                    {dev && <th className="py-2 font-medium">학습</th>}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'net_cagr', label: '연간 수익률', desc: '1년 기준 복리 수익', fmt: 'pct' },
                    { key: 'gross_cagr', label: '총 수익률', desc: '수수료 제외 수익', fmt: 'pct' },
                    { key: 'net_sharpe', label: 'Sharpe', desc: '위험 대비 수익 효율', fmt: 'num' },
                    { key: 'net_mdd', label: 'MDD', desc: '최대 낙폭', fmt: 'pct' },
                    { key: 'net_hit_ratio', label: '승률', desc: '수익 거래 비율', fmt: 'pct' },
                    { key: 'ic', label: 'IC', desc: '예측 정확도', fmt: 'num' },
                    { key: 'rank_ic', label: 'Rank IC', desc: '순위 예측 정확도', fmt: 'num' },
                    { key: 'avg_turnover_oneway', label: '회전율', desc: '매매 빈도', fmt: 'pct' },
                    { key: 'net_calmar_ratio', label: 'Calmar', desc: '수익/최대손실 비율', fmt: 'num' },
                  ].map(({ key, label, desc, fmt }) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{label}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{desc}</td>
                      {holdout && (
                        <td className="py-2 pr-4 font-medium tabular-nums">
                          {fmtVal(holdout[key as keyof BacktestMetric] as number, fmt)}
                        </td>
                      )}
                      {dev && (
                        <td className="py-2 font-medium tabular-nums">
                          {fmtVal(dev[key as keyof BacktestMetric] as number, fmt)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

function fmtVal(v: number | undefined, fmt: string): string {
  if (v == null) return '—'
  return fmt === 'pct' ? `${(v * 100).toFixed(2)}%` : v.toFixed(4)
}

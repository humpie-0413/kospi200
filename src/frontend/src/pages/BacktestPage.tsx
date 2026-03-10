import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, Lightbulb, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
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
      {/* P0-7: 제목/설명 개선 */}
      <div>
        <h1 className="text-2xl font-bold">과거 성과 검증</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          AI가 추천한 종목으로 투자했다면 어땠을까요?
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          과거 10년간 AI 추천을 따랐을 때의 가상 투자 성과입니다.
          실제 투자와 다를 수 있으며, 과거 성과가 미래를 보장하지 않습니다.
        </p>
      </div>

      {/* 전략 카드 */}
      <MetricsCards
        summaries={summaries}
        loading={loading}
        selected={selected}
        onSelect={setSelected}
      />

      {/* P0-9: Phase 탭 리네이밍 */}
      <div className="flex items-center gap-2">
        <Tabs value={phase} onValueChange={setPhase}>
          <TabsList>
            <TabsTrigger value="holdout">실전 테스트</TabsTrigger>
            <TabsTrigger value="dev">연습 기간</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 cursor-help text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold">실전 테스트가 더 신뢰도 높습니다</p>
            <p className="mt-1">AI가 한 번도 보지 못한 데이터로 검증한 성과입니다.</p>
            <p className="mt-1">연습 기간은 AI가 학습에 사용한 데이터입니다.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 핵심 지표 3개 */}
      {current && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 연평균 수익률 (CAGR) */}
          <Card className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">연평균 수익률(CAGR)</span>
              </div>
              <p className={cn(
                'text-3xl font-bold tabular-nums',
                current.net_cagr > 0 ? 'text-red-500' : 'text-blue-500'
              )}>
                {current.net_cagr > 0 ? '+' : ''}{(current.net_cagr * 100).toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                매년 평균 이만큼 벌었다는 뜻이에요
              </p>
              {current.net_total_return != null && (
                <p className="mt-1 text-xs">
                  총 누적 수익{' '}
                  <span className={cn('font-bold', current.net_total_return > 0 ? 'text-red-500' : 'text-blue-500')}>
                    {current.net_total_return > 0 ? '+' : ''}{(current.net_total_return * 100).toFixed(1)}%
                  </span>
                </p>
              )}
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
                    {holdout && <th className="py-2 pr-4 font-medium">실전 테스트</th>}
                    {dev && <th className="py-2 font-medium">연습 기간</th>}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'net_cagr', label: '연간 수익률(CAGR)', desc: '1년 기준 복리 수익률', detail: '매년 평균적으로 벌어들인 수익률. 10%면 매년 10%씩 복리로 불어난다는 뜻', fmt: 'pct' },
                    { key: 'net_total_return', label: '총 누적 수익률', desc: '전체 기간 총 수익', detail: '처음부터 끝까지 투자했을 때 총 수익률. 100만원→158만원이면 +58%', fmt: 'pct' },
                    { key: 'net_sharpe', label: 'Sharpe 비율', desc: '위험 대비 수익 효율', detail: '위험 1단위당 수익. 1.0 이상이면 우수, 0.5 이하면 부족. 높을수록 효율적', fmt: 'num' },
                    { key: 'net_mdd', label: 'MDD (최대낙폭)', desc: '투자 중 최악의 손실', detail: '최고점에서 최저점까지 떨어진 최대 폭. -20%면 100만원이 80만원까지 빠진 적 있다는 뜻', fmt: 'pct' },
                    { key: 'net_hit_ratio', label: '승률', desc: '수익 거래 비율', detail: '전체 거래 중 이익을 본 비율. 60%면 10번 중 6번 수익', fmt: 'pct' },
                    { key: 'ic', label: 'IC (정보계수)', desc: 'AI 예측 정확도', detail: 'AI 예측과 실제 결과의 상관관계. 0.05 이상이면 유의미, 0.1 이상이면 우수', fmt: 'num' },
                    { key: 'rank_ic', label: 'Rank IC', desc: '순위 예측 정확도', detail: '순위 기준 예측 정확도. IC보다 안정적인 지표. 0.05 이상이면 양호', fmt: 'num' },
                    { key: 'avg_turnover_oneway', label: '회전율', desc: '매매 빈도', detail: '리밸런싱 때 교체되는 종목 비율. 높으면 거래 비용 증가', fmt: 'pct' },
                    { key: 'net_calmar_ratio', label: 'Calmar 비율', desc: '수익 대비 최대손실', detail: 'CAGR을 MDD로 나눈 값. 1.0 이상이면 양호. 수익 대비 위험이 적다는 뜻', fmt: 'num' },
                  ].map(({ key, label, desc, detail, fmt }) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        <Tooltip>
                          <TooltipTrigger className="underline decoration-dotted cursor-help text-left">
                            {label}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[260px]">
                            <p className="text-xs">{detail}</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
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

      {/* P0-10: 행동 가이드 카드 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">이 전략을 활용하는 방법</h3>
          </div>
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
            <li>랭킹 페이지에서 오늘의 <strong className="text-foreground">상위 10개 종목</strong>을 확인하세요</li>
            <li>장기 전략이라면 약 <strong className="text-foreground">6개월간 보유</strong>하세요</li>
            <li>리밸런싱일(120일 후)에 <strong className="text-foreground">새 랭킹으로 교체</strong>하세요</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            과거 성과가 미래를 보장하지 않습니다. 분산 투자를 권장합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function fmtVal(v: number | undefined, fmt: string): string {
  if (v == null) return '—'
  return fmt === 'pct' ? `${(v * 100).toFixed(2)}%` : v.toFixed(4)
}

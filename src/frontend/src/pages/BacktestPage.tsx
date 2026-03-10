import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, Info, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { MetricsCards } from '@/components/backtest/MetricsCards'
import { EquityCurveChart } from '@/components/backtest/EquityCurveChart'
import { SimpleBacktest } from '@/components/backtest/SimpleBacktest'
import type { StrategySummary, BacktestMetric } from '@/types/backtest'

export function BacktestPage() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [summaries, setSummaries] = useState<StrategySummary[]>([])
  const [selected, setSelected] = useState('bt120_long')
  const [metrics, setMetrics] = useState<BacktestMetric[]>([])
  const [phase, setPhase] = useState<string>('holdout')
  const [advLoading, setAdvLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  // 고급 보기 열릴 때만 데이터 로드
  useEffect(() => {
    if (!showAdvanced) return
    setAdvLoading(true)
    api.backtest.summary()
      .then(setSummaries)
      .catch(() => {})
      .finally(() => setAdvLoading(false))
  }, [showAdvanced])

  useEffect(() => {
    if (!showAdvanced) return
    api.backtest.metrics(selected)
      .then((res) => setMetrics(res.metrics))
      .catch(() => setMetrics([]))
  }, [selected, showAdvanced])

  const current = metrics.find((m) => m.phase === phase)
  const holdout = metrics.find((m) => m.phase === 'holdout')
  const dev = metrics.find((m) => m.phase === 'dev')

  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div>
        <h1 className="text-2xl font-bold">AI를 믿어도 될까요?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI가 추천한 종목으로 투자했다면 어땠을까요? 과거 데이터로 확인해 보세요.
        </p>
      </div>

      {/* 기본 보기: SimpleBacktest */}
      <SimpleBacktest />

      {/* 고급 보기 아코디언 (설계 6, 작업 8) */}
      <Card>
        <CardHeader className="pb-0">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between px-0 hover:bg-transparent"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                고급 보기 — 4개 전략 비교
              </CardTitle>
            </div>
            {showAdvanced
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </CardHeader>

        {showAdvanced && (
          <CardContent className="pt-4 space-y-6">
            <p className="text-xs text-muted-foreground">
              4개 전략을 비교할 수 있어요. 전문적인 지표를 확인하고 싶은 분에게 유용해요.
            </p>

            {/* 전략 설명 */}
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              {[
                { name: '장기 매수', desc: '상위 종목 사서 6개월 보유' },
                { name: '단기 매도', desc: '하위 종목 공매도 1개월' },
                { name: '장기 AI 앙상블', desc: '4개 AI 모델의 평균 (장기)' },
                { name: '단기 AI 앙상블', desc: '4개 AI 모델의 평균 (단기)' },
              ].map((s) => (
                <div key={s.name} className="rounded-md bg-muted/50 px-3 py-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground"> — {s.desc}</span>
                </div>
              ))}
            </div>

            {/* 전략 카드 */}
            <MetricsCards
              summaries={summaries}
              loading={advLoading}
              selected={selected}
              onSelect={setSelected}
            />

            {/* Phase 탭 */}
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
                  <p className="font-semibold">실전 테스트가 더 신뢰도 높아요</p>
                  <p className="mt-1">AI가 한 번도 보지 못한 데이터로 검증한 성과예요.</p>
                  <p className="mt-1">연습 기간은 AI가 학습에 사용한 데이터예요.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* 핵심 지표 3개 */}
            {current && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="relative overflow-hidden">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">연평균 수익률</span>
                    </div>
                    <p className={cn('text-3xl font-bold tabular-nums', current.net_cagr > 0 ? 'text-red-500' : 'text-blue-500')}>
                      {current.net_cagr > 0 ? '+' : ''}{(current.net_cagr * 100).toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">매년 평균 이만큼 벌었어요</p>
                    {current.net_total_return != null && (
                      <p className="mt-1 text-xs">
                        총 누적{' '}
                        <span className={cn('font-bold', current.net_total_return > 0 ? 'text-red-500' : 'text-blue-500')}>
                          {current.net_total_return > 0 ? '+' : ''}{(current.net_total_return * 100).toFixed(1)}%
                        </span>
                      </p>
                    )}
                    <div className={cn('absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5', current.net_cagr > 0 ? 'bg-red-500' : 'bg-blue-500')} />
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">최대 손실</span>
                    </div>
                    <p className="text-3xl font-bold tabular-nums text-blue-500">
                      {(current.net_mdd * 100).toFixed(1)}%
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      가장 많이 빠졌을 때 <span className="font-semibold text-foreground">{Math.abs(current.net_mdd * 100).toFixed(1)}% 손실</span>
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(Math.abs(current.net_mdd) * 100 * 2, 100)}%` }} />
                    </div>
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5 bg-blue-500" />
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">승률</span>
                    </div>
                    <p className={cn('text-3xl font-bold tabular-nums', current.net_hit_ratio >= 0.5 ? 'text-red-500' : 'text-blue-500')}>
                      {(current.net_hit_ratio * 100).toFixed(0)}%
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      10번 중 <span className="font-semibold text-foreground">{Math.round(current.net_hit_ratio * 10)}번 수익</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative h-8 w-8">
                        <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" className="text-muted" strokeWidth="4" />
                          <circle cx="18" cy="18" r="14" fill="none" className={current.net_hit_ratio >= 0.5 ? 'text-red-500' : 'text-blue-500'} stroke="currentColor" strokeWidth="4" strokeDasharray={`${current.net_hit_ratio * 88} 88`} strokeLinecap="round" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-muted-foreground">수익 {Math.round(current.net_hit_ratio * 10)} / 손실 {10 - Math.round(current.net_hit_ratio * 10)}</span>
                    </div>
                    <div className={cn('absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5', current.net_hit_ratio >= 0.5 ? 'bg-red-500' : 'bg-blue-500')} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 에쿼티 커브 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  전략 vs 코스피200 (수익률 비교)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EquityCurveChart strategy={selected} />
              </CardContent>
            </Card>

            {/* 상세 지표 아코디언 */}
            {(holdout || dev) && (
              <Card>
                <CardHeader className="pb-0">
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between px-0 hover:bg-transparent"
                    onClick={() => setShowDetail(!showDetail)}
                  >
                    <CardTitle className="text-sm font-medium text-muted-foreground">상세 지표 보기</CardTitle>
                    {showDetail ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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
                          { key: 'net_cagr', label: '연간 수익률', desc: '1년 기준 복리 수익률', detail: '매년 평균적으로 벌어들인 수익률이에요', fmt: 'pct' },
                          { key: 'net_total_return', label: '총 누적 수익률', desc: '전체 기간 총 수익', detail: '처음부터 끝까지 투자했을 때 총 수익률이에요', fmt: 'pct' },
                          { key: 'net_sharpe', label: '위험 대비 효율', desc: '위험을 감수한 만큼 벌었나', detail: '1.0 이상이면 우수, 0.5 이하면 부족해요', fmt: 'num' },
                          { key: 'net_mdd', label: '최대 손실', desc: '투자 중 최악의 손실', detail: '최고점에서 최저점까지 떨어진 최대 폭이에요', fmt: 'pct' },
                          { key: 'net_hit_ratio', label: '적중률', desc: '수익 거래 비율', detail: '전체 거래 중 이익을 본 비율이에요', fmt: 'pct' },
                          { key: 'ic', label: 'AI 정확도', desc: 'AI 예측과 실제의 일치도', detail: '0.05 이상이면 유의미, 0.1 이상이면 우수해요', fmt: 'num' },
                          { key: 'rank_ic', label: '순위 예측 정확도', desc: '순위 기준 예측 정확도', detail: 'IC보다 안정적인 지표예요', fmt: 'num' },
                          { key: 'avg_turnover_oneway', label: '회전율', desc: '매매 빈도', detail: '리밸런싱 때 교체되는 종목 비율이에요', fmt: 'pct' },
                          { key: 'net_calmar_ratio', label: '수익/위험 비율', desc: '수익 대비 최대 손실', detail: '1.0 이상이면 양호해요', fmt: 'num' },
                        ].map(({ key, label, desc, detail, fmt }) => (
                          <tr key={key} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">
                              <Tooltip>
                                <TooltipTrigger className="underline decoration-dotted cursor-help text-left">{label}</TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[260px]">
                                  <p className="text-xs">{detail}</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="py-2 pr-4 text-xs text-muted-foreground">{desc}</td>
                            {holdout && <td className="py-2 pr-4 font-medium tabular-nums">{fmtVal(holdout[key as keyof BacktestMetric] as number, fmt)}</td>}
                            {dev && <td className="py-2 font-medium tabular-nums">{fmtVal(dev[key as keyof BacktestMetric] as number, fmt)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                )}
              </Card>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

function fmtVal(v: number | undefined, fmt: string): string {
  if (v == null) return '—'
  return fmt === 'pct' ? `${(v * 100).toFixed(2)}%` : v.toFixed(4)
}

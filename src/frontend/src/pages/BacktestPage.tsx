import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { MetricsCards } from '@/components/backtest/MetricsCards'
import { EquityCurveChart } from '@/components/backtest/EquityCurveChart'
import type { StrategySummary } from '@/types/backtest'
import type { BacktestMetric } from '@/types/backtest'

export function BacktestPage() {
  const [summaries, setSummaries] = useState<StrategySummary[]>([])
  const [selected, setSelected] = useState('bt120_long')
  const [metrics, setMetrics] = useState<BacktestMetric[]>([])
  const [phase, setPhase] = useState<string>('holdout')
  const [loading, setLoading] = useState(true)

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

  const holdout = metrics.find((m) => m.phase === 'holdout')
  const dev = metrics.find((m) => m.phase === 'dev')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">백테스트 성과</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          4개 전략의 백테스트 결과
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
          <TabsTrigger value="holdout">Holdout</TabsTrigger>
          <TabsTrigger value="dev">Dev</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 에쿼티 커브 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            에쿼티 커브 + 드로다운
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EquityCurveChart strategy={selected} phase={phase} />
        </CardContent>
      </Card>

      {/* 상세 지표 테이블 */}
      {(holdout || dev) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              상세 지표
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">지표</th>
                  {holdout && <th className="py-2 pr-4 font-medium">Holdout</th>}
                  {dev && <th className="py-2 font-medium">Dev</th>}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'net_cagr', label: 'Net CAGR', fmt: 'pct' },
                  { key: 'gross_cagr', label: 'Gross CAGR', fmt: 'pct' },
                  { key: 'net_sharpe', label: 'Net Sharpe', fmt: 'num' },
                  { key: 'gross_sharpe', label: 'Gross Sharpe', fmt: 'num' },
                  { key: 'net_mdd', label: 'Net MDD', fmt: 'pct' },
                  { key: 'gross_mdd', label: 'Gross MDD', fmt: 'pct' },
                  { key: 'net_hit_ratio', label: 'Hit Ratio', fmt: 'pct' },
                  { key: 'ic', label: 'IC', fmt: 'num' },
                  { key: 'rank_ic', label: 'Rank IC', fmt: 'num' },
                  { key: 'avg_turnover_oneway', label: 'Turnover', fmt: 'pct' },
                  { key: 'net_calmar_ratio', label: 'Calmar', fmt: 'num' },
                ].map(({ key, label, fmt }) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{label}</td>
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
        </Card>
      )}
    </div>
  )
}

function fmtVal(v: number | undefined, fmt: string): string {
  if (v == null) return '—'
  return fmt === 'pct' ? `${(v * 100).toFixed(2)}%` : v.toFixed(4)
}

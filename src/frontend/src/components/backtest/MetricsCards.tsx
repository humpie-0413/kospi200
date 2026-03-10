import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StrategySummary } from '@/types/backtest'
import { STRATEGY_LABELS } from '@/types/backtest'

interface MetricsCardsProps {
  summaries: StrategySummary[]
  loading: boolean
  selected: string
  onSelect: (strategy: string) => void
}

function formatPct(v: number | undefined): string {
  return v != null ? `${(v * 100).toFixed(1)}%` : '—'
}

function formatNum(v: number | undefined, decimals = 3): string {
  return v != null ? v.toFixed(decimals) : '—'
}

export function MetricsCards({ summaries, loading, selected, onSelect }: MetricsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summaries.map((s) => (
        <Card
          key={s.strategy}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            selected === s.strategy && 'ring-2 ring-primary'
          )}
          onClick={() => onSelect(s.strategy)}
        >
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-3">
              {STRATEGY_LABELS[s.strategy] ?? s.strategy}
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">CAGR</span>
                <p className={cn('font-bold tabular-nums', s.net_cagr > 0 ? 'text-positive' : 'text-negative')}>
                  {formatPct(s.net_cagr)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Sharpe</span>
                <p className="font-bold tabular-nums">{formatNum(s.net_sharpe)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">MDD</span>
                <p className="font-bold tabular-nums text-destructive">{formatPct(s.net_mdd)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">IC</span>
                <p className="font-bold tabular-nums">{formatNum(s.ic)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

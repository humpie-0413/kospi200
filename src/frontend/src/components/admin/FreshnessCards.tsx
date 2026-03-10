import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { FreshnessResponse } from '@/types/admin'

interface FreshnessCardsProps {
  data: FreshnessResponse | null
  loading: boolean
}

export function FreshnessCards({ data, loading }: FreshnessCardsProps) {
  if (loading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  const items = [
    { key: 'ranking_long', label: 'Long 랭킹', info: data.ranking_long },
    { key: 'ranking_short', label: 'Short 랭킹', info: data.ranking_short },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map(({ key, label, info }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tabular-nums">
                {info.max_date ?? '—'}
              </span>
              <Badge variant="outline" className="text-xs">
                {info.count.toLocaleString()}행
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FeatureTag } from './FeatureTag'
import type { RankingItem } from '@/types/ranking'
import { cn } from '@/lib/utils'

interface RankingCardProps {
  item: RankingItem
  onSelect: (item: RankingItem) => void
}

export function RankingCard({ item, onSelect }: RankingCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(item)}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Badge
          variant="secondary"
          className={cn(
            'tabular-nums font-bold min-w-[2.5rem] justify-center text-sm',
            item.rank_total <= 3 && 'bg-positive/15 text-positive',
            item.rank_total > 3 && item.rank_total <= 10 && 'bg-primary/15 text-primary',
          )}
        >
          {item.rank_total}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{item.ticker}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <FeatureTag feature={item.top_feature_1} percentile={item.percentile_1} />
            <FeatureTag feature={item.top_feature_2} percentile={item.percentile_2} />
          </div>
        </div>
        <span
          className={cn(
            'tabular-nums font-bold text-sm',
            item.score_total > 0 && 'text-positive',
            item.score_total < 0 && 'text-negative',
          )}
        >
          {item.score_total.toFixed(4)}
        </span>
      </CardContent>
    </Card>
  )
}

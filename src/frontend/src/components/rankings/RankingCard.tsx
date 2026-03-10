import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CategoryBadge } from './CategoryBadge'
import type { RankingItem } from '@/types/ranking'
import { CATEGORY_KEYS, getRankLabel, rankToScore, generateSummary, getScoreColor } from '@/types/ranking'
import { cn } from '@/lib/utils'

interface RankingCardProps {
  item: RankingItem
  onSelect: (item: RankingItem) => void
}

export function RankingCard({ item, onSelect }: RankingCardProps) {
  const label = getRankLabel(item.rank_total)
  const score = rankToScore(item.rank_total)
  const summary = generateSummary(item)

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(item)}
    >
      <CardContent className="p-4 space-y-2.5">
        {/* 상단: 순위 + 종목 + 등급 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="secondary"
              className={cn(
                'tabular-nums font-bold min-w-[2.5rem] justify-center text-sm shrink-0',
                item.rank_total <= 3 && 'bg-positive/15 text-positive',
                item.rank_total > 3 && item.rank_total <= 10 && 'bg-primary/15 text-primary',
              )}
            >
              {item.rank_total}위
            </Badge>
            <div className="min-w-0">
              <span className="font-bold truncate block">{item.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{item.ticker}</span>
            </div>
          </div>
          <div className="text-right shrink-0 ml-2">
            <Badge className={cn('text-xs border-0', label.className)}>{label.text}</Badge>
            <div className={cn('text-sm font-bold tabular-nums mt-0.5', getScoreColor(score))}>
              {score}점
            </div>
          </div>
        </div>

        {/* 카테고리 미니 뱃지 */}
        <div className="flex flex-wrap gap-1">
          {CATEGORY_KEYS.map((key) => (
            <CategoryBadge
              key={key}
              catKey={key}
              score={item[`cat_${key}` as keyof RankingItem] as number}
            />
          ))}
        </div>

        {/* 한줄 요약 */}
        {summary && (
          <p className="text-xs text-muted-foreground italic">"{summary}"</p>
        )}
      </CardContent>
    </Card>
  )
}

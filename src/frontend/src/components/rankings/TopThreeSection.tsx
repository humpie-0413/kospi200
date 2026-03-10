import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CategoryRadar } from './CategoryRadar'
import { CategoryBadge } from './CategoryBadge'
import type { RankingItem, Horizon } from '@/types/ranking'
import {
  CATEGORY_KEYS,
  getRankLabel,
  rankToScore,
  generateSummary,
  getScoreColor,
  getScoreBarColor,
} from '@/types/ranking'
import { cn } from '@/lib/utils'

const MEDALS = ['🥇', '🥈', '🥉']

interface TopThreeSectionProps {
  items: RankingItem[]
  horizon: Horizon
}

export function TopThreeSection({ items, horizon }: TopThreeSectionProps) {
  const navigate = useNavigate()

  if (items.length === 0) return null

  const top3 = items.slice(0, 3)

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span>오늘의 AI 추천 TOP 3</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {top3.map((item, idx) => {
          const label = getRankLabel(item.rank_total)
          const score = rankToScore(item.rank_total)
          const summary = generateSummary(item)

          return (
            <Card
              key={item.ticker}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
              onClick={() =>
                navigate(`/rankings/${item.ticker}`, { state: { item, horizon } })
              }
            >
              <CardContent className="p-5 space-y-3">
                {/* Medal + 종목 */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{MEDALS[idx]}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-lg truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {item.ticker}
                    </div>
                  </div>
                </div>

                {/* 스코어 바 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Badge className={cn('text-xs border-0', label.className)}>
                      {label.text}
                    </Badge>
                    <span
                      className={cn(
                        'text-xl font-bold tabular-nums',
                        getScoreColor(score),
                      )}
                    >
                      {score}점
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        getScoreBarColor(score),
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>

                {/* 미니 레이더 */}
                <CategoryRadar item={item} height={150} />

                {/* 카테고리 뱃지 */}
                <div className="flex flex-wrap gap-1 justify-center">
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
                  <p className="text-sm text-muted-foreground italic text-center">
                    "{summary}"
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

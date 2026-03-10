import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CategoryRadar } from './CategoryRadar'
import { CategoryBars } from './CategoryBars'
import { ScoreTimeline } from './ScoreTimeline'
import { FeatureTag } from './FeatureTag'
import type { RankingItem, Horizon } from '@/types/ranking'

interface TickerDetailProps {
  item: RankingItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  horizon: Horizon
}

export function TickerDetail({ item, open, onOpenChange, horizon }: TickerDetailProps) {
  const navigate = useNavigate()

  if (!item) return null

  const goToDetail = () => {
    onOpenChange(false)
    navigate(`/rankings/${item.ticker}`, { state: { item, horizon } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl font-bold">{item.name}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {item.ticker}
            </Badge>
            <Badge
              className={
                item.rank_total <= 10
                  ? 'bg-positive text-white'
                  : item.rank_total >= 180
                    ? 'bg-negative text-white'
                    : 'bg-neutral text-white'
              }
            >
              #{item.rank_total}
            </Badge>
            <Button variant="ghost" size="sm" onClick={goToDetail} className="ml-auto text-xs">
              <ExternalLink className="mr-1 h-3 w-3" /> 상세
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* 점수 + TOP3 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold tabular-nums">
              {item.score_total.toFixed(4)}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <FeatureTag feature={item.top_feature_1} percentile={item.percentile_1} />
              <FeatureTag feature={item.top_feature_2} percentile={item.percentile_2} />
              <FeatureTag feature={item.top_feature_3} percentile={item.percentile_3} />
            </div>
          </div>

          {/* 레이더 + 바 */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                카테고리 레이더
              </h4>
              <CategoryRadar item={item} />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                카테고리 점수
              </h4>
              <CategoryBars item={item} />
            </div>
          </div>

          {/* 타임라인 */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              점수 추이 (최근 30일)
            </h4>
            <ScoreTimeline ticker={item.ticker} horizon={horizon} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

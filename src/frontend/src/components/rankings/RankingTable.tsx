import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FeatureTag } from './FeatureTag'
import type { RankingItem } from '@/types/ranking'
import { cn } from '@/lib/utils'

interface RankingTableProps {
  items: RankingItem[]
  loading: boolean
  onSelect: (item: RankingItem) => void
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'tabular-nums font-bold min-w-[2.5rem] justify-center',
        rank <= 3 && 'bg-positive/15 text-positive',
        rank > 3 && rank <= 10 && 'bg-primary/15 text-primary',
      )}
    >
      {rank}
    </Badge>
  )
}

function ScoreCell({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        score > 0 && 'text-positive',
        score < 0 && 'text-negative',
        score === 0 && 'text-neutral',
      )}
    >
      {score.toFixed(4)}
    </span>
  )
}

export function RankingTable({ items, loading, onSelect }: RankingTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16 text-center">순위</TableHead>
            <TableHead className="w-20">티커</TableHead>
            <TableHead>종목명</TableHead>
            <TableHead className="w-24 text-right">점수</TableHead>
            <TableHead className="hidden md:table-cell">TOP3 피처</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.ticker}
              className="cursor-pointer"
              onClick={() => onSelect(item)}
            >
              <TableCell className="text-center">
                <RankBadge rank={item.rank_total} />
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {item.ticker}
              </TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-right">
                <ScoreCell score={item.score_total} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  <FeatureTag feature={item.top_feature_1} percentile={item.percentile_1} />
                  <FeatureTag feature={item.top_feature_2} percentile={item.percentile_2} />
                  <FeatureTag feature={item.top_feature_3} percentile={item.percentile_3} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

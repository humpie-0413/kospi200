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
import { CategoryBadge } from './CategoryBadge'
import type { RankingItem } from '@/types/ranking'
import { CATEGORY_KEYS, getRankLabel, getRankInterpretation, rankToScore, generateSummary, getScoreColor } from '@/types/ranking'
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

export function RankingTable({ items, loading, onSelect }: RankingTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
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
            <TableHead>종목</TableHead>
            <TableHead className="w-24 text-center">AI 등급</TableHead>
            <TableHead className="hidden lg:table-cell">카테고리</TableHead>
            <TableHead className="hidden md:table-cell w-44">한줄 요약</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const label = getRankLabel(item.rank_total)
            const score = rankToScore(item.rank_total)
            return (
              <TableRow
                key={item.ticker}
                className="cursor-pointer"
                onClick={() => onSelect(item)}
              >
                <TableCell className="text-center">
                  <RankBadge rank={item.rank_total} />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{item.ticker}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn('text-xs border-0', label.className)}>{label.text}</Badge>
                  <div className={cn('text-xs font-bold tabular-nums mt-0.5', getScoreColor(score))}>
                    {score}점
                  </div>
                  <div className={cn('text-[10px] mt-0.5', getRankInterpretation(item.rank_total).className)}>
                    {getRankInterpretation(item.rank_total).text}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {CATEGORY_KEYS.map((key) => (
                      <CategoryBadge
                        key={key}
                        catKey={key}
                        score={item[`cat_${key}` as keyof RankingItem] as number}
                      />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs text-muted-foreground italic">
                    {generateSummary(item)}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

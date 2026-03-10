import type { RankingItem, CategoryKey } from '@/types/ranking'
import { CATEGORY_LABELS } from '@/types/ranking'
import { cn } from '@/lib/utils'

const BAR_COLORS: Record<CategoryKey, string> = {
  momentum: 'bg-blue-500',
  risk: 'bg-red-500',
  profitability: 'bg-green-500',
  value: 'bg-orange-500',
  liquidity: 'bg-teal-500',
  sentiment: 'bg-purple-500',
  esg: 'bg-gray-500',
}

const CATEGORY_KEYS: CategoryKey[] = [
  'momentum', 'risk', 'profitability', 'value', 'liquidity', 'sentiment', 'esg',
]

export function CategoryBars({ item }: { item: RankingItem }) {
  return (
    <div className="space-y-2">
      {CATEGORY_KEYS.map((key) => {
        const val = item[`cat_${key}` as keyof RankingItem] as number
        const pct = Math.max(0, Math.min(100, val ?? 0))
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 text-xs text-muted-foreground shrink-0">
              {CATEGORY_LABELS[key]}
            </span>
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', BAR_COLORS[key])}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 text-right text-xs font-medium tabular-nums">
              {pct.toFixed(1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

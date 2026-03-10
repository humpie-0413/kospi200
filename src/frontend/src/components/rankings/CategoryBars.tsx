import type { RankingItem } from '@/types/ranking'
import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_ICONS, getScoreBarColor, getScoreColor } from '@/types/ranking'
import { cn } from '@/lib/utils'

export function CategoryBars({ item }: { item: RankingItem }) {
  return (
    <div className="space-y-2">
      {CATEGORY_KEYS.map((key) => {
        const val = item[`cat_${key}` as keyof RankingItem] as number
        const pct = Math.max(0, Math.min(100, val ?? 0))
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-24 text-xs text-muted-foreground shrink-0">
              {CATEGORY_ICONS[key]} {CATEGORY_LABELS[key]}
            </span>
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getScoreBarColor(pct))}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={cn('w-10 text-right text-xs font-medium tabular-nums', getScoreColor(pct))}>
              {pct.toFixed(0)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

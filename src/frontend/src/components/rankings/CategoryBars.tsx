import type { RankingItem } from '@/types/ranking'
import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_DESCRIPTIONS, getScoreBarColor, getScoreColor } from '@/types/ranking'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function CategoryBars({ item }: { item: RankingItem }) {
  return (
    <div className="space-y-2">
      {CATEGORY_KEYS.map((key) => {
        const val = item[`cat_${key}` as keyof RankingItem] as number
        const pct = Math.max(0, Math.min(100, val ?? 0))
        const topPct = Math.max(1, 100 - Math.round(pct))
        return (
          <Tooltip key={key}>
            <TooltipTrigger>
              <div className="flex items-center gap-2 cursor-help">
                <span className="w-24 text-xs text-muted-foreground shrink-0 text-left">
                  {CATEGORY_ICONS[key]} {CATEGORY_LABELS[key]}
                </span>
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden min-w-[80px]">
                  <div
                    className={cn('h-full rounded-full transition-all', getScoreBarColor(pct))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={cn('w-10 text-right text-xs font-medium tabular-nums', getScoreColor(pct))}>
                  {pct.toFixed(0)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="font-semibold">{CATEGORY_ICONS[key]} {CATEGORY_LABELS[key]} {Math.round(pct)}/100</p>
              <p className="mt-0.5 text-xs">{CATEGORY_DESCRIPTIONS[key]}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">전체 중 상위 {topPct}%</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

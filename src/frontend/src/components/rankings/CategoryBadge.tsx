import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { CategoryKey } from '@/types/ranking'
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, getScoreBg, getScoreColor } from '@/types/ranking'

interface CategoryBadgeProps {
  catKey: CategoryKey
  score: number
  showLabel?: boolean
}

export function CategoryBadge({ catKey, score, showLabel }: CategoryBadgeProps) {
  const pct = Math.max(0, Math.min(100, Math.round(score ?? 0)))
  const topPct = Math.max(1, 100 - pct)
  return (
    <Tooltip>
      <TooltipTrigger>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums cursor-help',
            getScoreBg(pct),
            getScoreColor(pct),
          )}
        >
          {CATEGORY_ICONS[catKey]}
          {showLabel && <span className="ml-0.5">{CATEGORY_LABELS[catKey]}</span>}
          {pct}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="font-semibold">{CATEGORY_ICONS[catKey]} {CATEGORY_LABELS[catKey]} {pct}/100</p>
        <p className="mt-0.5 text-xs">{CATEGORY_DESCRIPTIONS[catKey]}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">전체 중 상위 {topPct}%</p>
      </TooltipContent>
    </Tooltip>
  )
}

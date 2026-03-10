import { cn } from '@/lib/utils'
import type { CategoryKey } from '@/types/ranking'
import { CATEGORY_ICONS, CATEGORY_LABELS, getScoreBg, getScoreColor } from '@/types/ranking'

interface CategoryBadgeProps {
  catKey: CategoryKey
  score: number
  showLabel?: boolean
}

export function CategoryBadge({ catKey, score, showLabel }: CategoryBadgeProps) {
  const pct = Math.max(0, Math.min(100, Math.round(score ?? 0)))
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
        getScoreBg(pct),
        getScoreColor(pct),
      )}
      title={CATEGORY_LABELS[catKey]}
    >
      {CATEGORY_ICONS[catKey]}
      {showLabel && <span className="ml-0.5">{CATEGORY_LABELS[catKey]}</span>}
      {pct}
    </span>
  )
}

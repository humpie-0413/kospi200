import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { FEATURE_INFO, FEATURE_DESCRIPTIONS, CATEGORY_COLORS } from '@/types/ranking'
import { cn } from '@/lib/utils'

interface FeatureTagProps {
  feature: string
  percentile: number
}

export function FeatureTag({ feature, percentile }: FeatureTagProps) {
  const info = FEATURE_INFO[feature]
  if (!info) {
    return <Badge variant="secondary">{feature}</Badge>
  }
  const colors = CATEGORY_COLORS[info.category]
  const desc = FEATURE_DESCRIPTIONS[feature]

  const badge = (
    <Badge
      variant="secondary"
      className={cn(colors.bg, colors.text, 'border-0 font-normal')}
    >
      {info.label}
      <span className="ml-1 opacity-70">{percentile.toFixed(0)}%</span>
    </Badge>
  )

  if (!desc) return badge

  return (
    <Tooltip>
      <TooltipTrigger>{badge}</TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="font-semibold">{info.label}</p>
        <p>{desc}</p>
      </TooltipContent>
    </Tooltip>
  )
}

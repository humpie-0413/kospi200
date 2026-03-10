import { Badge } from '@/components/ui/badge'
import { FEATURE_INFO, CATEGORY_COLORS } from '@/types/ranking'
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
  return (
    <Badge
      variant="secondary"
      className={cn(colors.bg, colors.text, 'border-0 font-normal')}
    >
      {info.label}
      <span className="ml-1 opacity-70">{percentile.toFixed(0)}%</span>
    </Badge>
  )
}

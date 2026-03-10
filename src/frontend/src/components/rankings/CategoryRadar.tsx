import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import type { RankingItem } from '@/types/ranking'
import { CATEGORY_KEYS, CATEGORY_LABELS } from '@/types/ranking'

interface CategoryRadarProps {
  item: RankingItem
  height?: number
}

export function CategoryRadar({ item, height = 260 }: CategoryRadarProps) {
  const data = CATEGORY_KEYS.map((key) => ({
    category: CATEGORY_LABELS[key],
    value: (item[`cat_${key}` as keyof RankingItem] as number) ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: height < 200 ? 10 : 12 }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke="#3182F6"
          fill="#3182F6"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

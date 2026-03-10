import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import type { RankingItem, CategoryKey } from '@/types/ranking'
import { CATEGORY_LABELS } from '@/types/ranking'

const KEYS: CategoryKey[] = [
  'momentum', 'risk', 'profitability', 'value', 'liquidity', 'sentiment', 'esg',
]

export function CategoryRadar({ item }: { item: RankingItem }) {
  const data = KEYS.map((key) => ({
    category: CATEGORY_LABELS[key],
    value: (item[`cat_${key}` as keyof RankingItem] as number) ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
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

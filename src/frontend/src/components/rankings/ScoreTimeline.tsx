import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api } from '@/lib/api'
import type { TimelinePoint, Horizon } from '@/types/ranking'
import { Skeleton } from '@/components/ui/skeleton'

interface ScoreTimelineProps {
  ticker: string
  horizon: Horizon
}

export function ScoreTimeline({ ticker, horizon }: ScoreTimelineProps) {
  const [data, setData] = useState<TimelinePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.rankings
      .timeline(ticker, horizon, 30)
      .then((res) => setData(res.timeline))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [ticker, horizon])

  if (loading) return <Skeleton className="h-[200px] w-full" />
  if (!data.length) return <p className="text-sm text-muted-foreground">데이터 없음</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [Number(value).toFixed(4), '점수']}
          labelFormatter={(label) => String(label)}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3182F6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

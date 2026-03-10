import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import type { EquityPoint, BenchmarkPoint } from '@/types/backtest'

interface EquityCurveChartProps {
  strategy: string
  phase?: string
}

interface ChartPoint {
  date: string
  equity: number
  drawdown: number
  benchmark: number | null
}

export function EquityCurveChart({ strategy, phase }: EquityCurveChartProps) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.backtest
      .equityCurve(strategy, phase)
      .then((res) => {
        const benchMap = new Map<string, number>()
        res.benchmark.forEach((b: BenchmarkPoint) => {
          benchMap.set(String(b.date), b.equity)
        })
        const merged = res.data.map((d: EquityPoint) => ({
          date: String(d.date),
          equity: d.equity,
          drawdown: d.drawdown,
          benchmark: benchMap.get(String(d.date)) ?? null,
        }))
        setData(merged)
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [strategy, phase])

  if (loading) return <Skeleton className="h-[350px] w-full rounded-xl" />
  if (!data.length) return <p className="text-sm text-muted-foreground">데이터 없음</p>

  return (
    <div className="space-y-4">
      {/* 에쿼티 커브 */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={(v: string) => v.slice(2, 10)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            width={50}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [
              Number(value).toFixed(3),
              name === 'equity' ? '전략' : '벤치마크',
            ]}
          />
          <Legend />
          <Line type="monotone" dataKey="equity" stroke="#3182F6" strokeWidth={2} dot={false} name="전략" />
          <Line type="monotone" dataKey="benchmark" stroke="#8B95A1" strokeWidth={1.5} dot={false} name="벤치마크" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>

      {/* 드로다운 */}
      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={(v: string) => v.slice(2, 10)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            width={50}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, '드로다운']}
          />
          <Area type="monotone" dataKey="drawdown" fill="#F04452" fillOpacity={0.15} stroke="#F04452" strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

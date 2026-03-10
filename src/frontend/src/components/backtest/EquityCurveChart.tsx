import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
  ResponsiveContainer,
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
  const [range, setRange] = useState<[number, number]>([0, 0])
  const containerRef = useRef<HTMLDivElement>(null)

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
        setRange([0, merged.length - 1])
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [strategy, phase])

  // 마우스 휠 줌 + Shift 패닝
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const step = Math.max(1, Math.round(data.length * 0.04))
    setRange(([s, end]) => {
      const len = end - s
      if (e.shiftKey) {
        // Shift+휠: 좌우 이동
        const dir = e.deltaY > 0 ? step : -step
        const ns = Math.max(0, Math.min(data.length - 1 - len, s + dir))
        return [ns, ns + len]
      }
      if (e.deltaY < 0) {
        // 줌 인
        if (len <= 20) return [s, end]
        return [Math.min(end - 20, s + step), Math.max(s + 20, end - step)]
      }
      // 줌 아웃
      return [Math.max(0, s - step), Math.min(data.length - 1, end + step)]
    })
  }, [data.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !data.length) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [data.length, handleWheel])

  if (loading) return <Skeleton className="h-[350px] w-full rounded-xl" />
  if (!data.length) return <p className="text-sm text-muted-foreground">데이터 없음</p>

  const visible = data.slice(range[0], range[1] + 1)

  return (
    <div ref={containerRef} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        🖱️ 휠: 확대/축소 · Shift+휠: 좌우 이동 · {visible.length}일 / 전체 {data.length}일
      </p>

      {/* 에쿼티 커브 */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={visible}>
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
        <ComposedChart data={visible}>
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

      {/* 줌 범위 인디케이터 */}
      <div className="relative h-1.5 rounded-full bg-muted">
        <div
          className="absolute h-full rounded-full bg-primary/40"
          style={{
            left: `${(range[0] / Math.max(data.length - 1, 1)) * 100}%`,
            width: `${((range[1] - range[0]) / Math.max(data.length - 1, 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}

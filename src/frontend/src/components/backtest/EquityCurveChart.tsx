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

interface EquityCurveChartProps {
  strategy: string
  phase?: string
}

interface ChartPoint {
  date: string
  equity: number
  benchmark: number
  drawdown: number
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
        // 백엔드에서 이미 머지된 일간 데이터 반환
        const points: ChartPoint[] = (res.data as ChartPoint[]).map((d) => ({
          date: String(d.date),
          equity: d.equity,
          benchmark: d.benchmark ?? 1,
          drawdown: d.drawdown,
        }))
        setData(points)
        setRange([0, points.length - 1])
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [strategy, phase])

  // 마우스 휠 줌 + Shift 패닝
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const step = Math.max(1, Math.round(data.length * 0.04))
      setRange(([s, end]) => {
        const len = end - s
        if (e.shiftKey) {
          const dir = e.deltaY > 0 ? step : -step
          const ns = Math.max(0, Math.min(data.length - 1 - len, s + dir))
          return [ns, ns + len]
        }
        if (e.deltaY < 0) {
          if (len <= 20) return [s, end]
          return [Math.min(end - 20, s + step), Math.max(s + 20, end - step)]
        }
        return [Math.max(0, s - step), Math.min(data.length - 1, end + step)]
      })
    },
    [data.length],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el || !data.length) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [data.length, handleWheel])

  if (loading) return <Skeleton className="h-[400px] w-full rounded-xl" />
  if (!data.length)
    return <p className="text-sm text-muted-foreground">데이터 없음</p>

  const visible = data.slice(range[0], range[1] + 1)

  // 최종 수익률 계산
  const lastEq = visible[visible.length - 1]?.equity ?? 1
  const lastBm = visible[visible.length - 1]?.benchmark ?? 1
  const eqReturn = ((lastEq - 1) * 100).toFixed(1)
  const bmReturn = ((lastBm - 1) * 100).toFixed(1)

  return (
    <div ref={containerRef} className="space-y-4">
      {/* 수익률 요약 */}
      <div className="flex items-center gap-4 text-sm">
        <span>
          <span className="inline-block w-3 h-3 rounded-full bg-[#3182F6] mr-1.5" />
          전략{' '}
          <span className={Number(eqReturn) >= 0 ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>
            {Number(eqReturn) >= 0 ? '+' : ''}{eqReturn}%
          </span>
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-full bg-[#8B95A1] mr-1.5" />
          벤치마크{' '}
          <span className={Number(bmReturn) >= 0 ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>
            {Number(bmReturn) >= 0 ? '+' : ''}{bmReturn}%
          </span>
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          🖱️ 휠: 확대/축소 · Shift+휠: 이동 · {visible.length}/{data.length}일
        </span>
      </div>

      {/* 에쿼티 커브 */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={visible}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={(v: string) => v.slice(5, 10)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            width={50}
            tickFormatter={(v: number) => `${((v - 1) * 100).toFixed(0)}%`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [
              `${((Number(value) - 1) * 100).toFixed(1)}%`,
              name === 'equity' ? '전략' : '벤치마크',
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value) => (value === 'equity' ? '전략' : '벤치마크')}
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#3182F6"
            strokeWidth={2}
            dot={false}
            name="equity"
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="#8B95A1"
            strokeWidth={1.5}
            dot={false}
            name="benchmark"
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 드로다운 */}
      <ResponsiveContainer width="100%" height={100}>
        <ComposedChart data={visible}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={(v: string) => v.slice(5, 10)}
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
          <Area
            type="monotone"
            dataKey="drawdown"
            fill="#F04452"
            fillOpacity={0.15}
            stroke="#F04452"
            strokeWidth={1}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 줌 인디케이터 */}
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

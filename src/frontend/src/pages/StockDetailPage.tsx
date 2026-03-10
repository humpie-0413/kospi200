import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryRadar } from '@/components/rankings/CategoryRadar'
import { CategoryBars } from '@/components/rankings/CategoryBars'
import { ScoreTimeline } from '@/components/rankings/ScoreTimeline'
import { FeatureTag } from '@/components/rankings/FeatureTag'
import { AiAnalysis } from '@/components/rankings/AiAnalysis'
import { api } from '@/lib/api'
import type { RankingItem, Horizon } from '@/types/ranking'
import { getRankLabel, rankToScore, getScoreColor, generateSummary } from '@/types/ranking'
import { cn } from '@/lib/utils'

interface LocationState {
  item?: RankingItem
  horizon?: Horizon
}

export function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const location = useLocation()
  const state = location.state as LocationState | null

  const [item, setItem] = useState<RankingItem | null>(state?.item ?? null)
  const [horizon, setHorizon] = useState<Horizon>(state?.horizon ?? 'long_term')
  const [loading, setLoading] = useState(!state?.item)

  // 첫 렌더에서 state가 있으면 API 호출 건너뛰기
  const skipInitialFetch = useRef(!!state?.item)

  useEffect(() => {
    if (!ticker) return
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }
    setLoading(true)
    const strategy = horizon === 'long_term' ? 'long' : 'short'
    api.rankings
      .history({ strategy, ticker, page_size: 1 })
      .then((res) => {
        if (res.items.length > 0) setItem(res.items[0])
        else setItem(null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticker, horizon])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> 랭킹으로 돌아가기
          </Button>
        </Link>
        <p className="text-muted-foreground">종목을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 상단 네비게이션 */}
      <Link to="/">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 h-4 w-4" /> 랭킹
        </Button>
      </Link>

      {/* 종목 헤더 */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        <Badge variant="outline" className="font-mono text-xs">{item.ticker}</Badge>
        <Badge
          className={
            item.rank_total <= 10
              ? 'bg-positive text-white'
              : item.rank_total >= 180
                ? 'bg-negative text-white'
                : 'bg-neutral text-white'
          }
        >
          #{item.rank_total}
        </Badge>
      </div>

      {/* 호라이즌 탭 */}
      <Tabs value={horizon} onValueChange={(v) => setHorizon(v as Horizon)}>
        <TabsList>
          <TabsTrigger value="short_term">단기 20일</TabsTrigger>
          <TabsTrigger value="long_term">장기 120일</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 점수 + 등급 + TOP3 */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className={cn('text-3xl font-bold tabular-nums', getScoreColor(rankToScore(item.rank_total)))}>
              {rankToScore(item.rank_total)}점
            </span>
            <Badge className={cn('text-sm border-0', getRankLabel(item.rank_total).className)}>
              {getRankLabel(item.rank_total).text}
            </Badge>
          </div>
          {generateSummary(item) && (
            <p className="text-sm text-muted-foreground italic">"{generateSummary(item)}"</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <FeatureTag feature={item.top_feature_1} percentile={item.percentile_1} />
            <FeatureTag feature={item.top_feature_2} percentile={item.percentile_2} />
            <FeatureTag feature={item.top_feature_3} percentile={item.percentile_3} />
          </div>
        </CardContent>
      </Card>

      {/* 레이더 + 카테고리 바 */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              카테고리 레이더
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryRadar item={item} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              카테고리 점수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBars item={item} />
          </CardContent>
        </Card>
      </div>

      {/* AI 분석 리포트 */}
      {ticker && <AiAnalysis ticker={ticker} name={item.name} horizon={horizon} />}

      {/* 타임라인 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            점수 추이 (최근 30일)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticker && <ScoreTimeline ticker={ticker} horizon={horizon} />}
        </CardContent>
      </Card>
    </div>
  )
}

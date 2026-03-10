import { useState, useMemo } from 'react'
import { useRankings } from '@/hooks/useRankings'
import { FilterPanel } from '@/components/rankings/FilterPanel'
import { RankingTable } from '@/components/rankings/RankingTable'
import { RankingCard } from '@/components/rankings/RankingCard'
import { Pagination } from '@/components/rankings/Pagination'
import { TickerDetail } from '@/components/rankings/TickerDetail'
import { TopThreeSection } from '@/components/rankings/TopThreeSection'
import { Card, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { RankingItem } from '@/types/ranking'

export function RankingsPage() {
  const {
    data,
    dates,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    horizon,
    setHorizon,
    page,
    setPage,
    totalPages,
    top3,
  } = useRankings()

  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<RankingItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showHero, setShowHero] = useState(() => !localStorage.getItem('hero_dismissed'))

  const dismissHero = () => {
    localStorage.setItem('hero_dismissed', '1')
    setShowHero(false)
  }

  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    if (!search.trim()) return data.items
    const q = search.toLowerCase()
    return data.items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.ticker.includes(q)
    )
  }, [data?.items, search])

  const handleSelect = (item: RankingItem) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* 히어로 배너 (R1-fix) */}
      {showHero && (
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <button
            onClick={dismissHero}
            className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <CardContent className="pt-6 pb-5">
            <h2 className="text-xl font-bold">AI가 매일 분석하는 KOSPI200 종목 랭킹</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              200개 대형주를 7가지 관점에서 평가하여 순위를 매깁니다
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">데이터 수집</span>
              <span>→</span>
              <span className="rounded-full bg-muted px-2.5 py-1">AI 분석</span>
              <span>→</span>
              <span className="rounded-full bg-muted px-2.5 py-1">순위 산출</span>
              <span>→</span>
              <span className="rounded-full bg-muted px-2.5 py-1">매일 업데이트</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">AI 종목 랭킹</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KOSPI200 {data?.total ?? '—'}종목 &middot; {selectedDate || '—'}
        </p>
      </div>

      {/* TOP 3 하이라이트 */}
      {!loading && top3.length > 0 && (
        <TopThreeSection items={top3} horizon={horizon} />
      )}

      {/* 필터 */}
      <FilterPanel
        dates={dates}
        selectedDate={selectedDate}
        onDateChange={(d) => { setSelectedDate(d); setPage(1) }}
        horizon={horizon}
        onHorizonChange={(h) => { setHorizon(h); setPage(1) }}
        search={search}
        onSearchChange={setSearch}
      />

      {/* 에러 */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 데스크탑 테이블 */}
      <div className="hidden sm:block">
        <RankingTable items={filteredItems} loading={loading} onSelect={handleSelect} />
      </div>

      {/* 모바일 카드 */}
      <div className="space-y-2 sm:hidden">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))
          : filteredItems.map((item) => (
              <RankingCard key={item.ticker} item={item} onSelect={handleSelect} />
            ))}
      </div>

      {/* 페이지네이션 */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* 종목 상세 Dialog */}
      <TickerDetail
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        horizon={horizon}
      />
    </div>
  )
}

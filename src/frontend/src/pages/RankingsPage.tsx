import { useState, useMemo } from 'react'
import { useRankings } from '@/hooks/useRankings'
import { FilterPanel } from '@/components/rankings/FilterPanel'
import { RankingTable } from '@/components/rankings/RankingTable'
import { RankingCard } from '@/components/rankings/RankingCard'
import { Pagination } from '@/components/rankings/Pagination'
import { TickerDetail } from '@/components/rankings/TickerDetail'
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
  } = useRankings()

  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<RankingItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">AI 종목 랭킹</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KOSPI200 {data?.total ?? '—'}종목 &middot; {selectedDate || '—'}
        </p>
      </div>

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

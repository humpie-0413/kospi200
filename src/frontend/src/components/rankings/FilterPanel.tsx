import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateSelector } from './DateSelector'
import type { Horizon } from '@/types/ranking'
import { Search } from 'lucide-react'

interface FilterPanelProps {
  dates: string[]
  selectedDate: string
  onDateChange: (d: string) => void
  horizon: Horizon
  onHorizonChange: (h: Horizon) => void
  search: string
  onSearchChange: (s: string) => void
}

export function FilterPanel({
  dates,
  selectedDate,
  onDateChange,
  horizon,
  onHorizonChange,
  search,
  onSearchChange,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <DateSelector dates={dates} value={selectedDate} onChange={onDateChange} />
        <Tabs value={horizon} onValueChange={(v) => onHorizonChange(v as Horizon)}>
          <TabsList>
            <TabsTrigger value="short_term">단기 20일</TabsTrigger>
            <TabsTrigger value="long_term">장기 120일</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="종목명 / 티커 검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  )
}

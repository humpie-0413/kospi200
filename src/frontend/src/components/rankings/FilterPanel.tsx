import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { DateSelector } from './DateSelector'
import type { Horizon } from '@/types/ranking'
import { Search, Info } from 'lucide-react'

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
            <TabsTrigger value="long_term">장기 120일</TabsTrigger>
            <TabsTrigger value="short_term">단기 20일</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 cursor-help text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="mb-1 font-semibold">어떤 탭을 봐야 하나요?</p>
            <p>장기(120일): 3~6개월 보유. 처음이라면 이 탭을 추천합니다.</p>
            <p className="mt-1">단기(20일): 2~4주 단위 매매. 트레이딩 경험자용.</p>
          </TooltipContent>
        </Tooltip>
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

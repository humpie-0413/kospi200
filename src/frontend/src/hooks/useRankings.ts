import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { RankingsResponse, Horizon } from '@/types/ranking'

export function useRankings() {
  const [data, setData] = useState<RankingsResponse | null>(null)
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [horizon, setHorizon] = useState<Horizon>('long_term')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  // 날짜 목록 로드
  useEffect(() => {
    api.rankings.dates(60).then((d) => {
      setDates(d)
      if (d.length > 0 && !selectedDate) setSelectedDate(d[0])
    }).catch(() => {})
  }, [])// eslint-disable-line react-hooks/exhaustive-deps

  const fetchRankings = useCallback(async () => {
    if (!selectedDate) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.rankings.list({
        date: selectedDate,
        horizon,
        page,
        page_size: pageSize,
      })
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, horizon, page, pageSize])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return {
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
  }
}

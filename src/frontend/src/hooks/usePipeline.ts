import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { PipelineStatus, PipelineLogEntry, FreshnessResponse, PipelineAction } from '@/types/admin'

export function usePipeline() {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  const [logs, setLogs] = useState<PipelineLogEntry[]>([])
  const [freshness, setFreshness] = useState<FreshnessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.admin.pipelineStatus()
      setStatus(s)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch status')
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const l = await api.admin.pipelineLogs(10)
      setLogs(l)
    } catch {}
  }, [])

  const fetchFreshness = useCallback(async () => {
    try {
      const f = await api.admin.freshness()
      setFreshness(f)
    } catch {}
  }, [])

  // 파이프라인 실행 중이면 3초마다 폴링
  useEffect(() => {
    if (status?.is_running) {
      intervalRef.current = setInterval(fetchStatus, 3000)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      // 완료 시 freshness/logs 갱신
      fetchFreshness()
      fetchLogs()
    }
  }, [status?.is_running, fetchStatus, fetchFreshness, fetchLogs])

  const triggerPipeline = useCallback(async (action: PipelineAction) => {
    try {
      await api.admin.triggerPipeline(action)
      setError(null)
      await fetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to trigger pipeline')
    }
  }, [fetchStatus])

  const loadAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchLogs(), fetchFreshness()])
  }, [fetchStatus, fetchLogs, fetchFreshness])

  return { status, logs, freshness, error, triggerPipeline, loadAll, fetchStatus }
}

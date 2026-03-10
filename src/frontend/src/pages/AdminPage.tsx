import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, RefreshCw, Database, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePipeline } from '@/hooks/usePipeline'
import { FreshnessCards } from '@/components/admin/FreshnessCards'
import { PipelineProgress } from '@/components/admin/PipelineProgress'
import { PipelineLog } from '@/components/admin/PipelineLog'
import type { PipelineAction } from '@/types/admin'

export function AdminPage() {
  const { isAdmin, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const { status, logs, freshness, error, triggerPipeline, loadAll } = usePipeline()

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    if (!isAdmin) return
    loadAll()
  }, [isLoggedIn, isAdmin, navigate, loadAll])

  if (!isLoggedIn) return null

  if (!isAdmin) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground">
        관리자 권한이 필요합니다.
      </div>
    )
  }

  const isRunning = status?.is_running ?? false

  const actions: { action: PipelineAction; label: string; icon: React.ReactNode }[] = [
    { action: 'daily', label: '전체 파이프라인', icon: <Play className="h-4 w-4" /> },
    { action: 'collect', label: '데이터 수집', icon: <Database className="h-4 w-4" /> },
    { action: 'predict', label: '예측 생성', icon: <BarChart3 className="h-4 w-4" /> },
    { action: 'run-all', label: '수집 + 예측', icon: <RefreshCw className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          데이터 상태 확인 및 파이프라인 관리
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Freshness */}
      <FreshnessCards data={freshness} loading={!freshness} />

      {/* 파이프라인 트리거 버튼 */}
      <div className="flex flex-wrap gap-3">
        {actions.map(({ action, label, icon }) => (
          <Button
            key={action}
            onClick={() => triggerPipeline(action)}
            disabled={isRunning}
            variant={action === 'daily' ? 'default' : 'outline'}
          >
            {icon}
            <span className="ml-1.5">{label}</span>
          </Button>
        ))}
      </div>

      {/* 파이프라인 진행 상태 */}
      <PipelineProgress status={status} />

      {/* 실행 로그 */}
      <PipelineLog logs={logs} />
    </div>
  )
}

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, Clock, SkipForward } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PipelineStatus, PipelineStep } from '@/types/admin'

interface PipelineProgressProps {
  status: PipelineStatus | null
}

function formatElapsed(seconds: number | null): string {
  if (seconds == null) return ''
  if (seconds < 60) return `${Math.round(seconds)}초`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

function estimateRemaining(steps: PipelineStep[], currentStep: number): string | null {
  const completed = steps.filter(
    (s) => s.status === 'completed' && s.elapsed_seconds != null
  )
  if (completed.length === 0) return null
  const avg = completed.reduce((sum, s) => sum + (s.elapsed_seconds ?? 0), 0) / completed.length
  const remaining = steps.length - currentStep - 1
  if (remaining <= 0) return null
  const est = avg * remaining
  if (est < 60) return `약 ${Math.round(est)}초 남음`
  return `약 ${Math.round(est / 60)}분 남음`
}

function StepIcon({ step }: { step: PipelineStep }) {
  switch (step.status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-muted-foreground shrink-0" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  skipped: '건너뜀',
}

const STATUS_BADGE_STYLE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-primary/20 text-primary',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  failed: 'bg-destructive/15 text-destructive',
  skipped: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
}

export function PipelineProgress({ status }: PipelineProgressProps) {
  const [showLog, setShowLog] = useState(false)

  if (!status) return null

  const progressPct = status.is_running && status.total_steps > 0
    ? Math.round(((status.current_step + 1) / status.total_steps) * 100)
    : status.last_status === 'completed' ? 100 : 0

  const estRemaining = status.is_running
    ? estimateRemaining(status.steps, status.current_step)
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">파이프라인 상태</CardTitle>
          {status.is_running ? (
            <Badge className="bg-primary text-white animate-pulse">
              실행 중 {progressPct}%
            </Badge>
          ) : status.last_status === 'completed' ? (
            <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-500/30">
              완료
            </Badge>
          ) : status.last_status === 'failed' ? (
            <Badge variant="destructive">실패</Badge>
          ) : (
            <Badge variant="outline">대기</Badge>
          )}
        </div>
        {/* 전체 프로그레스 바 */}
        {(status.is_running || status.last_status === 'completed') && (
          <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                status.last_status === 'failed' ? 'bg-destructive' : 'bg-primary'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        {estRemaining && (
          <p className="mt-1.5 text-xs text-muted-foreground">{estRemaining}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {status.steps.map((step) => (
            <div
              key={step.index}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors',
                step.status === 'running' && 'bg-primary/5',
                step.status === 'failed' && 'bg-destructive/5',
              )}
            >
              <StepIcon step={step} />
              <span className="flex-1 truncate">{step.name}</span>
              {/* 소요 시간 */}
              {step.elapsed_seconds != null && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatElapsed(step.elapsed_seconds)}
                </span>
              )}
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 shrink-0', STATUS_BADGE_STYLE[step.status])}
              >
                {STATUS_LABEL[step.status] ?? step.status}
              </Badge>
            </div>
          ))}
        </div>

        {/* 에러 메시지 */}
        {status.last_status === 'failed' && status.last_message && !status.is_running && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive font-medium">에러 상세</p>
            <p className="mt-1 text-xs text-destructive/80 whitespace-pre-wrap break-all line-clamp-5">
              {status.last_message}
            </p>
          </div>
        )}

        {/* 완료 메시지 */}
        {status.last_status === 'completed' && status.last_message && !status.is_running && (
          <p className="mt-3 text-xs text-muted-foreground">{status.last_message}</p>
        )}

        {/* 상세 로그 토글 */}
        {status.last_message && !status.is_running && status.last_status === 'failed' && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-xs"
            onClick={() => setShowLog(!showLog)}
          >
            {showLog ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
            {showLog ? '로그 접기' : '전체 로그 보기'}
          </Button>
        )}
        {showLog && status.last_message && (
          <div className="mt-2 max-h-60 overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
            {status.last_message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

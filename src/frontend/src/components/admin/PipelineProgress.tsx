import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PipelineStatus } from '@/types/admin'

interface PipelineProgressProps {
  status: PipelineStatus | null
}

const STEP_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-primary/20 text-primary animate-pulse',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  failed: 'bg-destructive/15 text-destructive',
}

export function PipelineProgress({ status }: PipelineProgressProps) {
  if (!status) return null

  const progressPct = status.is_running && status.total_steps > 0
    ? Math.round(((status.current_step + 1) / status.total_steps) * 100)
    : 0

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
        {status.is_running && (
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {status.steps.map((step) => (
            <div key={step.index} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                {step.index}
              </span>
              <span className="flex-1">{step.name}</span>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0', STEP_STATUS_STYLE[step.status])}
              >
                {step.status === 'running' ? '실행 중' :
                 step.status === 'completed' ? '완료' :
                 step.status === 'failed' ? '실패' : '대기'}
              </Badge>
            </div>
          ))}
        </div>
        {status.last_message && !status.is_running && (
          <p className="mt-3 text-xs text-muted-foreground">{status.last_message}</p>
        )}
      </CardContent>
    </Card>
  )
}

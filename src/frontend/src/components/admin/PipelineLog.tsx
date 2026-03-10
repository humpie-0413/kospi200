import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PipelineLogEntry } from '@/types/admin'

interface PipelineLogProps {
  logs: PipelineLogEntry[]
}

function formatDuration(start: string, end: string | null): string | null {
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return null
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}초`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    })
  } catch {
    return iso
  }
}

const ACTION_LABELS: Record<string, string> = {
  daily: '전체 파이프라인',
  collect: '데이터 수집',
  predict: '예측 생성',
  'run-all': '수집 + 예측',
}

export function PipelineLog({ logs }: PipelineLogProps) {
  if (!logs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">실행 로그</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">로그 없음</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">최근 실행 로그</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => {
            const duration = formatDuration(log.started_at, log.finished_at)
            return (
              <div
                key={log.id}
                className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                    <Badge
                      variant={log.status === 'completed' ? 'outline' : 'destructive'}
                      className={
                        log.status === 'completed'
                          ? 'text-green-600 dark:text-green-400 border-green-500/30 text-xs shrink-0'
                          : log.status === 'running'
                            ? 'bg-primary/20 text-primary border-primary/30 text-xs shrink-0 animate-pulse'
                            : 'text-xs shrink-0'
                      }
                    >
                      {log.status === 'completed' ? '성공' :
                       log.status === 'running' ? '실행 중' :
                       log.status === 'failed' ? '실패' : log.status}
                    </Badge>
                    {duration && (
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {duration}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{log.triggered_by}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatTime(log.started_at)}</span>
                  {log.finished_at && <span>~ {formatTime(log.finished_at)}</span>}
                </div>
                {log.message && (
                  <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

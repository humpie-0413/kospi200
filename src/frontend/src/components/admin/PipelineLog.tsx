import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PipelineLogEntry } from '@/types/admin'

interface PipelineLogProps {
  logs: PipelineLogEntry[]
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
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{log.action}</Badge>
                  <Badge
                    variant={log.status === 'completed' ? 'outline' : 'destructive'}
                    className={
                      log.status === 'completed'
                        ? 'text-green-600 dark:text-green-400 border-green-500/30 text-xs'
                        : 'text-xs'
                    }
                  >
                    {log.status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{log.triggered_by}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>시작: {log.started_at}</span>
                {log.finished_at && <span>완료: {log.finished_at}</span>}
              </div>
              {log.message && (
                <p className="text-xs text-muted-foreground truncate">{log.message}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

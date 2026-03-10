import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { Horizon } from '@/types/ranking'

interface AiAnalysisProps {
  ticker: string
  name: string
  horizon: Horizon
  autoLoad?: boolean
}

export function AiAnalysis({ ticker, name, horizon, autoLoad = false }: AiAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = () => {
    setLoading(true)
    setError(null)
    api.ai
      .analysis(ticker, horizon)
      .then((res) => {
        setAnalysis(res.analysis)
        setProvider(res.provider)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'AI 분석을 불러올 수 없습니다')
      })
      .finally(() => setLoading(false))
  }

  // P1-5: 자동 로드 (페이지 진입 시)
  useEffect(() => {
    if (autoLoad && !analysis && !loading) fetchAnalysis()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 아직 분석을 요청하지 않은 상태
  if (!analysis && !loading && !error) {
    return (
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <Sparkles className="h-8 w-8 text-primary/60" />
            <p className="text-sm text-muted-foreground text-center">
              AI가 {name}의 랭킹 이유를 분석해드립니다
            </p>
            <Button onClick={fetchAnalysis} size="sm">
              <Sparkles className="mr-1.5 h-4 w-4" />
              AI 분석 보기
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            AI 분석 리포트
          </CardTitle>
          <div className="flex items-center gap-2">
            {provider && (
              <Badge variant="outline" className="text-[10px]">
                {provider === 'gemini' ? 'Gemini' : 'Groq'}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAnalysis}
              disabled={loading}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchAnalysis}>
              다시 시도
            </Button>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {analysis}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

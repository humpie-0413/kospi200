import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_DESCRIPTIONS } from '@/types/ranking'
import { FEATURE_INFO, FEATURE_DESCRIPTIONS } from '@/types/ranking'

// 투자 성향 결과
interface StyleResult {
  type: string
  horizon: string
  focus: string
  desc: string
}

function getStyleResult(q1: number, q2: number, q3: number): StyleResult {
  const score = q1 + q2 + q3
  if (score <= 2) return {
    type: '안정형',
    horizon: 'long_term',
    focus: '안전도와 가치',
    desc: '장기 탭에서 안전도와 가치 점수가 높은 종목을 중심으로 보세요. 변동성이 낮고 재무가 건전한 대형주가 적합합니다.',
  }
  if (score <= 4) return {
    type: '균형형',
    horizon: 'long_term',
    focus: '전체 균형',
    desc: '장기 탭에서 카테고리 점수가 고르게 높은 종목을 추천합니다. 7가지 카테고리가 골고루 좋은 종목이 이상적입니다.',
  }
  return {
    type: '공격형',
    horizon: 'short_term',
    focus: '상승세와 거래활발도',
    desc: '단기 탭에서 상승세와 거래활발도가 높은 종목에 주목하세요. 모멘텀이 강한 종목에서 단기 수익을 노릴 수 있습니다.',
  }
}

// FAQ 데이터
const FAQ_ITEMS = [
  {
    title: 'AI 랭킹은 어떻게 만들어지나요?',
    content: 'KOSPI200 종목의 OHLCV(주가/거래량), 재무제표, 뉴스 감성, ESG, 글로벌 지수 등 52개 데이터를 수집합니다. 이 데이터를 7가지 카테고리(상승세, 안전도, 수익성, 가치, 거래활발도, 시장반응, 사회책임)로 분류하여 AI 모델이 점수를 매기고, 종합 순위를 산출합니다. 매일 오전 6시에 자동 업데이트됩니다.',
  },
  {
    title: '장기와 단기는 뭐가 다른가요?',
    content: '장기(120일)는 약 6개월 보유를 기준으로 평가한 순위입니다. 안정적이고 꾸준한 성과를 기대하는 투자에 적합합니다. 단기(20일)는 약 1개월 보유를 기준으로 하며, 빠른 매매를 선호하는 투자자에게 적합합니다. 처음이라면 장기 탭부터 보시는 걸 추천합니다.',
  },
  {
    title: '7가지 카테고리는 무슨 뜻인가요?',
    content: 'categories', // 특수 처리
  },
  {
    title: '백테스트(과거 검증)란 뭔가요?',
    content: 'AI가 과거에도 좋은 추천을 했는지 확인하는 방법입니다. 예를 들어 10년 전부터 AI의 추천을 따랐다면 수익이 얼마였을지 시뮬레이션합니다. "과거 성과" 페이지에서 확인할 수 있으며, 과거 성과가 미래를 보장하지는 않습니다.',
  },
  {
    title: '점수가 높으면 무조건 사야 하나요?',
    content: '아닙니다. AI 점수는 과거 데이터 기반의 참고 자료일 뿐, 투자 판단은 반드시 본인이 직접 해야 합니다. 여러 종목에 분산 투자하고, 한 종목에 전 재산을 투자하지 마세요. AI 분석은 투자 권유가 아닙니다.',
  },
  {
    title: 'Sharpe, MDD, CAGR 같은 용어는 뭔가요?',
    content: 'CAGR(연평균 수익률): 매년 평균적으로 벌어들인 수익률입니다.\nMDD(최대낙폭): 투자 중 가장 많이 떨어진 폭입니다. -20%면 100만원이 80만원까지 빠진 적이 있다는 뜻입니다.\nSharpe(샤프비율): 위험 대비 수익 효율입니다. 1.0 이상이면 우수합니다.\nIC(정보계수): AI 예측과 실제 결과의 일치도입니다. 0.05 이상이면 유의미합니다.',
  },
]

// 퀴즈 질문
const QUIZ_QUESTIONS = [
  {
    question: '투자 기간은 어느 정도를 생각하고 계신가요?',
    options: [
      { label: '1개월 이내 (단기 매매)', value: 2 },
      { label: '3~6개월 (중기 보유)', value: 1 },
      { label: '1년 이상 (장기 투자)', value: 0 },
    ],
  },
  {
    question: '투자금의 몇 %까지 손실을 감수할 수 있나요?',
    options: [
      { label: '5% 이내 (안전 최우선)', value: 0 },
      { label: '10~15% (어느 정도 감수)', value: 1 },
      { label: '20% 이상도 괜찮음 (공격적)', value: 2 },
    ],
  },
  {
    question: '주식 투자 경험이 어느 정도인가요?',
    options: [
      { label: '처음이에요', value: 0 },
      { label: '1~3년 정도', value: 1 },
      { label: '3년 이상 경험자', value: 2 },
    ],
  },
]

export function GuidePage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]))
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null])
  const [showResult, setShowResult] = useState(false)

  const toggleFaq = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const setAnswer = (qIdx: number, value: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[qIdx] = value
      return next
    })
    setShowResult(false)
  }

  const allAnswered = answers.every((a) => a !== null)
  const result = allAnswered ? getStyleResult(answers[0]!, answers[1]!, answers[2]!) : null

  const handleShowResult = () => {
    if (result) {
      setShowResult(true)
      localStorage.setItem('investment_style', JSON.stringify(result))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">투자 가이드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 랭킹 서비스를 처음 이용하시는 분을 위한 안내입니다
        </p>
      </div>

      {/* 3단계 시작 가이드 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">처음 시작하는 분을 위한 3단계</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <Badge className="mt-0.5 shrink-0 bg-primary text-primary-foreground">1</Badge>
              <div>
                <p className="font-medium">
                  <Link to="/" className="text-primary hover:underline">랭킹 페이지</Link>에서 장기 탭의 TOP 10 확인
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  AI가 6개월 관점에서 가장 유망하다고 판단한 10개 종목을 봅니다
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge className="mt-0.5 shrink-0 bg-primary text-primary-foreground">2</Badge>
              <div>
                <p className="font-medium">관심 종목을 클릭하여 상세 분석 확인</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  카테고리별 점수, AI 분석 리포트, 현재 주가를 확인합니다
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge className="mt-0.5 shrink-0 bg-primary text-primary-foreground">3</Badge>
              <div>
                <p className="font-medium">직접 판단 후 투자 (AI는 참고용!)</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  AI 점수는 참고 자료일 뿐, 최종 결정은 본인이 하세요. 분산 투자를 권장합니다.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">자주 묻는 질문</h2>
        {FAQ_ITEMS.map((item, idx) => (
          <Card key={idx}>
            <button
              className="flex w-full items-center justify-between px-6 py-4 text-left"
              onClick={() => toggleFaq(idx)}
            >
              <span className="font-medium text-sm">{item.title}</span>
              {expanded.has(idx)
                ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>
            {expanded.has(idx) && (
              <CardContent className="pt-0 pb-4">
                {item.content === 'categories' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORY_KEYS.map((key) => (
                      <div key={key} className="flex items-start gap-2 rounded-lg border p-3">
                        <span className="text-lg">{CATEGORY_ICONS[key]}</span>
                        <div>
                          <p className="font-medium text-sm">{CATEGORY_LABELS[key]}</p>
                          <p className="text-xs text-muted-foreground">{CATEGORY_DESCRIPTIONS[key]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* 용어 사전 */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">용어 사전</h2>
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">지표</th>
                  <th className="py-2 pr-4 font-medium">한글 이름</th>
                  <th className="py-2 font-medium hidden sm:table-cell">설명</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(FEATURE_INFO).map(([key, info]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{key}</td>
                    <td className="py-2 pr-4 font-medium">
                      <span className="mr-1">{CATEGORY_ICONS[info.category]}</span>
                      {info.label}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground hidden sm:table-cell">
                      {FEATURE_DESCRIPTIONS[key] ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* 투자 성향 진단 (P1-12) */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">나의 투자 성향 진단</h2>
        <p className="text-sm text-muted-foreground">
          3개의 질문에 답하면 나에게 맞는 투자 스타일을 추천해드립니다
        </p>

        {QUIZ_QUESTIONS.map((q, qIdx) => (
          <Card key={qIdx}>
            <CardContent className="pt-4">
              <p className="mb-3 text-sm font-medium">
                Q{qIdx + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAnswer(qIdx, opt.value)}
                    className={cn(
                      'w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors',
                      answers[qIdx] === opt.value
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 결과 */}
        {allAnswered && !showResult && (
          <Button onClick={handleShowResult} className="w-full">
            결과 보기
          </Button>
        )}

        {showResult && result && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-5 pb-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
                  {result.type}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed">{result.desc}</p>
              <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  추천 설정: <strong>{result.horizon === 'long_term' ? '장기 탭' : '단기 탭'}</strong>에서{' '}
                  <strong>{result.focus}</strong> 중심으로 종목을 살펴보세요
                </p>
              </div>
              <div className="mt-3">
                <Link to="/">
                  <Button size="sm" variant="outline">
                    랭킹 보러 가기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 면책 */}
      <p className="text-xs text-center text-muted-foreground leading-relaxed pb-4">
        본 가이드는 교육 목적이며 투자 권유가 아닙니다.
        <br />
        AI 분석은 과거 데이터 기반이며 미래 수익을 보장하지 않습니다.
      </p>
    </div>
  )
}

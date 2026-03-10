import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useTheme } from '@/hooks/useTheme'

export function Layout() {
  const { dark, toggle } = useTheme()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header dark={dark} onToggleTheme={toggle} />
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-7">
        <Outlet />
      </main>
      <footer className="border-t bg-muted/30 py-4">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-7">
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            본 서비스는 투자 참고용이며, 투자 판단의 책임은 이용자 본인에게 있습니다.
            <br />
            AI 분석은 과거 데이터 기반이며 미래 수익을 보장하지 않습니다.
          </p>
        </div>
      </footer>
    </div>
  )
}

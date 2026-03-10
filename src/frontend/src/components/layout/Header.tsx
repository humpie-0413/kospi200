import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Moon, Sun, Menu, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  dark: boolean
  onToggleTheme: () => void
}

const NAV_ITEMS = [
  { to: '/', label: '랭킹' },
  { to: '/backtest', label: '과거 성과' },
  { to: '/admin', label: '관리자' },
]

export function Header({ dark, onToggleTheme }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, user, logout } = useAuth()

  const navLinks = NAV_ITEMS.map((item) => (
    <Link
      key={item.to}
      to={item.to}
      className={cn(
        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        pathname === item.to
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      {item.label}
    </Link>
  ))

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between px-4 sm:px-7">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold text-primary">
            KOSPI200 AI
          </Link>
          <nav className="hidden gap-1 md:flex">{navLinks}</nav>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user?.username}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { logout(); navigate('/') }}
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/login')}
              title="로그인"
            >
              <LogIn className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={onToggleTheme}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* 모바일 메뉴 */}
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="mt-8 flex flex-col gap-2">{navLinks}</nav>
              <div className="mt-6 border-t pt-4">
                {isLoggedIn ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { logout(); navigate('/') }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> 로그아웃
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/login')}
                  >
                    <LogIn className="mr-2 h-4 w-4" /> 로그인
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

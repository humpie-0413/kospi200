import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useTheme } from '@/hooks/useTheme'

export function Layout() {
  const { dark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <Header dark={dark} onToggleTheme={toggle} />
      <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-7">
        <Outlet />
      </main>
    </div>
  )
}

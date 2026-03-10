import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { AuthUser } from '@/types/auth'
import { createElement } from 'react'

interface AuthContextType {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isAdmin: false,
  isLoggedIn: false,
})

function readStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('auth_user')
    return stored ? (JSON.parse(stored) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.auth.login(username, password)
    localStorage.setItem('access_token', res.access_token)
    localStorage.setItem('refresh_token', res.refresh_token)
    // JWT payload에서 사용자 정보 추출
    const payload = JSON.parse(atob(res.access_token.split('.')[1])) as {
      sub: string
      is_admin: boolean
    }
    const authUser: AuthUser = { username: payload.sub, is_admin: payload.is_admin }
    localStorage.setItem('auth_user', JSON.stringify(authUser))
    setUser(authUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }, [])

  return createElement(
    AuthContext.Provider,
    { value: { user, login, logout, isAdmin: user?.is_admin ?? false, isLoggedIn: !!user } },
    children
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

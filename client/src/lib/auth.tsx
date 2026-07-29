import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from './api'

interface AuthUser {
  id: string
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'
  name: string
  isFirstLogin: boolean
  profile?: any
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (identifier: string, password: string, role: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const res = await authApi.me()
      const data = res.data
      setUser({
        id: data.id,
        role: data.role,
        name: data.profile?.fullName || data.profile?.student?.fullName || 'User',
        isFirstLogin: data.isFirstLogin,
        profile: data.profile,
      })
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
    const handler = () => { setUser(null) }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [fetchMe])

  const login = async (identifier: string, password: string, role: string): Promise<AuthUser> => {
    const res = await authApi.login({ identifier, password, role })
    const { user: u } = res.data
    const authUser: AuthUser = { id: u.id, role: u.role, name: u.name, isFirstLogin: u.isFirstLogin }
    setUser(authUser)
    return authUser
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

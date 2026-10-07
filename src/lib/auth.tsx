import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from './api'
import { api } from './services'
import { session } from './session'
import { canAccess, type NavItem } from './navigation'

interface AuthState {
  username: string
  isAuthenticated: boolean
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
  can: (item: Pick<NavItem, 'allowedUsers'>) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

async function resolveDeviceIp(): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal })
    clearTimeout(timer)
    const json = (await res.json()) as { ip?: string }
    return json.ip ?? ''
  } catch {
    return ''
  }
}

function describeDevice() {
  const ua = navigator.userAgent
  const platform = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Web'
  return `Web-${platform}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState(() => (session.getToken() || session.getUsername() ? session.getUsername() : ''))

  const logout = useCallback(() => {
    session.clear()
    queryClient.clear()
    setUsername('')
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  const login = useCallback(async (user: string, password: string, remember: boolean) => {
    const name = user.trim()
    const response = await api.login({
      username: name,
      password,
      deviceID: describeDevice(),
      deviceIP: await resolveDeviceIp(),
      uuid: session.getDeviceUuid(),
    })
    if (response?.status !== 'passed') {
      throw new Error(response?.message ?? 'Invalid username, password, or device information.')
    }
    session.save(response.token ?? null, name, response.menuoptionslist ?? '')
    session.setRememberedUsername(remember ? name : null)
    setUsername(name)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      username,
      isAuthenticated: !!username,
      login,
      logout,
      can: (item) => canAccess(item, username),
    }),
    [username, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

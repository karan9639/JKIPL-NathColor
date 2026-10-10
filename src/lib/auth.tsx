import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from './api'
import { loginUser, logoutUser } from '@/services/authAPI'
import { session } from './session'
import { canAccess, type NavItem } from './navigation'

interface AuthState {
  username: string
  isAuthenticated: boolean
  login: (email: string, password: string, remember: boolean) => Promise<void>
  logout: () => Promise<void>
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

  const logout = useCallback(async () => {
    try {
      // Call the backend logout endpoint, but always clear the local session.
      await logoutUser()
    } catch {
      // A network/API failure must not leave the user signed in locally.
    } finally {
      session.clear()
      queryClient.clear()
      setUsername('')
    }
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  const login = useCallback(async (userEmail: string, password: string, remember: boolean) => {
    const email = userEmail.trim().toLowerCase()
    const { data: response } = await loginUser({
      email,
      password,
      deviceID: describeDevice(),
      deviceIP: await resolveDeviceIp(),
      uuid: session.getDeviceUuid(),
    })

    // `response` is the backend response body (Axios has already unwrapped its own response).
    // Do not replace it with response.data: the backend nests the user there and
    // keeps `success: true` at the top level.
    const responseStatus = String(response?.status ?? '').toLowerCase()
    const isSuccess = response?.success === true ||
      Boolean(response?.token || response?.accessToken || response?.user?.token || response?.user?.accessToken) ||
      responseStatus === 'passed' ||
      responseStatus === 'success' ||
      responseStatus === 'successful'

    if (!isSuccess) {
      throw new Error(response?.message ?? 'Invalid username or password.')
    }

    const token = response.token ?? response.accessToken ?? response.data?.token ?? response.data?.accessToken ?? null
    const menuOptions = response.menuoptionslist ?? response.data?.menuoptionslist ?? ''
    const authenticatedUsername = response.data?.foundUser?.email ?? response.user?.username ?? email

    session.save(token, authenticatedUsername, menuOptions)
    session.setRememberedUsername(remember ? email : null)
    setUsername(authenticatedUsername)
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

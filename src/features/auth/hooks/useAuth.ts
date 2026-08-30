import { useEffect } from 'react'
import { useAuthStore } from '../store'

export function useAuth() {
  const { user, session, isLoading, isAuthenticated, initialize, login, register, logout } =
    useAuthStore()

  useEffect(() => {
    if (isLoading && !user) {
      initialize()
    }
  }, [isLoading, user, initialize])

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  }
}

export type UseAuthReturn = ReturnType<typeof useAuth>

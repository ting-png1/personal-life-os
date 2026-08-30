import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase'
import type { AuthState, User, LoginCredentials, RegisterCredentials } from './types'

interface AuthStore extends AuthState {
  initialize: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    // Supabase 未配置时，直接设置为未登录状态，不阻塞应用启动
    if (!isSupabaseConfigured || !supabase) {
      console.warn('[Auth] Supabase 未配置，跳过初始化')
      set({ user: null, session: null, isAuthenticated: false, isLoading: false })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            createdAt: session.user.created_at,
          },
          session,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({ user: null, session: null, isAuthenticated: false, isLoading: false })
      }

      // 监听认证状态变化
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set({
            user: {
              id: session.user.id,
              email: session.user.email || '',
              createdAt: session.user.created_at,
            },
            session,
            isAuthenticated: true,
          })
        } else {
          set({ user: null, session: null, isAuthenticated: false })
        }
      })
    } catch (error) {
      console.error('[Auth] 初始化失败:', error)
      set({ user: null, session: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async ({ email, password }) => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: '云同步未配置，请先设置 Supabase 环境变量' }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { success: false, error: error.message }
      }
      if (data.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            createdAt: data.user.created_at,
          },
          session: data.session,
          isAuthenticated: true,
        })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: '登录失败，请稍后重试' }
    }
  },

  register: async ({ email, password, confirmPassword }) => {
    if (password !== confirmPassword) {
      return { success: false, error: '两次输入的密码不一致' }
    }
    if (password.length < 6) {
      return { success: false, error: '密码长度至少 6 位' }
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: '云同步未配置，请先设置 Supabase 环境变量' }
    }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        return { success: false, error: error.message }
      }
      if (data.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            createdAt: data.user.created_at,
          },
          session: data.session,
          isAuthenticated: !!data.session,
        })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: '注册失败，请稍后重试' }
    }
  },

  logout: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('[Auth] 登出失败:', error)
      }
    }
    set({ user: null, session: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}))

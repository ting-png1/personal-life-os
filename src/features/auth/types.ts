export interface User {
  id: string
  email: string
  createdAt?: string
}

export interface AuthState {
  user: User | null
  session: unknown | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword: string
}

export type AuthMode = 'login' | 'register'

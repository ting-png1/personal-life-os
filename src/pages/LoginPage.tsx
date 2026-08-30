import { LoginForm } from '@/features/auth/components/LoginForm'

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-surface to-secondary-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Personal Life OS</h1>
          <p className="text-text-secondary">个人生活状态管理与智能规划</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

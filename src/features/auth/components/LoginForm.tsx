import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassInput } from '@/shared/ui/GlassInput'
import { useAuth } from '../hooks/useAuth'
import type { AuthMode } from '../types'

export function LoginForm() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const result = await login({ email, password })
        if (!result.success) {
          setError(result.error || '登录失败')
        } else {
          navigate('/today')
        }
      } else {
        const result = await register({ email, password, confirmPassword })
        if (!result.success) {
          setError(result.error || '注册失败')
        } else {
          setSuccessMessage('注册成功！请检查邮箱验证后登录')
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setSuccessMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <GlassCard className="w-full max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {mode === 'login' ? '登录' : '注册'}
        </h1>
        <p className="text-sm text-text-secondary">
          {mode === 'login' ? '登录以同步你的数据' : '创建账号以开始使用云同步'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <GlassInput
          label="邮箱"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="请输入邮箱"
          required
          autoComplete="email"
        />

        <GlassInput
          label="密码"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {mode === 'register' && (
          <GlassInput
            label="确认密码"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入密码"
            required
            autoComplete="new-password"
          />
        )}

        {error && (
          <div className="p-3 rounded-sm bg-error/10 text-error text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-sm bg-primary-50 text-primary-600 text-sm">
            {successMessage}
          </div>
        )}

        <GlassButton
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          {mode === 'login' ? '登录' : '注册'}
        </GlassButton>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={switchMode}
          className="text-sm text-text-secondary hover:text-primary-500 transition-colors"
        >
          {mode === 'login' ? '还没有账号？立即注册' : '已有账号？返回登录'}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-text-tertiary text-center">
          登录后你的待办、日程、情绪等数据将同步到云端，可在多设备间访问
        </p>
      </div>
    </GlassCard>
  )
}

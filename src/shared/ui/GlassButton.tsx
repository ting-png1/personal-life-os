import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-400 to-primary-500 text-white shadow-glow hover:from-primary-500 hover:to-primary-600 active:scale-[0.98]',
  secondary:
    'bg-surface text-text-primary border border-border backdrop-blur-md hover:bg-surface-hover active:scale-[0.98]',
  ghost:
    'text-text-secondary hover:text-primary-500 hover:bg-primary-50 active:scale-[0.98]',
  danger:
    'bg-error/10 text-error hover:bg-error/20 active:scale-[0.98]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-sm',
  md: 'h-11 px-5 text-base rounded-sm',
  lg: 'h-12 px-6 text-lg rounded-sm',
}

export function GlassButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...rest
}: GlassButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-200 select-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled || loading ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}

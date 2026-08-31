/**
 * GlassButton — 玻璃风格按钮
 *
 * 变体：
 * - primary: Dusty Rose 实色 + 白字（主要操作）
 * - secondary: surface-soft + 主色文字（次要操作）
 * - ghost: 透明背景 + 文字（三级操作/取消）
 * - danger: error/10 底色 + error 文字（删除）
 *
 * 向后兼容：支持 loading、leftIcon、rightIcon 属性。
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-400 text-white shadow-[0_4px_16px_rgba(150,96,111,0.25)] hover:bg-primary-500 active:scale-[0.98]',
  secondary:
    'surface-soft text-text-primary hover:bg-white/40 active:scale-[0.98]',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/20 active:scale-[0.98]',
  danger:
    'bg-error/10 text-error hover:bg-error/15 active:scale-[0.98]',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-[10px]',
  md: 'h-11 px-5 text-base rounded-[12px]',
  lg: 'h-13 px-6 text-lg rounded-[14px]',
}

export function GlassButton({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled = false,
  ...rest
}: GlassButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-normal ease-standard
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40
        disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}

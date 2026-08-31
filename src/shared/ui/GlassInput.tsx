/**
 * GlassInput — 玻璃风格输入框
 *
 * surface-soft 背景，聚焦时主色边框高亮。
 */

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function GlassInput({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...rest
}: GlassInputProps) {
  const inputId = id || `input-${label?.replace(/\s/g, '-') || Math.random().toString(36).slice(2)}`

  return (
    <div className={`w-full min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full min-w-0 max-w-full box-border h-11 px-4 rounded-[12px]
            appearance-none
            surface-soft text-text-primary text-sm
            placeholder:text-text-tertiary
            border border-transparent
            transition-all duration-normal ease-standard
            focus:outline-none focus:border-primary-400/40 focus:bg-white/40
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-error/40 focus:border-error/50' : ''}
          `}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}

/**
 * GlassTextarea — 玻璃风格多行输入框
 *
 * 与 GlassInput 风格一致，用于多行文本输入。
 */

interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function GlassTextarea({
  label,
  error,
  className = '',
  id,
  rows = 3,
  ...rest
}: GlassTextareaProps) {
  const textareaId = id || `textarea-${label?.replace(/\s/g, '-') || Math.random().toString(36).slice(2)}`

  return (
    <div className={`w-full min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`
          w-full px-4 py-3 rounded-[12px] resize-none
          surface-soft text-text-primary text-sm
          placeholder:text-text-tertiary
          border border-transparent
          transition-all duration-normal ease-standard
          focus:outline-none focus:border-primary-400/40 focus:bg-white/40
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-error/40 focus:border-error/50' : ''}
        `}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}

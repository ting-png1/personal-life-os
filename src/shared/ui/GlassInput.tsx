import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function GlassInput({ label, error, className = '', id, ...rest }: GlassInputProps) {
  const inputId = id || rest.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full h-11 px-4 rounded-sm
          bg-surface border border-border backdrop-blur-md
          text-text-primary placeholder:text-text-tertiary
          transition-all duration-200
          focus:outline-none focus:border-border-focus focus:shadow-glow
          ${error ? 'border-error focus:border-error' : ''}
          ${className}
        `}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}

interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function GlassTextarea({ label, error, className = '', id, ...rest }: GlassTextareaProps) {
  const inputId = id || rest.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`
          w-full min-h-[80px] px-4 py-3 rounded-sm resize-y
          bg-surface border border-border backdrop-blur-md
          text-text-primary placeholder:text-text-tertiary
          transition-all duration-200
          focus:outline-none focus:border-border-focus focus:shadow-glow
          ${error ? 'border-error focus:border-error' : ''}
          ${className}
        `}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}

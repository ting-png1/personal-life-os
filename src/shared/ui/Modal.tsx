/**
 * Modal — 玻璃风格模态弹窗
 *
 * glass-strong 背景，居中显示，backdrop 模糊。
 * 支持 ESC 关闭、backdrop 点击关闭、body 滚动锁定。
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-[420px]',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // body 滚动锁定
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`
          relative w-full ${maxWidth}
          glass-strong rounded-2xl overflow-hidden
          animate-scale-in
        `}
      >
        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/20 transition-colors"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-white/15 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

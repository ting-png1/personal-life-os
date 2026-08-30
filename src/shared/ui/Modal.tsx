import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* 面板 */}
      <div className="relative w-full max-w-md bg-surface-solid rounded-xl shadow-lg animate-scale-in overflow-hidden">
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-primary-50 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 内容 */}
        <div className="px-5 py-4">{children}</div>

        {/* 底部操作 */}
        {footer && <div className="px-5 py-4 border-t border-border flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

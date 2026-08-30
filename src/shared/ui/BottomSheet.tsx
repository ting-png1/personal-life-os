import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  height?: 'auto' | 'medium' | 'large'
}

const heightClasses = {
  auto: 'max-h-[85vh]',
  medium: 'h-[60vh]',
  large: 'h-[85vh]',
}

export function BottomSheet({ open, onClose, title, children, height = 'auto' }: BottomSheetProps) {
  // 锁定背景滚动
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

  // ESC 关闭
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* 面板 */}
      <div
        className={`
          relative w-full max-w-lg ${heightClasses[height]}
          bg-surface-solid rounded-t-xl shadow-lg
          animate-slide-up overflow-hidden
          flex flex-col
        `}
      >
        {/* 拖拽条 */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-text-tertiary/30" />
        </div>

        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
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
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

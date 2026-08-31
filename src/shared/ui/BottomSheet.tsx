/**
 * BottomSheet — 底部弹出面板
 *
 * glass-strong 背景，从底部滑入，带拖拽手柄。
 * 支持 ESC 关闭、backdrop 点击关闭、body 滚动锁定、safe-area 适配。
 *
 * iOS Safari 渲染兼容性：
 * 当日期/时间输入（datetime-local/date/time）聚焦时，iOS 原生选择器
 * 与 sheet 层的 glass-strong backdrop-filter（blur(28px)）会产生合成层
 * 渲染冲突（屏幕中央出现竖线/晕影）。
 *
 * 注意：backdrop 层的 Tailwind backdrop-blur-sm 因 CSS 变量未完整定义
 * 本身就是无效的（computed style 为 none），不是问题根源。
 *
 * 解决方案：
 * 1. BottomSheet 挂载时，检查子元素是否包含 datetime-local/date/time input。
 *    如果有，给 container 添加 `has-datetime-input` 类。
 * 2. CSS 规则：`.bottomsheet-container.has-datetime-input:focus-within .glass-strong`
 *    当包含日期输入的 BottomSheet 内有任何元素聚焦时，临时禁用 sheet 层的
 *    backdrop-filter，改用纯半透明背景，并隐藏伪元素光线层。
 * 3. 不包含日期输入的 BottomSheet（如 MoodQuickRecord 只有 textarea）不会添加
 *    `has-datetime-input` 类，因此聚焦时不会降级，保持 glass 效果。
 *
 * 为什么不用 JavaScript focusin 事件监听？
 * 在 Chrome 中，JS .focus() 在某些场景下不触发 focusin 事件（如焦点锁定、
 * 元素已有焦点等），导致降级不可靠。CSS :focus-within 是浏览器原生支持，
 * 更可靠。
 *
 * 为什么不用 :has(input[type="datetime-local"]:focus)？
 * Chrome 中 :has() 内部的 :focus 伪类在 JS .focus() 场景下不可靠
 * （element.matches(':focus') 返回 false）。
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// 需要触发 glass 降级的输入类型（iOS 原生选择器，会与 backdrop-filter 冲突）
const DATETIME_INPUT_TYPES = ['datetime-local', 'date', 'time']

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string
  // 向后兼容：旧版 API 使用 height
  height?: string
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = 'max-h-[75vh]',
  height,
}: BottomSheetProps) {
  // 向后兼容：height 映射到 maxHeight
  const resolvedMaxHeight = height || maxHeight

  const containerRef = useRef<HTMLDivElement>(null)

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

  // 挂载时检查子元素是否包含日期/时间输入，如果有则添加标记类
  // 用于 CSS :focus-within 精确降级（只有包含日期输入的 BottomSheet 才会降级）
  useEffect(() => {
    if (!open || !containerRef.current) return
    const container = containerRef.current

    const hasDatetimeInput = container.querySelector(
      DATETIME_INPUT_TYPES.map((t) => `input[type="${t}"]`).join(','),
    )

    if (hasDatetimeInput) {
      container.classList.add('has-datetime-input')
    }

    return () => {
      container.classList.remove('has-datetime-input')
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      ref={containerRef}
      className="bottomsheet-container fixed inset-0 z-[100] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — Tailwind backdrop-blur-sm 本身无效（CSS 变量未完整定义），
          实际为纯半透明 bg-black/20，不参与渲染冲突 */}
      <div
        className="bottomsheet-backdrop absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — glass-strong。包含日期输入的 BottomSheet 在聚焦时通过
          .has-datetime-input:focus-within 临时降级为纯半透明背景，
          避免与 iOS 原生选择器的渲染冲突 */}
      <div
        className={`
          relative w-full
          glass-strong rounded-t-3xl overflow-hidden
          flex flex-col
          ${resolvedMaxHeight}
          animate-slide-up
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'slide-up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-text-tertiary/30" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 py-2 text-center shrink-0">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          </div>
        )}

        {/* Content — flex-1 min-h-0 确保 Safari 中正确收缩并滚动 */}
        <div className="px-5 py-3 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

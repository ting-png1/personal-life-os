import { Check, Trash2 } from 'lucide-react'
import type { Todo } from '../types'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/shared/lib/constants'
import { formatMonthDay } from '@/shared/lib/date'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onClick?: (todo: Todo) => void
}

export function TodoItem({ todo, onToggle, onDelete, onClick }: TodoItemProps) {
  return (
    <div
      className={`
        group flex items-center gap-3 p-3 rounded-lg transition-all duration-200
        ${todo.completed ? 'opacity-60' : 'hover:bg-primary-50/50'}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={() => onClick?.(todo)}
    >
      {/* 复选框 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle(todo.id)
        }}
        className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
          transition-all duration-200
          ${todo.completed
            ? 'bg-primary-500 border-primary-500 text-white'
            : 'border-text-tertiary hover:border-primary-400'
          }
        `}
        aria-label={todo.completed ? '标记为未完成' : '标记为完成'}
      >
        {todo.completed && <Check className="w-3 h-3" />}
      </button>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            todo.completed ? 'line-through text-text-tertiary' : 'text-text-primary'
          }`}
        >
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {todo.dueDate && (
            <span className="text-xs text-text-tertiary">
              {formatMonthDay(todo.dueDate)}
            </span>
          )}
          <span
            className="text-xs font-medium"
            style={{ color: PRIORITY_COLORS[todo.priority] }}
          >
            {PRIORITY_LABELS[todo.priority]}
          </span>
        </div>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(todo.id)
        }}
        className="p-1.5 rounded-full text-text-tertiary hover:text-error hover:bg-error/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        aria-label="删除"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

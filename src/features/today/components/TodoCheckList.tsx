import { GlassCard } from '@/shared/ui/GlassCard'
import { SectionHeader } from '@/shared/ui/SectionHeader'
import { TodoItem } from '@/features/todo/components/TodoItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { CheckSquare } from 'lucide-react'
import type { Todo } from '@/features/todo/types'

interface TodoCheckListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onItemClick?: (todo: Todo) => void
  onAddClick?: () => void
}

export function TodoCheckList({ todos, onToggle, onDelete, onItemClick, onAddClick }: TodoCheckListProps) {
  return (
    <div>
      <SectionHeader
        title="今日待办"
        action={
          onAddClick && (
            <button
              onClick={onAddClick}
              className="text-xs text-primary-500 font-medium hover:underline"
            >
              添加
            </button>
          )
        }
      />
      <GlassCard padding="none">
        {todos.length === 0 ? (
          <div className="py-4">
            <EmptyState
              icon={<CheckSquare className="w-6 h-6" />}
              title="今天没有待办"
              description="添加一个待办开始今天"
            />
          </div>
        ) : (
          <div className="p-2">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={onToggle}
                onDelete={onDelete}
                onClick={onItemClick}
              />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

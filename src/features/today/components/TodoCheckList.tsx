import { GlassCard } from '@/shared/ui/GlassCard'
import { TodoItem } from '@/features/todo/components/TodoItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { CheckSquare } from 'lucide-react'
import type { Todo } from '@/features/todo/types'

interface TodoCheckListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onItemClick?: (todo: Todo) => void
}

export function TodoCheckList({ todos, onToggle, onDelete, onItemClick }: TodoCheckListProps) {
  return (
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
  )
}

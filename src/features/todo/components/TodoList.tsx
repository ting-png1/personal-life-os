import { TodoItem } from './TodoItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ListTodo } from 'lucide-react'
import type { Todo } from '../types'

interface TodoListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onItemClick?: (todo: Todo) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function TodoList({
  todos,
  onToggle,
  onDelete,
  onItemClick,
  emptyTitle = '暂无待办',
  emptyDescription = '点击右下角按钮添加新的待办事项',
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <EmptyState
        icon={<ListTodo className="w-8 h-8" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="space-y-1">
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
  )
}

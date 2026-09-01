import { TodoItem } from './TodoItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ListTodo } from 'lucide-react'
import type { Todo } from '../types'
import { isTodoCompletedOnDate } from '../services/todoServices'
import { todayStr } from '@/shared/lib/date'

interface TodoListProps {
  todos: Todo[]
  date?: string // 用于判断重复 Todo 的完成状态，默认为今天
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onItemClick?: (todo: Todo) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function TodoList({
  todos,
  date,
  onToggle,
  onDelete,
  onItemClick,
  emptyTitle = '暂无待办',
  emptyDescription = '点击右下角按钮添加新的待办事项',
}: TodoListProps) {
  const targetDate = date ?? todayStr()

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
          isCompleted={isTodoCompletedOnDate(todo, targetDate)}
          onToggle={onToggle}
          onDelete={onDelete}
          onClick={onItemClick}
        />
      ))}
    </div>
  )
}

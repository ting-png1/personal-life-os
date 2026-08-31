import { useState } from 'react'
import { Plus } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { Modal } from '@/shared/ui/Modal'
import { useTodos } from '@/features/todo/hooks/useTodos'
import { TodoList } from '@/features/todo/components/TodoList'
import { TodoForm } from '@/features/todo/components/TodoForm'
import { TodoFilterBar } from '@/features/todo/components/TodoFilterBar'
import type { TodoFilter } from '@/features/todo/services/todoServices'
import type { Todo, CreateTodoInput } from '@/features/todo/types'

export function TodoPage() {
  const [filter, setFilter] = useState<TodoFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null)

  const { todos, stats, create, update, toggleComplete, remove } = useTodos(filter)

  const handleCreate = async (input: CreateTodoInput) => {
    await create(input)
  }

  const handleUpdate = async (input: CreateTodoInput) => {
    if (!editingTodo) return
    await update(editingTodo.id, input)
  }

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingTodo(null)
  }

  return (
    <div className="pt-6">
      {/* ===== 顶部标题 ===== */}
      <header className="animate-fade-slide-up mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">待办</h1>
        <p className="text-sm text-text-secondary mt-1">
          共 {stats.total} 项 · 未完成 {stats.active} 项
        </p>
      </header>

      {/* ===== 筛选栏 ===== */}
      <section className="animate-fade-slide-up stagger-1 mb-6">
        <TodoFilterBar
          filter={filter}
          onChange={setFilter}
          total={stats.total}
          active={stats.active}
          completed={stats.completed}
        />
      </section>

      {/* ===== 待办列表 ===== */}
      <section className="animate-fade-slide-up stagger-2 mb-8">
        <GlassCard padding="none">
          <div className="p-2">
            <TodoList
              todos={todos}
              onToggle={toggleComplete}
              onDelete={(id) => {
                const todo = todos.find((t) => t.id === id)
                if (todo) setDeleteTarget(todo)
              }}
              onItemClick={handleEdit}
              emptyTitle={filter === 'completed' ? '还没有已完成的待办' : filter === 'active' ? '没有未完成的待办' : '暂无待办'}
              emptyDescription="点击右下角按钮添加新的待办事项"
            />
          </div>
        </GlassCard>
      </section>

      {/* 悬浮添加按钮 */}
      <button
        onClick={() => {
          setEditingTodo(null)
          setFormOpen(true)
        }}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full glass-strong flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-400) 85%, white)' }}
        aria-label="添加待办"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* 新建/编辑表单 */}
      <TodoForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={editingTodo ? handleUpdate : handleCreate}
        editingTodo={editingTodo}
      />

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除"
        footer={
          <>
            <GlassButton variant="ghost" onClick={() => setDeleteTarget(null)}>
              取消
            </GlassButton>
            <GlassButton variant="danger" onClick={handleDelete}>
              删除
            </GlassButton>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          确定要删除「{deleteTarget?.title}」吗？此操作无法撤销。
        </p>
      </Modal>
    </div>
  )
}

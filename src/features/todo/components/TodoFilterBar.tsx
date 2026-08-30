import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import type { TodoFilter } from '../services/todoServices'

interface TodoFilterBarProps {
  filter: TodoFilter
  onChange: (filter: TodoFilter) => void
  total: number
  active: number
  completed: number
}

export function TodoFilterBar({ filter, onChange, total, active, completed }: TodoFilterBarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <SegmentedControl
        size="sm"
        options={[
          { label: `全部 ${total}`, value: 'all' },
          { label: `未完成 ${active}`, value: 'active' },
          { label: `已完成 ${completed}`, value: 'completed' },
        ]}
        value={filter}
        onChange={onChange}
      />
    </div>
  )
}

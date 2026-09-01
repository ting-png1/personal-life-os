import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import type { TodoFilter } from '../services/todoServices'

interface TodoFilterBarProps {
  filter: TodoFilter
  onChange: (filter: TodoFilter) => void
  categoryFilter: string | null
  onCategoryChange: (category: string | null) => void
  categories: string[]
  total: number
  active: number
  completed: number
}

export function TodoFilterBar({
  filter,
  onChange,
  categoryFilter,
  onCategoryChange,
  categories,
  total,
  active,
  completed,
}: TodoFilterBarProps) {
  return (
    <div className="space-y-3">
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
      {categories.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onCategoryChange(null)}
            className={`
              px-2.5 py-1 rounded-full text-xs font-medium transition-all
              ${categoryFilter === null
                ? 'bg-primary-500 text-white'
                : 'bg-surface text-text-secondary border border-border hover:bg-white/40'
              }
            `}
          >
            全部分类
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`
                px-2.5 py-1 rounded-full text-xs font-medium transition-all
                ${categoryFilter === cat
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface text-text-secondary border border-border hover:bg-white/40'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

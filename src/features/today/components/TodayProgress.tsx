import { GlassCard } from '@/shared/ui/GlassCard'
import { Progress } from '@/shared/ui/Progress'
import { Trophy } from 'lucide-react'

interface TodayProgressProps {
  completedCount: number
  totalDue: number
  completionRate: number
}

export function TodayProgress({ completedCount, totalDue, completionRate }: TodayProgressProps) {
  const allDone = totalDue > 0 && completedCount === totalDue

  return (
    <GlassCard>
      <div className="flex items-center gap-4">
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center shrink-0
            ${allDone ? 'bg-success/20 text-success' : 'bg-primary-50 text-primary-400'}
          `}
        >
          <Trophy className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-text-primary">
              {allDone ? '今天的任务都完成了' : '今日进度'}
            </span>
            <span className="text-sm font-semibold text-primary-500">
              {completedCount} / {totalDue}
            </span>
          </div>
          <Progress value={completionRate} size="sm" />
          {allDone && (
            <p className="text-xs text-success mt-1.5">做得好，休息一下吧！</p>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

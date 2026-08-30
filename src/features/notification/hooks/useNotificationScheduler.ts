// ============================================================
// useNotificationScheduler - 通知调度器
// 自动为 Todo 截止时间和课程开始时间调度提醒
// ============================================================

import { useEffect, useRef } from 'react'
import { useTodoStore } from '@/features/todo/store'
import { useScheduleStore } from '@/features/schedule/store'
import { useNotificationStore } from '@/features/notification/store'
import type { Todo } from '@/features/todo/types'
import type { ScheduleEvent } from '@/features/schedule/types'

export function useNotificationScheduler() {
  const todos = useTodoStore((s) => s.todos)
  const scheduleEvents = useScheduleStore((s) => s.events)
  const settings = useNotificationStore((s) => s.settings)
  const scheduleNotification = useNotificationStore((s) => s.scheduleNotification)
  const cancelScheduledByRelatedId = useNotificationStore((s) => s.cancelScheduledByRelatedId)

  // 记录已调度的任务 ID，避免重复调度
  const scheduledIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!settings.enabled) return

    const now = Date.now()

    // ============================================================
    // Todo 截止提醒
    // ============================================================
    if (settings.todoReminders.enabled) {
      const remindBeforeMs = settings.todoReminders.remindBefore * 60 * 1000

      todos.forEach((todo: Todo) => {
        // 跳过已完成或没有截止时间的 Todo
        if (todo.completed || !todo.dueDate) return

        const dueTime = new Date(todo.dueDate).getTime()
        const triggerTime = dueTime - remindBeforeMs
        const scheduleKey = `todo-${todo.id}`

        // 如果已经调度过，跳过
        if (scheduledIdsRef.current.has(scheduleKey)) return

        // 只调度未来的提醒
        if (triggerTime > now) {
          scheduledIdsRef.current.add(scheduleKey)
          scheduleNotification({
            type: 'todo',
            title: '待办即将到期',
            body: `${todo.title} 将在 ${settings.todoReminders.remindBefore} 分钟后到期`,
            triggerAt: triggerTime,
            priority: 'normal',
            relatedId: todo.id,
          })
        }
      })
    }

    // ============================================================
    // 课程/日程开始提醒
    // ============================================================
    if (settings.scheduleReminders.enabled) {
      const remindBeforeMs = settings.scheduleReminders.remindBefore * 60 * 1000

      scheduleEvents.forEach((event: ScheduleEvent) => {
        const startTime = new Date(event.startDateTime).getTime()
        const triggerTime = startTime - remindBeforeMs
        const scheduleKey = `schedule-${event.id}`

        // 如果已经调度过，跳过
        if (scheduledIdsRef.current.has(scheduleKey)) return

        // 只调度未来的提醒
        if (triggerTime > now) {
          scheduledIdsRef.current.add(scheduleKey)
          scheduleNotification({
            type: 'schedule',
            title: event.type === 'class' ? '课程即将开始' : '日程即将开始',
            body: `${event.title} 将在 ${settings.scheduleReminders.remindBefore} 分钟后开始${event.location ? `，地点：${event.location}` : ''}`,
            triggerAt: triggerTime,
            priority: 'high',
            relatedId: event.id,
          })
        }
      })
    }
  }, [todos, scheduleEvents, settings, scheduleNotification])

  // 当 Todo 或 Schedule 被删除时，取消对应的定时任务
  useEffect(() => {
    const todoIds = new Set(todos.map((t) => t.id))
    const scheduleIds = new Set(scheduleEvents.map((e) => e.id))

    // 检查已调度的任务是否还有对应的数据
    scheduledIdsRef.current.forEach((key) => {
      const [type, id] = key.split('-')
      if (type === 'todo' && !todoIds.has(id)) {
        scheduledIdsRef.current.delete(key)
        cancelScheduledByRelatedId(id)
      } else if (type === 'schedule' && !scheduleIds.has(id)) {
        scheduledIdsRef.current.delete(key)
        cancelScheduledByRelatedId(id)
      }
    })
  }, [todos, scheduleEvents, cancelScheduledByRelatedId])
}

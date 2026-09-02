/**
 * 距离下一个本地日历日的毫秒数。
 * 加少量缓冲，避免定时器在系统时钟边界前几毫秒触发后仍得到旧日期。
 */
export function millisecondsUntilNextLocalDate(now: Date): number {
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)
  return Math.max(1, nextMidnight.getTime() - now.getTime() + 50)
}

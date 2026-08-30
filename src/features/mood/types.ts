// ============================================================
// Mood Domain Types
// ============================================================

export type MoodLevel = 1 | 2 | 3 | 4 | 5
// 1=很糟, 2=不好, 3=平稳, 4=不错, 5=很好

export interface MoodRecord {
  id: string
  date: string // "YYYY-MM-DD"，按天分组
  level: MoodLevel
  tags: string[]
  note: string | null
  createdAt: string // 完整 ISO 时间戳，同一天多条时排序用
  updatedAt: string
}

export interface CreateMoodInput {
  level: MoodLevel
  tags?: string[]
  note?: string | null
  // date 自动设为今天，createdAt 自动生成
}

export type UpdateMoodInput = Partial<Pick<MoodRecord, 'level' | 'tags' | 'note'>>

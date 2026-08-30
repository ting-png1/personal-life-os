// ============================================================
// AI Domain Types
// AI 智能建议模块的领域模型
// 注意：AI 只产生建议，不直接修改数据
// ============================================================

/** 建议类型 */
export type SuggestionType = 'todo' | 'schedule' | 'rest' | 'mood' | 'general'

/** 单条 AI 建议 */
export interface AISuggestion {
  id: string;                    // UUID
  type: SuggestionType;          // 建议类型
  title: string;                 // 建议标题（简短）
  description: string;           // 建议详情
  priority: 'high' | 'medium' | 'low';  // 建议优先级
  action?: AISuggestionAction;   // 可选的执行动作（用户确认后执行）
}

/** 建议执行动作 */
export interface AISuggestionAction {
  type: 'navigate' | 'create_todo' | 'create_schedule' | 'record_mood';
  payload: Record<string, unknown>;
}

/** AI 建议状态 */
export type AIRecommendationStatus = 'pending' | 'confirmed' | 'dismissed'

/** AI 建议（一次完整的 AI 分析结果） */
export interface AIRecommendation {
  id: string;                    // UUID
  date: string;                   // "YYYY-MM-DD"，哪一天的建议
  summary: string;                // 今日状态总结（一段文字）
  suggestions: AISuggestion[];    // 建议列表
  status: AIRecommendationStatus; // 建议状态
  createdAt: string;              // ISO 时间戳
}

/** AI 设置（存储在 localStorage） */
export interface AISettings {
  apiKey: string;                 // DeepSeek API Key
  dailyLimit: number;             // 每日调用上限（默认 3）
  model: string;                  // 模型名称（默认 deepseek-chat）
  enabled: boolean;               // 是否启用 AI 功能
}

/** 每日使用计数（存储在 localStorage） */
export interface AIDailyUsage {
  date: string;                   // "YYYY-MM-DD"
  count: number;                  // 已用次数
}

/** AI 生成请求的输入数据（今日状态聚合） */
export interface AIGenerationInput {
  date: string;
  weekday: string;
  mood: {
    hasRecorded: boolean;
    latestLevel: number | null;
    latestNote: string | null;
  };
  schedule: {
    total: number;
    items: Array<{ title: string; startTime: string; endTime: string; type: string }>;
  };
  todos: {
    total: number;
    completed: number;
    pending: Array<{ title: string; priority: number; dueDate: string | null }>;
  };
  cycle: {
    isInPeriod: boolean;
    currentPhase: string | null;
    daysUntilNextPeriod: number | null;
  };
}

/** DeepSeek API 响应格式 */
export interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** AI 生成结果（解析后的结构化数据） */
export interface AIGenerationResult {
  summary: string;
  suggestions: Array<{
    type: SuggestionType;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

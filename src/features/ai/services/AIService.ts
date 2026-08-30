// ============================================================
// AIService
// AI 智能建议服务：构建 prompt、调用 DeepSeek API、解析响应
// 注意：AI 只产生建议，不直接修改数据
// ============================================================

import type {
  AIGenerationInput,
  AIGenerationResult,
  AIRecommendation,
  AISuggestion,
  DeepSeekResponse,
  SuggestionType,
} from '../types'
import { generateId } from '@/shared/lib/id'
import { nowISO, todayStr } from '@/shared/lib/date'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

/** 系统提示词：定义 AI 角色、行为和输出格式 */
function buildSystemPrompt(): string {
  return `你是一个温暖、贴心的个人生活助手。你的任务是根据用户今天的真实状态（情绪、日程、待办、生理周期），给出简短的状态总结和 2-4 条具体可执行的建议。

规则：
1. 语气温暖、支持、不啰嗦、不说教
2. 不做医疗诊断，不提供医疗建议
3. 建议要具体、可执行，不要空泛的"注意休息"
4. 如果用户情绪不好，先共情再给建议
5. 如果待办很多，建议优先级和时间分配
6. 如果在经期，建议温和的活动和休息
7. 总结不超过 80 字
8. 建议数量 2-4 条

必须严格输出以下 JSON 格式，不要输出任何其他文字：
{
  "summary": "今天的状态总结",
  "suggestions": [
    {
      "type": "todo" | "schedule" | "rest" | "mood" | "general",
      "title": "简短的建议标题",
      "description": "具体的建议内容",
      "priority": "high" | "medium" | "low"
    }
  ]
}`
}

/** 用户提示词：将今日状态数据转为自然语言描述 */
function buildUserPrompt(input: AIGenerationInput): string {
  const lines: string[] = []

  lines.push(`今天是 ${input.date} ${input.weekday}。`)

  // 情绪
  if (input.mood.hasRecorded && input.mood.latestLevel) {
    const moodText = ['', '很糟', '不好', '平稳', '不错', '很好'][input.mood.latestLevel] || '未知'
    lines.push(`情绪状态：${moodText}。`)
    if (input.mood.latestNote) {
      lines.push(`情绪备注：${input.mood.latestNote}`)
    }
  } else {
    lines.push('今天还没有记录情绪。')
  }

  // 日程
  if (input.schedule.total > 0) {
    lines.push(`今日有 ${input.schedule.total} 项日程：`)
    input.schedule.items.forEach((item) => {
      const typeText: Record<string, string> = {
        class: '课程',
        personal: '个人',
        rest: '休息',
        other: '其他',
      }
      lines.push(`  - ${item.startTime}-${item.endTime} ${item.title}（${typeText[item.type] || item.type}）`)
    })
  } else {
    lines.push('今天没有日程安排。')
  }

  // 待办
  lines.push(`待办：共 ${input.todos.total} 项，已完成 ${input.todos.completed} 项。`)
  if (input.todos.pending.length > 0) {
    lines.push('未完成的待办：')
    input.todos.pending.forEach((todo) => {
      const priorityText = ['', '高', '中', '低'][todo.priority] || '中'
      const dueText = todo.dueDate ? `（截止 ${todo.dueDate}）` : ''
      lines.push(`  - ${todo.title} [优先级:${priorityText}]${dueText}`)
    })
  }

  // 周期
  if (input.cycle.isInPeriod) {
    lines.push('生理周期：今天在经期。')
  } else if (input.cycle.currentPhase) {
    const phaseText: Record<string, string> = {
      follicular: '卵泡期',
      ovulation: '排卵期',
      luteal: '黄体期',
    }
    lines.push(`生理周期：当前处于${phaseText[input.cycle.currentPhase] || input.cycle.currentPhase}。`)
    if (input.cycle.daysUntilNextPeriod !== null) {
      lines.push(`距离下次经期还有 ${input.cycle.daysUntilNextPeriod} 天。`)
    }
  }

  lines.push('请根据以上信息，给出今天的状态总结和建议。')

  return lines.join('\n')
}

/** 调用 DeepSeek Chat API */
async function callDeepSeekAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`)
  }

  const data: DeepSeekResponse = await response.json()
  if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
    throw new Error('DeepSeek API 返回格式异常')
  }

  return data.choices[0].message.content
}

/** 解析 AI 响应为结构化数据 */
function parseAIResponse(content: string): AIGenerationResult {
  // 尝试提取 JSON（AI 可能在 JSON 前后有其他文字）
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('无法从 AI 响应中提取 JSON')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.summary || !Array.isArray(parsed.suggestions)) {
      throw new Error('JSON 格式不完整')
    }

    const suggestions = parsed.suggestions
      .filter((s: { type: string; title: string; description: string; priority: string }) =>
        s && s.title && s.description
      )
      .map((s: { type: string; title: string; description: string; priority: string }) => ({
        type: (['todo', 'schedule', 'rest', 'mood', 'general'].includes(s.type)
          ? s.type
          : 'general') as SuggestionType,
        title: String(s.title).slice(0, 50),
        description: String(s.description).slice(0, 200),
        priority: (['high', 'medium', 'low'].includes(s.priority)
          ? s.priority
          : 'medium') as 'high' | 'medium' | 'low',
      }))

    return {
      summary: String(parsed.summary).slice(0, 200),
      suggestions: suggestions.slice(0, 4), // 最多 4 条建议
    }
  } catch (err) {
    throw new Error(`解析 AI 响应失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
}

/** 将生成结果转为 AIRecommendation 实体 */
function toRecommendation(result: AIGenerationResult): AIRecommendation {
  const suggestions: AISuggestion[] = result.suggestions.map((s) => ({
    id: generateId(),
    type: s.type,
    title: s.title,
    description: s.description,
    priority: s.priority,
  }))

  return {
    id: generateId(),
    date: todayStr(),
    summary: result.summary,
    suggestions,
    status: 'pending',
    createdAt: nowISO(),
  }
}

/**
 * 生成今日 AI 建议（主入口）
 * @param input 今日状态数据
 * @param apiKey DeepSeek API Key
 * @param model 模型名称
 * @param maxRetries 最大重试次数（默认 1）
 */
export async function generateAIRecommendation(
  input: AIGenerationInput,
  apiKey: string,
  model: string = 'deepseek-chat',
  maxRetries: number = 1
): Promise<AIRecommendation> {
  if (!apiKey) {
    throw new Error('未配置 API Key')
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(input)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const content = await callDeepSeekAPI(apiKey, model, systemPrompt, userPrompt)
      const result = parseAIResponse(content)
      return toRecommendation(result)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // 如果是解析错误，重试一次（可能是 AI 输出格式问题）
      if (attempt < maxRetries && lastError.message.includes('解析') || lastError.message.includes('JSON')) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }
      // API 错误不重试（可能是 Key 无效或额度不足）
      break
    }
  }

  throw lastError || new Error('AI 生成失败')
}

/**
 * 从当前应用状态构建 AIGenerationInput
 * 这是一个纯函数，接收各模块数据，返回 AI 输入
 */
export function buildAIGenerationInput(params: {
  date: string
  weekday: string
  moodHasRecorded: boolean
  moodLatestLevel: number | null
  moodLatestNote: string | null
  scheduleTotal: number
  scheduleItems: Array<{ title: string; startTime: string; endTime: string; type: string }>
  todosTotal: number
  todosCompleted: number
  todosPending: Array<{ title: string; priority: number; dueDate: string | null }>
  cycleIsInPeriod: boolean
  cycleCurrentPhase: string | null
  cycleDaysUntilNextPeriod: number | null
}): AIGenerationInput {
  return {
    date: params.date,
    weekday: params.weekday,
    mood: {
      hasRecorded: params.moodHasRecorded,
      latestLevel: params.moodLatestLevel,
      latestNote: params.moodLatestNote,
    },
    schedule: {
      total: params.scheduleTotal,
      items: params.scheduleItems,
    },
    todos: {
      total: params.todosTotal,
      completed: params.todosCompleted,
      pending: params.todosPending,
    },
    cycle: {
      isInPeriod: params.cycleIsInPeriod,
      currentPhase: params.cycleCurrentPhase,
      daysUntilNextPeriod: params.cycleDaysUntilNextPeriod,
    },
  }
}

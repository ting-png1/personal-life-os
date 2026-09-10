import type {
  IntelligenceProvider,
  ProviderNeutralIntelligenceRequest,
  ProviderNeutralIntelligenceResult,
} from '../types.ts'

export interface RivenCompletionGateway {
  complete(input: {
    model: string
    systemPrompt: string
    userPrompt: string
  }): Promise<{
    content: string
    providerRequestId: string | null
  }>
}

interface RivenProviderOptions {
  model: string
  gateway: RivenCompletionGateway
}

const RIVEN_SYSTEM_PROMPT = `你是 LifeOS 中的 Riven。你只根据本次请求内已授权、带来源的 context 回答。

边界：
1. 不把推断或建议说成事实，不做医疗诊断。
2. 不声称已经修改 Todo、Schedule、Mood、Health、Continuity 或任何其他数据。
3. 只引用 request.context.manifest.included 中真实存在的 domain；relationship-continuity 引用还必须带相同 relationshipId。
4. 每条 statement 必须分类为 inference 或 suggestion，并通过 basedOn 标明依据。
5. 回答简洁、温和、具体，使用用户请求所用的语言。

必须只输出以下 JSON，不要使用 Markdown 代码块或附加文字：
{
  "schemaVersion": "1",
  "kind": "intelligence-result",
  "summary": "对用户请求的直接回答",
  "statements": [
    {
      "classification": "inference" | "suggestion",
      "content": "明确标注性质的补充判断或建议",
      "basedOn": [{ "domain": "current-life-state" }]
    }
  ]
}`

function extractStructuredOutput(content: string): unknown {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return content

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return content
  }
}

/** Provider adapter only; validation remains owned by Intelligence Runtime. */
export class RivenProvider implements IntelligenceProvider {
  readonly id = 'riven'
  private readonly options: RivenProviderOptions

  constructor(options: RivenProviderOptions) {
    this.options = options
  }

  async complete(
    request: ProviderNeutralIntelligenceRequest,
  ): Promise<ProviderNeutralIntelligenceResult> {
    const response = await this.options.gateway.complete({
      model: this.options.model,
      systemPrompt: RIVEN_SYSTEM_PROMPT,
      userPrompt: JSON.stringify(request),
    })

    const structuredOutput = extractStructuredOutput(response.content)
    const summary =
      typeof structuredOutput === 'object' &&
      structuredOutput !== null &&
      'summary' in structuredOutput &&
      typeof structuredOutput.summary === 'string'
        ? structuredOutput.summary
        : response.content

    return {
      content: summary,
      providerRequestId: response.providerRequestId,
      structuredOutputs: [structuredOutput],
    }
  }
}

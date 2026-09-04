import type {
  IntelligenceProvider,
  IntelligenceResponse,
  ProviderNeutralIntelligenceRequest,
} from '../types.ts'

export interface BuildIntelligenceRequestInput {
  requestId: string
  requestedAt: string
  instruction: string
  context: ProviderNeutralIntelligenceRequest['context']
}

export function buildIntelligenceRequest(
  input: BuildIntelligenceRequestInput,
): ProviderNeutralIntelligenceRequest {
  const instruction = input.instruction.trim()
  if (instruction.length === 0) {
    throw new Error('Intelligence instruction must not be empty')
  }

  return {
    schemaVersion: '1',
    requestId: input.requestId,
    requestedAt: input.requestedAt,
    trigger: 'user',
    instruction,
    context: input.context,
  }
}

export async function sendToIntelligenceProvider(
  provider: IntelligenceProvider,
  request: ProviderNeutralIntelligenceRequest,
  completedAt: () => string,
): Promise<IntelligenceResponse> {
  const result = await provider.complete(request)
  const content = result.content.trim()
  if (content.length === 0) {
    throw new Error(`Intelligence provider returned empty content: ${provider.id}`)
  }
  if (
    result.structuredOutputs !== undefined &&
    !Array.isArray(result.structuredOutputs)
  ) {
    throw new Error(`Intelligence provider returned invalid structured outputs: ${provider.id}`)
  }

  return {
    requestId: request.requestId,
    providerId: provider.id,
    providerRequestId: result.providerRequestId,
    content,
    completedAt: completedAt(),
    ...(result.structuredOutputs === undefined
      ? {}
      : { structuredOutputs: result.structuredOutputs }),
  }
}

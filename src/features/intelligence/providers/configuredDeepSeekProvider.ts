import type { AISettings } from '../../ai/types'
import { callDeepSeekAPI } from '../../ai/services/AIService'
import { DeepSeekProvider } from './DeepSeekProvider'

/** Browser composition root for the currently configured concrete provider. */
export function createConfiguredDeepSeekProvider(settings: AISettings) {
  if (!settings.enabled || settings.apiKey.trim().length === 0) return null

  return new DeepSeekProvider({
    model: settings.model,
    gateway: {
      async complete({ model, systemPrompt, userPrompt }) {
        return {
          content: await callDeepSeekAPI(
            settings.apiKey,
            model,
            systemPrompt,
            userPrompt,
          ),
          providerRequestId: null,
        }
      },
    },
  })
}

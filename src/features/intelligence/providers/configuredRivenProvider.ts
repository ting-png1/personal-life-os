import type { AISettings } from '../../ai/types'
import { callDeepSeekAPI } from '../../ai/services/AIService'
import { RivenProvider } from './RivenProvider'

/** Browser composition root for the currently configured Riven provider. */
export function createConfiguredRivenProvider(settings: AISettings) {
  if (!settings.enabled || settings.apiKey.trim().length === 0) return null

  return new RivenProvider({
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

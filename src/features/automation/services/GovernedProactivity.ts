import type { ContextReaders, IntelligenceProvider } from '../../intelligence/types.ts'
import type {
  AutomationGovernanceSettings,
  ProactiveAutomationResult,
  ProactiveTrigger,
  ProactiveUsageLedger,
} from '../types.ts'
import { runProactiveAutomation } from './ProactiveAutomation.ts'

export interface AutomationSettingsReader {
  load(): AutomationGovernanceSettings
}

/**
 * Application entry for a host-delivered trigger. Durable opt-in is loaded before
 * any Context read; an absent provider degrades without consuming call budget.
 */
export async function runGovernedProactivity(input: {
  trigger: ProactiveTrigger
  readers: ContextReaders
  provider: IntelligenceProvider | null
  settings: AutomationSettingsReader
  usage: ProactiveUsageLedger
  now: () => string
  generateId: () => string
}): Promise<ProactiveAutomationResult> {
  let governance: AutomationGovernanceSettings
  try {
    governance = input.settings.load()
  } catch {
    return { status: 'degraded', reason: 'governance-state-unavailable' }
  }

  if (!governance.proactive.dailyReview) {
    return { status: 'skipped', reason: 'not-opted-in' }
  }
  if (!input.provider) {
    return { status: 'degraded', reason: 'provider-unavailable' }
  }

  return runProactiveAutomation({
    trigger: input.trigger,
    settings: governance,
    readers: input.readers,
    provider: input.provider,
    usage: input.usage,
    now: input.now,
    generateId: input.generateId,
  })
}

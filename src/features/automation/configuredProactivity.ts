import type { LocalContextReaderInput } from '../intelligence/services/LocalContextReaders'
import { createConfiguredIntelligenceContextReaders } from '../intelligence/services/configuredContextReaders'
import type { IntelligenceProvider } from '../intelligence/types'
import { generateId } from '@/shared/lib/id'
import { nowISO } from '@/shared/lib/date'
import { LocalAutomationSettingsRepository } from './settingsRepository'
import { runGovernedProactivity } from './services/GovernedProactivity'
import { LocalProactiveUsageLedger } from './services/ProactiveUsageLedger'
import type { ProactiveTrigger } from './types'

/** Browser composition root. The host remains responsible for delivering triggers. */
export function runConfiguredProactivity(input: {
  trigger: ProactiveTrigger
  context: LocalContextReaderInput
  provider: IntelligenceProvider | null
}) {
  return runGovernedProactivity({
    trigger: input.trigger,
    readers: createConfiguredIntelligenceContextReaders(input.context),
    provider: input.provider,
    settings: new LocalAutomationSettingsRepository(localStorage),
    usage: new LocalProactiveUsageLedger(localStorage),
    now: nowISO,
    generateId,
  })
}

import type { LocalContextReaderInput } from '../intelligence/services/LocalContextReaders'
import { createConfiguredIntelligenceContextReaders } from '../intelligence/services/configuredContextReaders'
import { createLifeOSReadBridge } from './LifeOSBridge'

/** Browser composition root; external hosts can provide their own read adapter. */
export function createConfiguredLifeOSReadBridge(
  input: LocalContextReaderInput,
) {
  return createLifeOSReadBridge(
    createConfiguredIntelligenceContextReaders(input),
  )
}

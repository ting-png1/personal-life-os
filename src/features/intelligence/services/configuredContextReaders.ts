import { continuityRepository } from '../../continuity/repository.ts'
import { healthRepository } from '../../health/repository.ts'
import { moodRepository } from '../../mood/repository.ts'
import {
  createLocalContextReaders,
  type LocalContextReaderInput,
} from './LocalContextReaders.ts'

/** Browser composition root for the established Local-First read owners. */
export function createConfiguredIntelligenceContextReaders(
  input: LocalContextReaderInput,
) {
  return createLocalContextReaders(input, {
    timelineSources: {
      health: healthRepository,
      mood: moodRepository,
    },
    continuity: continuityRepository,
  })
}

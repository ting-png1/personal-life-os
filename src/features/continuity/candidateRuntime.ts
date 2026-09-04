import { nowISO } from '../../shared/lib/date.ts'
import { continuityRepository } from './repository.ts'
import type { ConfirmContinuityCandidateDependencies } from './services/ContinuityCandidate.ts'

/** Local-First adapter used only after an explicit Candidate confirmation. */
export const localContinuityCandidateRuntime: ConfirmContinuityCandidateDependencies = {
  continuity: continuityRepository,
  now: nowISO,
}

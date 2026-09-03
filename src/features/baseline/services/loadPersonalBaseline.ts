import {
  addDays,
  formatLocalDate,
  parseLocalDate,
} from '../../../shared/lib/date.ts'
import {
  loadTimeline,
  type TimelineSources,
} from '../../timeline/services/loadTimeline.ts'
import type { PersonalBaseline } from '../types.ts'
import {
  BASELINE_LOOKBACK_DAYS,
  buildPersonalBaseline,
} from './BaselineBuilder.ts'

/**
 * Loads exactly the facts needed for one personal baseline: the anchor day plus
 * its preceding lookback window. Persistence remains owned by source domains.
 */
export async function loadPersonalBaseline(
  anchorDate: string,
  sources: TimelineSources,
): Promise<PersonalBaseline> {
  const anchor = parseLocalDate(anchorDate)

  if (formatLocalDate(anchor) !== anchorDate) {
    throw new Error('anchorDate must be a valid local date in YYYY-MM-DD format')
  }

  const timeline = await loadTimeline(
    {
      startDate: formatLocalDate(addDays(anchor, -BASELINE_LOOKBACK_DAYS)),
      endDate: anchorDate,
    },
    sources,
  )

  return buildPersonalBaseline(timeline, anchorDate)
}

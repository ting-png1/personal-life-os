import {
  DEFAULT_AUTOMATION_GOVERNANCE,
  type AutomationGovernanceSettings,
} from './types.ts'
import { automationGovernanceIsValid } from './services/AutomationGovernance.ts'

interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'lifeos_automation_governance_v1'

function cloneSettings(
  settings: AutomationGovernanceSettings,
): AutomationGovernanceSettings {
  return JSON.parse(JSON.stringify(settings)) as AutomationGovernanceSettings
}

/** Preferences only: no facts, assembled Context, prompts, or provider output. */
export class LocalAutomationSettingsRepository {
  private readonly storage: KeyValueStorage

  constructor(storage: KeyValueStorage) {
    this.storage = storage
  }

  load(): AutomationGovernanceSettings {
    try {
      const raw = this.storage.getItem(STORAGE_KEY)
      if (!raw) return cloneSettings(DEFAULT_AUTOMATION_GOVERNANCE)
      const parsed: unknown = JSON.parse(raw)
      return automationGovernanceIsValid(parsed)
        ? cloneSettings(parsed)
        : cloneSettings(DEFAULT_AUTOMATION_GOVERNANCE)
    } catch {
      return cloneSettings(DEFAULT_AUTOMATION_GOVERNANCE)
    }
  }

  save(settings: AutomationGovernanceSettings): AutomationGovernanceSettings {
    if (!automationGovernanceIsValid(settings)) {
      throw new Error('Invalid automation governance settings')
    }
    const saved = cloneSettings(settings)
    this.storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    return saved
  }
}

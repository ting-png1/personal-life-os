import { BACKGROUND_PREFERENCE_STORAGE_KEY } from '../../shared/lib/storageKeys.ts'

export const BACKGROUND_PREFERENCE_SCHEMA_VERSION = 1
export const MAX_BACKGROUND_DATA_URL_LENGTH = 2_000_000

export type BackgroundPreference =
  | {
      schemaVersion: 1
      mode: 'default'
    }
  | {
      schemaVersion: 1
      mode: 'custom'
      imageDataUrl: string
      updatedAt: string
    }

export type BackgroundPersistenceResult =
  | { ok: true; preference: BackgroundPreference }
  | { ok: false; reason: 'invalid-image' | 'storage-unavailable' | 'storage-failed' }

export const DEFAULT_BACKGROUND_PREFERENCE: BackgroundPreference = {
  schemaVersion: BACKGROUND_PREFERENCE_SCHEMA_VERSION,
  mode: 'default',
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isSafeImageDataUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_BACKGROUND_DATA_URL_LENGTH &&
    /^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(value)
  )
}

export function parseBackgroundPreference(value: unknown): BackgroundPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_BACKGROUND_PREFERENCE
  }

  const candidate = value as Record<string, unknown>
  if (
    candidate.schemaVersion !== BACKGROUND_PREFERENCE_SCHEMA_VERSION ||
    candidate.mode !== 'custom' ||
    !isSafeImageDataUrl(candidate.imageDataUrl) ||
    typeof candidate.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.updatedAt))
  ) {
    return DEFAULT_BACKGROUND_PREFERENCE
  }

  return {
    schemaVersion: BACKGROUND_PREFERENCE_SCHEMA_VERSION,
    mode: 'custom',
    imageDataUrl: candidate.imageDataUrl,
    updatedAt: candidate.updatedAt,
  }
}

export function loadBackgroundPreference(
  storage: Storage | null = browserStorage(),
): BackgroundPreference {
  if (!storage) return DEFAULT_BACKGROUND_PREFERENCE
  try {
    const raw = storage.getItem(BACKGROUND_PREFERENCE_STORAGE_KEY)
    return raw ? parseBackgroundPreference(JSON.parse(raw)) : DEFAULT_BACKGROUND_PREFERENCE
  } catch {
    return DEFAULT_BACKGROUND_PREFERENCE
  }
}

export function saveCustomBackgroundPreference(
  imageDataUrl: string,
  storage: Storage | null = browserStorage(),
  now: Date = new Date(),
): BackgroundPersistenceResult {
  if (!isSafeImageDataUrl(imageDataUrl)) {
    return { ok: false, reason: 'invalid-image' }
  }
  if (!storage) return { ok: false, reason: 'storage-unavailable' }

  const preference: BackgroundPreference = {
    schemaVersion: BACKGROUND_PREFERENCE_SCHEMA_VERSION,
    mode: 'custom',
    imageDataUrl,
    updatedAt: now.toISOString(),
  }

  try {
    storage.setItem(BACKGROUND_PREFERENCE_STORAGE_KEY, JSON.stringify(preference))
    return { ok: true, preference }
  } catch {
    return { ok: false, reason: 'storage-failed' }
  }
}

export function clearBackgroundPreference(
  storage: Storage | null = browserStorage(),
): BackgroundPersistenceResult {
  if (!storage) return { ok: false, reason: 'storage-unavailable' }
  try {
    storage.removeItem(BACKGROUND_PREFERENCE_STORAGE_KEY)
    return { ok: true, preference: DEFAULT_BACKGROUND_PREFERENCE }
  } catch {
    return { ok: false, reason: 'storage-failed' }
  }
}

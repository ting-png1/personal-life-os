import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BACKGROUND_PREFERENCE_STORAGE_KEY } from '../../shared/lib/storageKeys.ts'
import {
  DEFAULT_BACKGROUND_PREFERENCE,
  clearBackgroundPreference,
  loadBackgroundPreference,
  parseBackgroundPreference,
  saveCustomBackgroundPreference,
} from './backgroundSettings.ts'
import { BackgroundImageError, validateBackgroundImageFile } from './imageProcessor.ts'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('Custom Background local preference', () => {
  it('falls back to Pink Mist for missing or malformed local values', () => {
    const storage = new MemoryStorage()
    assert.deepEqual(loadBackgroundPreference(storage), DEFAULT_BACKGROUND_PREFERENCE)

    storage.setItem(BACKGROUND_PREFERENCE_STORAGE_KEY, '{broken')
    assert.deepEqual(loadBackgroundPreference(storage), DEFAULT_BACKGROUND_PREFERENCE)
    assert.deepEqual(
      parseBackgroundPreference({ schemaVersion: 1, mode: 'custom', imageDataUrl: 'https://example.com/a.jpg' }),
      DEFAULT_BACKGROUND_PREFERENCE,
    )
  })

  it('persists, reloads, replaces, and clears one device-local JPEG background', () => {
    const storage = new MemoryStorage()
    const firstImage = 'data:image/jpeg;base64,YQ=='
    const secondImage = 'data:image/jpeg;base64,Yg=='

    const first = saveCustomBackgroundPreference(firstImage, storage, new Date('2026-09-11T01:00:00Z'))
    assert.equal(first.ok, true)
    assert.equal(loadBackgroundPreference(storage).mode, 'custom')

    const replacement = saveCustomBackgroundPreference(secondImage, storage, new Date('2026-09-11T02:00:00Z'))
    assert.equal(replacement.ok, true)
    assert.deepEqual(loadBackgroundPreference(storage), {
      schemaVersion: 1,
      mode: 'custom',
      imageDataUrl: secondImage,
      updatedAt: '2026-09-11T02:00:00.000Z',
    })

    assert.equal(clearBackgroundPreference(storage).ok, true)
    assert.deepEqual(loadBackgroundPreference(storage), DEFAULT_BACKGROUND_PREFERENCE)
  })

  it('rejects non-image and oversized source files before decoding', () => {
    assert.throws(
      () => validateBackgroundImageFile({ type: 'text/plain', size: 10 }),
      BackgroundImageError,
    )
    assert.throws(
      () => validateBackgroundImageFile({ type: 'image/jpeg', size: 26 * 1024 * 1024 }),
      BackgroundImageError,
    )
  })
})

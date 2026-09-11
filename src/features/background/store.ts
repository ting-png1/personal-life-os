import { create } from 'zustand'
import {
  clearBackgroundPreference,
  loadBackgroundPreference,
  saveCustomBackgroundPreference,
  type BackgroundPersistenceResult,
  type BackgroundPreference,
} from './backgroundSettings'

interface BackgroundState {
  preference: BackgroundPreference
  setCustomImage: (imageDataUrl: string) => BackgroundPersistenceResult
  restoreDefault: () => BackgroundPersistenceResult
}

export const useBackgroundStore = create<BackgroundState>((set) => ({
  preference: loadBackgroundPreference(),

  setCustomImage: (imageDataUrl) => {
    const result = saveCustomBackgroundPreference(imageDataUrl)
    if (result.ok) set({ preference: result.preference })
    return result
  },

  restoreDefault: () => {
    const result = clearBackgroundPreference()
    if (result.ok) set({ preference: result.preference })
    return result
  },
}))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewerMode, TTSVoice } from '@/types/app.types'

interface UIStore {
  highContrast: boolean
  viewerMode: ViewerMode
  slideshowInterval: 3 | 5 | 7
  ttsVoice: TTSVoice
  toggleHighContrast: () => void
  setViewerMode: (mode: ViewerMode) => void
  setSlideshowInterval: (interval: 3 | 5 | 7) => void
  setTTSVoice: (voice: TTSVoice) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      highContrast: false,
      viewerMode: 'manual',
      slideshowInterval: 5,
      ttsVoice: 'female',

      toggleHighContrast: () =>
        set((state) => ({ highContrast: !state.highContrast })),

      setViewerMode: (mode) => set({ viewerMode: mode }),

      setSlideshowInterval: (interval) => set({ slideshowInterval: interval }),

      setTTSVoice: (voice) => set({ ttsVoice: voice }),
    }),
    { name: 'storybridge-ui' }
  )
)

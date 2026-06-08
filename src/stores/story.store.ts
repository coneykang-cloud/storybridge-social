import { create } from 'zustand'
import type { Story, StoryPage, GenerateStoryInput } from '@/types/app.types'

interface StoryStore {
  stories: Story[]
  currentStory: Story | null
  currentPages: StoryPage[]
  isGenerating: boolean
  generationProgress: number
  streamedPages: Partial<StoryPage>[]
  clarifyingQuestions: string[]

  setStories: (stories: Story[]) => void
  setCurrentStory: (story: Story | null, pages?: StoryPage[]) => void
  addStory: (story: Story) => void
  updatePage: (pageId: string, updates: Partial<StoryPage>) => void
  generateStory: (input: GenerateStoryInput) => Promise<void>
  resetGeneration: () => void
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  stories: [],
  currentStory: null,
  currentPages: [],
  isGenerating: false,
  generationProgress: 0,
  streamedPages: [],
  clarifyingQuestions: [],

  setStories: (stories) => set({ stories }),

  setCurrentStory: (story, pages = []) =>
    set({ currentStory: story, currentPages: pages }),

  addStory: (story) =>
    set((state) => ({ stories: [story, ...state.stories] })),

  updatePage: (pageId, updates) =>
    set((state) => ({
      currentPages: state.currentPages.map((p) =>
        p.id === pageId ? { ...p, ...updates } : p
      ),
    })),

  generateStory: async (input: GenerateStoryInput) => {
    set({ isGenerating: true, generationProgress: 0, streamedPages: [], clarifyingQuestions: [] })

    try {
      const response = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) throw new Error('Story generation failed')
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6).trim()
          if (!dataStr || dataStr === '[DONE]') continue

          try {
            const event = JSON.parse(dataStr)

            if (event.type === 'page') {
              set((state) => ({
                streamedPages: [...state.streamedPages, event.data],
                generationProgress: state.generationProgress + 1,
              }))
            } else if (event.type === 'clarify') {
              set({ clarifyingQuestions: event.data.questions, isGenerating: false })
              return
            } else if (event.type === 'done') {
              const { story } = event.data
              get().addStory(story)
              set({ currentStory: story, isGenerating: false })
            }
          } catch {
            // 파싱 오류 무시
          }
        }
      }
    } catch (err) {
      console.error('Story generation error:', err)
      set({ isGenerating: false })
    }
  },

  resetGeneration: () =>
    set({
      isGenerating: false,
      generationProgress: 0,
      streamedPages: [],
      clarifyingQuestions: [],
    }),
}))

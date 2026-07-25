import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { CALENDAR_SETTINGS_STORE_PERSIST_KEY } from '@/stores/constants'

/**
 * Per-browser calendar preferences (there is no backend endpoint for them).
 * Day numbers follow JS `Date#getDay()`: 0 = Sunday … 6 = Saturday.
 */
type CalendarSettings = {
  firstDayOfWeek: number
  hiddenDays: number[]
}

type CalendarSettingsState = CalendarSettings & {
  setFirstDayOfWeek: (day: number) => void
  setDayVisible: (day: number, visible: boolean) => void
}

const DEFAULT_SETTINGS: CalendarSettings = {
  firstDayOfWeek: 1,
  hiddenDays: [],
}

export const useCalendarSettingsStore = create<CalendarSettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        ...DEFAULT_SETTINGS,

        setFirstDayOfWeek: (day) => {
          set({ firstDayOfWeek: day })
        },

        setDayVisible: (day, visible) => {
          const hidden = new Set(get().hiddenDays)
          if (visible) {
            hidden.delete(day)
          } else {
            hidden.add(day)
            // The calendar needs at least one visible day.
            if (hidden.size >= 7) return
          }
          set({ hiddenDays: [...hidden] })
        },
      }),
      {
        name: CALENDAR_SETTINGS_STORE_PERSIST_KEY,
      }
    ),
    {
      name: CALENDAR_SETTINGS_STORE_PERSIST_KEY,
    }
  )
)

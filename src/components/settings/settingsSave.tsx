import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import { toast } from '@/stores/toastStore'

/**
 * Settings pages have no per-row edit buttons — fields are edited inline and
 * the pending changes are applied together by one Save button in the page
 * header. Each editable field registers its dirtiness and a save callback
 * here; the header button shows up as soon as anything is dirty.
 */

type SaveEntry = {
  dirty: boolean
  /** Persists the field's pending change; rejects on failure. */
  save: () => Promise<unknown>
}

type SettingsSaveState = {
  dirty: boolean
  saving: boolean
  saveAll: () => void
  register: (id: string, entry: SaveEntry) => void
  unregister: (id: string) => void
}

const SettingsSaveContext = createContext<SettingsSaveState | null>(null)

function useSettingsSave(): SettingsSaveState {
  const ctx = useContext(SettingsSaveContext)
  if (!ctx) throw new Error('useSettingsSave must be used inside SettingsSaveProvider')
  return ctx
}

export function SettingsSaveProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, SaveEntry>>({})
  const [saving, setSaving] = useState(false)

  const register = useCallback((id: string, entry: SaveEntry) => {
    setEntries((prev) => ({ ...prev, [id]: entry }))
  }, [])

  const unregister = useCallback((id: string) => {
    setEntries((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const dirty = Object.values(entries).some((e) => e.dirty)

  const saveAll = useCallback(() => {
    const pending = Object.values(entries).filter((e) => e.dirty)
    if (pending.length === 0) return
    setSaving(true)
    void Promise.allSettled(pending.map((e) => e.save())).then((results) => {
      setSaving(false)
      const failed = results.find(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      )
      if (failed) {
        toast.error('Unable to save settings', {
          description:
            failed.reason instanceof Error ? failed.reason.message : undefined,
        })
      }
    })
  }, [entries])

  return (
    <SettingsSaveContext.Provider
      value={{ dirty, saving, saveAll, register, unregister }}
    >
      {children}
    </SettingsSaveContext.Provider>
  )
}

/**
 * Registers one editable settings field. Call with the field's current
 * dirtiness and a save callback; both may change on every render.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRegisterSettingsSave(
  id: string,
  dirty: boolean,
  save: () => Promise<unknown>
) {
  const { register, unregister } = useSettingsSave()
  useEffect(() => {
    register(id, { dirty, save })
  }, [id, dirty, save, register])
  useEffect(() => () => unregister(id), [id, unregister])
}

/** Header Save button — hidden until some registered field is dirty. */
export function SettingsSaveButton() {
  const { dirty, saving, saveAll } = useSettingsSave()
  if (!dirty && !saving) return null
  return (
    <Button
      type="button"
      variant="ghost"
      className="uppercase"
      onClick={saveAll}
      loading={saving}
    >
      Save
    </Button>
  )
}

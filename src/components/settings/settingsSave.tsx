import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { FloppyDiskIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { PageActionBar } from '@/components/page-primitives/PageActionBar'

/**
 * Settings pages have no per-row edit buttons — fields are edited inline and
 * the pending changes are applied together by one Save button. Each editable
 * field registers its dirtiness and a save callback here; the button shows up
 * as soon as anything is dirty.
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
  if (!ctx)
    throw new Error('useSettingsSave must be used inside SettingsSaveProvider')
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
    // `allSettled`, and nothing done with the rejections: every registered
    // save writes through a mutation, and those report their own refusal with
    // the server's reason (CON-164). A second, vaguer "Unable to save
    // settings" on top of that would only bury the specific one.
    void Promise.allSettled(pending.map((e) => e.save())).then(() => {
      setSaving(false)
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
  save: () => Promise<unknown>,
) {
  const { register, unregister } = useSettingsSave()
  useEffect(() => {
    register(id, { dirty, save })
  }, [id, dirty, save, register])
  useEffect(() => () => unregister(id), [id, unregister])
}

/**
 * The page's commit, on the floating bottom bar — hidden until some registered
 * field is dirty.
 *
 * It used to appear and disappear in the top-right corner as you typed, which
 * made the header jitter and put a commit next to whatever else that corner
 * held. Down here it is the only thing on its surface, and appearing *is* the
 * status: no bar means nothing to save.
 *
 * Needs a positioned ancestor that is the content column, not the page's
 * scroller — see `PageActionBar`. Pages using it must also leave
 * `PAGE_ACTION_BAR_INSET` at the bottom of their content.
 */
export function SettingsSaveBar() {
  const { t } = useTranslation()
  const { dirty, saving, saveAll } = useSettingsSave()
  if (!dirty && !saving) return null
  return (
    <PageActionBar>
      <Button
        type="button"
        // `ghost` — no fill, no border. See PostStatusActionBar: the bar is the
        // surface, and anything drawn inside it is text.
        variant="ghost"
        size="sm"
        className="text-primary-foreground"
        onClick={saveAll}
        loading={saving}
      >
        <FloppyDiskIcon />
        {/* CSS casing, not literal caps: the label is translated (CON-174) and
            the literal-caps rule is for irreversible actions, which this isn't. */}
        <span className="uppercase">{t('common.save')}</span>
      </Button>
    </PageActionBar>
  )
}

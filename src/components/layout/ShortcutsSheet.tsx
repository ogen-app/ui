import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useRouterState } from '@tanstack/react-router'
import { ModalContainer } from '@/components/ui/modal'
import { campaignIdOf } from '@/lib/shortcuts'
import { useShortcutsStore } from '@/stores/shortcutsStore'

type GoRow = {
  key: string
  label:
    | 'ideas'
    | 'assets'
    | 'campaigns'
    | 'analytics'
    | 'foundation'
    | 'workspaceSettings'
    | 'settings'
    | 'strategy'
    | 'posts'
    | 'calendar'
  /** Inside a campaign, this row goes to the campaign's own section. */
  campaigns?: boolean
}

/** A key, drawn as a tile. */
function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center bg-secondary px-1.5 font-sans text-[13px] font-medium text-foreground">
      {children}
    </kbd>
  )
}

/** One key, or two side by side for "g then a letter". */
function Keys({ keys }: { keys: string[] }) {
  const { t } = useTranslation()
  return (
    <span
      className="flex shrink-0 items-center gap-1"
      aria-label={
        keys.length === 2
          ? t('shortcuts.sequence', { first: keys[0], second: keys[1] })
          : keys[0]
      }
    >
      {keys.map((key) => (
        <Key key={key}>{key}</Key>
      ))}
    </span>
  )
}

/** The key's letter in a label: ink, semibold — no second accent. */
const MARK = <b className="font-semibold text-foreground" />

function Row({
  label,
  keys,
  note,
}: {
  label: React.ReactNode
  keys: string[]
  note?: string
}) {
  return (
    <li className="flex h-10 items-center justify-between gap-4 text-[15px] text-foreground">
      <span className="min-w-0 truncate">
        {label}
        {note && (
          <span className="ml-2 text-xs text-secondary-foreground">{note}</span>
        )}
      </span>
      <Keys keys={keys} />
    </li>
  )
}

function Group({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-sm font-medium text-secondary-foreground">
        {heading}
      </h3>
      {children}
    </section>
  )
}

/**
 * The keyboard shortcuts sheet (CON-394), on `?` or the account menu's row.
 *
 * The app's own `Modal` — its header, its × and its backdrop — so it reads
 * as every other overlay does. Two columns: Go to on the left; Anywhere, and
 * inside a campaign In this campaign, on the right. Quiet on purpose: no rules
 * between rows, the key's letter marked in ink rather than a colour, and
 * "then" said once under Go to rather than in every row.
 *
 * Inside a campaign Ideas, Assets, Analytics and Settings say "this
 * campaign's", because there `g` takes them to the campaign's own; on a
 * workspace page the campaign-only keys are one line, not three dead rows.
 */
export function ShortcutsSheet() {
  const { t } = useTranslation()
  const open = useShortcutsStore((s) => s.open)
  const setOpen = useShortcutsStore((s) => s.setOpen)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const inCampaign = campaignIdOf(pathname) !== null

  // `?` again closes it. The sheet is a dialog, so the app's shortcuts stay
  // quiet inside it; this one listener is its own.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      // The app's own rule for `?`: Shift and AltGr pass, ⌘ and Ctrl alone
      // are the browser's.
      if (
        event.key === '?' &&
        !event.metaKey &&
        !(event.ctrlKey && !event.altKey)
      ) {
        event.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  const goRows: GoRow[] = [
    { key: 'i', label: 'ideas', campaigns: true },
    { key: 'a', label: 'assets', campaigns: true },
    { key: 'c', label: 'campaigns' },
    { key: 'n', label: 'analytics', campaigns: true },
    { key: 'f', label: 'foundation' },
    inCampaign
      ? { key: 's', label: 'settings', campaigns: true }
      : { key: 's', label: 'workspaceSettings' },
  ]
  const campaignRows: GoRow[] = [
    { key: 't', label: 'strategy' },
    { key: 'p', label: 'posts' },
    { key: 'r', label: 'calendar' },
  ]
  const goLabel = (row: GoRow) => (
    <Trans i18nKey={`shortcuts.go.${row.label}`} components={{ k: MARK }} />
  )

  return (
    <ModalContainer
      isOpen={open}
      onClose={() => setOpen(false)}
      title={t('shortcuts.title')}
      size="xlarge"
    >
      <div className="grid grid-cols-1 gap-x-11 gap-y-6 md:grid-cols-2">
        <Group heading={t('shortcuts.goTo')}>
          <p className="text-[13px] text-secondary-foreground">
            {t('shortcuts.goHint')}
          </p>
          <ul>
            {goRows.map((row) => (
              <Row
                key={row.label}
                label={goLabel(row)}
                keys={['g', row.key]}
                note={
                  inCampaign && row.campaigns
                    ? t('shortcuts.thisCampaign')
                    : undefined
                }
              />
            ))}
          </ul>
        </Group>

        <div className="flex flex-col gap-6">
          <Group heading={t('shortcuts.anywhere')}>
            <ul>
              <Row label={t('shortcuts.action.toggleMenu')} keys={['[']} />
              <Row label={t('shortcuts.action.toggleRight')} keys={[']']} />
              <Row label={t('shortcuts.action.openAssistant')} keys={['o']} />
              <Row label={t('shortcuts.action.filterDetail')} keys={['/']} />
            </ul>
          </Group>
          {inCampaign ? (
            <Group heading={t('shortcuts.inCampaign')}>
              <ul>
                {campaignRows.map((row) => (
                  <Row
                    key={row.label}
                    label={goLabel(row)}
                    keys={['g', row.key]}
                  />
                ))}
              </ul>
            </Group>
          ) : (
            <p className="text-[13px] text-secondary-foreground">
              {t('shortcuts.campaignNote')}
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-[13px] text-secondary-foreground">
        <Trans
          i18nKey="shortcuts.foot"
          components={{ k1: <Key>?</Key>, k2: <Key>esc</Key> }}
        />
      </p>
    </ModalContainer>
  )
}

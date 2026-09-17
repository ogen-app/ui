import { PortableText, type PortableTextComponents } from '@portabletext/react'
import { useRouter } from '@tanstack/react-router'
import { InfoIcon, LightbulbIcon, WarningIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { useHelpStore } from '@/stores/helpStore'
import type { HelpBlock } from '@/types/help'

/**
 * Renders an article's Portable Text (CON-173).
 *
 * The three custom nodes are the reason help content is not markdown:
 *
 * - **`articleLink`** carries the target's *key*, so following it stays inside
 *   the drawer and lands on the reader's own language.
 * - **`appLink`** navigates the app underneath without closing the drawer —
 *   help you read while working is the whole point.
 * - **`helpCallout`** is set apart from the prose it interrupts.
 */

const CALLOUT_ICONS = {
  note: InfoIcon,
  tip: LightbulbIcon,
  warning: WarningIcon,
} as const

type CalloutTone = keyof typeof CALLOUT_ICONS

const CALLOUT_STYLES: Record<CalloutTone, string> = {
  note: 'border-border',
  tip: 'border-border',
  // The only one that changes what a reader would otherwise do.
  warning: 'border-destructive',
}

function Callout({ value }: { value: HelpBlock }) {
  const tone =
    (value.tone as CalloutTone) in CALLOUT_ICONS
      ? (value.tone as CalloutTone)
      : 'note'
  const Icon = CALLOUT_ICONS[tone]
  return (
    <aside
      className={cn(
        'my-4 flex gap-3 rounded-md border border-l-2 bg-secondary/40 p-3',
        CALLOUT_STYLES[tone],
      )}
    >
      <Icon
        size={18}
        weight="fill"
        className="mt-0.5 shrink-0 text-tertiary-foreground"
      />
      <div className="space-y-2 text-sm">
        <PortableText
          value={(value.body ?? []) as never}
          components={components}
        />
      </div>
    </aside>
  )
}

/** Follow a cross-link without leaving the drawer. */
function ArticleLink({
  value,
  children,
}: {
  value?: HelpBlock
  children: React.ReactNode
}) {
  const push = useHelpStore((s) => s.push)
  const target = value?.target as string | undefined
  if (!target) return <>{children}</>
  return (
    <button
      type="button"
      onClick={() => push(target)}
      className="cursor-pointer underline underline-offset-2 hover:text-accent"
    >
      {children}
    </button>
  )
}

/** Navigate the app behind the drawer, leaving the drawer open. */
function AppLink({
  value,
  children,
}: {
  value?: HelpBlock
  children: React.ReactNode
}) {
  const router = useRouter()
  const path = value?.path as string | undefined
  if (!path) return <>{children}</>
  return (
    <button
      type="button"
      onClick={() =>
        // The path comes from content, so it cannot be checked against the
        // route tree at compile time the way a `<Link to>` is. A bad path
        // lands on the 404 route, which is the right outcome for a typo in
        // an article.
        router.navigate({ to: path } as Parameters<typeof router.navigate>[0])
      }
      className="cursor-pointer underline underline-offset-2 hover:text-accent"
    >
      {children}
    </button>
  )
}

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="text-sm leading-relaxed">{children}</p>
    ),
    // Headings and bold text carry their weight, not a colour: the body is
    // already `foreground`, so lifting them further has nowhere to go.
    h2: ({ children }) => (
      <h2 className="mt-6 mb-2 text-base font-semibold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-4 mb-1 text-sm font-semibold">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-border my-3 border-l-2 pl-3 text-sm italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-3 space-y-1.5 pl-4">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="relative pl-3 text-sm leading-relaxed before:absolute before:left-0 before:content-['·']">
        {children}
      </li>
    ),
    number: ({ children }) => (
      <li className="text-sm leading-relaxed">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    code: ({ children }) => (
      <code className="bg-secondary rounded px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    ),
    link: ({ value, children }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-accent"
      >
        {children}
      </a>
    ),
    articleLink: ArticleLink,
    appLink: AppLink,
  },
  types: {
    helpCallout: ({ value }) => <Callout value={value as HelpBlock} />,
  },
}

export function HelpArticleBody({ body }: { body: HelpBlock[] }) {
  return (
    // Full-strength `foreground`, not the muted `tertiary-foreground` a caption
    // or a hint would take. This *is* the content of the surface — the reader
    // came here to read it, and prose set in the colour used for secondary
    // detail elsewhere reads as an aside to something else on the screen.
    <div className="text-foreground space-y-3">
      <PortableText value={body as never} components={components} />
    </div>
  )
}

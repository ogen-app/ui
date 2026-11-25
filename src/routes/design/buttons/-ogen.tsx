import { useState, type ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { AiChemistry02Icon, SparklesIcon } from '@hugeicons/core-free-icons'
import {
  ArrowsClockwiseIcon,
  LightbulbIcon,
  PencilSimpleLineIcon,
  QuestionIcon,
  SparkleIcon,
  StackIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { GradientButton, GradientMark } from '@/components/ui/gradient-button'
import { Segmented } from '@/components/ui/segmented'
import { TextButton } from '@/components/ui/text-button'
import { Logo } from '@/components/Logo'
import { SmallHeading } from '@/components/page-primitives/SmallHeading'

/**
 * Every action Ogen does, on the surfaces it really sits on: as it was, and
 * as decided on 2026-11-25 — one rule per place, not one look for all.
 */

type View = 'before' | 'decided'

const RULES = [
  'The bar: Work with Ogen stays teal with the white mark.',
  "A card's one offer to Ogen (Fix with Ogen): the gradient button. Its rows keep outline + the mark.",
  'Set-up steps: outline + the Ogen mark, every one.',
  'Assess (Quality, Checks): its own sparkle, in the gradient — the link on its heading’s baseline.',
  'Write alt text: the Ogen mark, black.',
  'Ask Ogen from help: the gradient button.',
  'A retry after a technical failure: a plain button. It is not AI.',
  'Several in one line (Compile, Draft, Distill): black words, each with its own icon.',
  "A primary that hands work to Ogen: teal with Ogen's mark in white.",
]

const WHITE_MARK = (
  <Logo
    variant="mark"
    className="size-4 shrink-0 [&_path:first-of-type]:fill-primary"
  />
)
const MARK = <Logo variant="mark" className="size-4 shrink-0" />

export function OgenActions() {
  const [view, setView] = useState<View>('decided')
  const d = view === 'decided'
  return (
    <div className="ogen-actions flex flex-col gap-4">
      {/* The dev port tint (vite.config.js) recolours every logo; here the
          mark has to show the colour production gives it. */}
      <style>{`.ogen-actions svg[viewBox="0 0 1000 1000"]{color:inherit !important}`}</style>
      <div className="flex flex-wrap items-start gap-6">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'before', label: 'Before' },
            { value: 'decided', label: 'Decided' },
          ]}
          aria-label="View"
        />
        <ol className="max-w-2xl list-decimal space-y-0.5 pl-5 text-sm text-secondary-foreground">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex h-14 items-center gap-2 border-b border-border bg-primary px-6">
          <span className="text-lg font-medium">Spring launch</span>
          <span className="grow" />
          <Button variant="outline" size="bar">
            <QuestionIcon className="size-5" />
            Help
          </Button>
          <Button variant="accent" size="bar">
            <Logo
              variant="mark"
              className="size-5 shrink-0 [&_path:first-of-type]:fill-primary"
            />
            Work with Ogen
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_22rem] gap-6 p-6">
          <div className="flex flex-col gap-6">
            <Panel
              title="Needs your attention"
              action={
                d ? (
                  <GradientButton size="sm">Fix with Ogen</GradientButton>
                ) : (
                  <Button variant="outline" size="sm">
                    {MARK}
                    Fix with Ogen
                  </Button>
                )
              }
            >
              {['3 posts have no image', 'Friday has nothing planned'].map(
                (text, i) => (
                  <Line
                    key={text}
                    text={text}
                    action={
                      <Button variant="outline" size="sm">
                        {MARK}
                        {i === 0 ? 'Add images' : 'Plan Friday'}
                      </Button>
                    }
                  />
                ),
              )}
            </Panel>

            <Panel title="Set up this campaign">
              <Line
                text="Choose who it is for"
                action={
                  <Button variant="outline" size="sm">
                    {MARK}
                    Do it with Ogen
                  </Button>
                }
              />
              <Line
                text="Write the brief"
                action={
                  <Button variant="outline" size="sm">
                    {d ? (
                      MARK
                    ) : (
                      <HugeiconsIcon icon={SparklesIcon} strokeWidth={1.5} />
                    )}
                    Generate brief
                  </Button>
                }
              />
            </Panel>

            <Panel title="Ideas · 4 selected">
              <div className="flex items-center gap-1">
                <span className="text-sm">4 selected</span>
                <span className="grow" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={d ? 'text-foreground' : undefined}
                >
                  {d && <StackIcon />}
                  Compile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={d ? 'text-foreground' : undefined}
                >
                  {d && <PencilSimpleLineIcon />}
                  Draft
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={d ? 'text-foreground' : undefined}
                >
                  <HugeiconsIcon icon={AiChemistry02Icon} size={16} />
                  Distill more ideas
                </Button>
              </div>
            </Panel>

            <Panel title="A planned post">
              <p className="text-sm">
                Three theses, no body yet. Ogen can write it from them.
              </p>
              <div>
                <Button variant={d ? 'accent' : 'defaultInverted'}>
                  {d && WHITE_MARK}
                  Write the post
                </Button>
              </div>
            </Panel>

            <div className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-primary p-6 shadow-sm">
              <div className="text-lg font-medium">Distill ideas</div>
              <p className="text-sm">
                How many ideas should Ogen pull from this?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost">Cancel</Button>
                <Button variant={d ? 'accent' : 'defaultInverted'}>
                  {d && WHITE_MARK}
                  Distill 5 ideas
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <Panel title="Quality">
              <p className="text-sm text-tertiary-foreground">
                Not assessed yet.
              </p>
              <div>
                {d ? (
                  <GradientButton icon={SparkleIcon}>
                    Assess this post
                  </GradientButton>
                ) : (
                  <Button variant="outline">
                    <SparkleIcon />
                    Assess this post
                  </Button>
                )}
              </div>
            </Panel>

            {/* The Checks heading with its link, as PostChecksTab draws it. */}
            <div className="flex flex-col gap-3 rounded-md bg-primary p-6 text-sm">
              <div
                className={
                  d
                    ? 'flex items-baseline justify-between gap-3'
                    : 'flex items-center justify-between gap-3'
                }
              >
                <SmallHeading as="h3">Quality</SmallHeading>
                {d ? (
                  <TextButton className="shrink-0 text-xs">
                    <GradientMark
                      icon={SparkleIcon}
                      weight="bold"
                      className="mr-1 size-3.5"
                    />
                    <span className="text-sweep">Assess quality</span>
                  </TextButton>
                ) : (
                  <TextButton className="inline-flex shrink-0 items-center gap-1.5">
                    <SparkleIcon className="size-4" />
                    <span>Assess quality</span>
                  </TextButton>
                )}
              </div>
              <p className="text-sm">2 warnings</p>
            </div>

            <Panel title="Alt text">
              <div className="flex items-center justify-between">
                <span className="text-sm italic text-tertiary-foreground">
                  No alt text
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={d ? 'text-foreground' : undefined}
                >
                  {d ? MARK : <SparkleIcon />}
                  Write a new one
                </Button>
              </div>
            </Panel>

            <Panel title="Help">
              <div className="flex flex-col items-start gap-2">
                <QuestionIcon className="size-6 text-quinary-foreground" />
                <p className="text-sm">No article for this screen.</p>
                {d ? (
                  <GradientButton size="sm">Ask Ogen</GradientButton>
                ) : (
                  <Button variant="outline" size="sm">
                    Ask Ogen
                  </Button>
                )}
              </div>
            </Panel>

            <Panel title="Analysis failed">
              <p className="text-sm">The PDF could not be read.</p>
              <div>
                <Button variant="outline">
                  <ArrowsClockwiseIcon />
                  Try again
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-primary p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function Line({ text, action }: { text: string; action: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <span className="text-sm">{text}</span>
      {action}
    </div>
  )
}

/**
 * The calendar's idea slot (IdeaSlotCard): an idea with a date, dashed, and
 * Compile and Draft over it under the pointer. Undecided: as it is now, and
 * with rule 9 (several in one line: black words, each with its own icon).
 */
export function CalendarSlotOptions() {
  return (
    <div className="ogen-actions flex flex-wrap items-start gap-8">
      {(
        [
          ['At rest', null],
          ['On hover, now', 'now'],
          ['On hover, rule 9', 'rule9'],
          ['On hover, rule 9 + mark', 'rule9mark'],
        ] as const
      ).map(([caption, hover]) => (
        <figure key={caption} className="flex flex-col gap-2">
          <figcaption className="text-xs text-secondary-foreground">
            {caption}
          </figcaption>
          {/* A day column about as wide as a laptop's week view, on the canvas. */}
          <div className="flex w-[170px] flex-col gap-0.5 bg-background p-1">
            <div className="rounded-sm border border-border bg-primary px-2 py-1.5">
              <p className="text-xs text-tertiary-foreground">
                09:30 · LinkedIn
              </p>
              <p className="line-clamp-2 text-xs/4">
                Why we moved the launch to spring
              </p>
            </div>
            <div className="relative h-[52px] shrink-0 overflow-hidden border border-dashed border-quinary-foreground px-2 py-1.5">
              <p className="flex items-center gap-1 text-xs font-semibold tracking-[0.08em] text-tertiary-foreground">
                <LightbulbIcon aria-hidden className="size-3 shrink-0" />
                Idea
              </p>
              <p className="line-clamp-2 text-xs/4 text-secondary-foreground">
                Three things customers asked about pricing
              </p>
              {hover && (
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-primary/95">
                  {hover === 'now' ? (
                    <>
                      <Button
                        variant="outline"
                        size="xs"
                        className="bg-primary"
                      >
                        Compile
                      </Button>
                      <Button variant="defaultInverted" size="xs">
                        Draft
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-foreground"
                      >
                        {hover === 'rule9mark' ? (
                          <Logo variant="mark" className="size-3.5 shrink-0" />
                        ) : (
                          <StackIcon />
                        )}
                        Compile
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-foreground"
                      >
                        {hover === 'rule9mark' ? (
                          <Logo variant="mark" className="size-3.5 shrink-0" />
                        ) : (
                          <PencilSimpleLineIcon />
                        )}
                        Draft
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </figure>
      ))}
    </div>
  )
}

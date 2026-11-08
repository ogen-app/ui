import { useState, type ReactNode } from 'react'
import { CheckIcon, PlusIcon, XIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'

import {
  LANGUAGES,
  TRAIT_OPTIONS,
  type Audience,
  type Brand,
  type Rule,
} from './-fixtures'
import {
  Chip,
  Cite,
  Field,
  OnboardingFrame,
  SaveMark,
  StepFooter,
  useSavePulse,
} from './-frame'

export type BrandSection =
  'positioning' | 'voice' | 'audiences' | 'rules' | 'facts'

export const BRAND_SECTIONS: {
  id: BrandSection
  label: string
  sub: string
  count?: (b: Brand) => number
}[] = [
  {
    id: 'positioning',
    label: 'Positioning',
    sub: 'One sentence Ogen keeps in mind for every post.',
  },
  {
    id: 'voice',
    label: 'Voice',
    sub: 'How it sounds, with what each word means here — and in which languages.',
    count: (b) => b.traits.length,
  },
  {
    id: 'audiences',
    label: 'Audiences',
    sub: 'Who the posts are for. A campaign picks from these.',
    count: (b) => b.audiences.length,
  },
  {
    id: 'rules',
    label: 'Rules',
    sub: 'What Ogen must always or never do. Every draft is checked against them.',
    count: (b) => b.rules.length,
  },
  {
    id: 'facts',
    label: 'Facts',
    sub: 'Ogen states these and nothing else — no invented awards, numbers or dates.',
    count: (b) => b.facts.length,
  },
]

/* ------------------------------------------------------------------------ */
/* 4 · Review                                                               */
/* ------------------------------------------------------------------------ */

/**
 * The review, one section at a time with the sections listed beside it, so
 * the length is visible and nothing is a surprise. Each item says where it
 * came from; anything can be edited, dropped or added. It saves as you type.
 *
 * In the marketer's words this time — positioning, voice, audiences, rules —
 * because those are the words this person already uses.
 */
export function BrandStep({
  business,
  brand,
  onChange,
  onBack,
  onNext,
}: {
  business: string
  brand: Brand
  onChange: (b: Brand) => void
  onBack: () => void
  onNext: () => void
}) {
  const saving = useSavePulse(brand)
  const [section, setSection] = useState<BrandSection>('positioning')
  const [seen, setSeen] = useState<BrandSection[]>(['positioning'])
  const index = BRAND_SECTIONS.findIndex((s) => s.id === section)
  const current = BRAND_SECTIONS[index]
  const next = BRAND_SECTIONS[index + 1]
  const prev = BRAND_SECTIONS[index - 1]

  const go = (id: BrandSection) => {
    setSection(id)
    setSeen((s) => (s.includes(id) ? s : [...s, id]))
  }

  return (
    <OnboardingFrame
      step="brand"
      width="full"
      progress={seen.length / (BRAND_SECTIONS.length + 1)}
      aside={<SaveMark saving={saving} />}
    >
      <div className="grid gap-10 md:grid-cols-[200px_1fr]">
        <nav aria-label="Brand sections" className="flex flex-col gap-1">
          <p className="mb-3 text-xs text-tertiary-foreground">
            {business}’s brand
          </p>
          {BRAND_SECTIONS.map((s) => {
            const count = s.count?.(brand)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === section ? 'step' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2 px-2.5 text-left text-sm transition-colors',
                  s.id === section
                    ? 'bg-secondary font-medium text-primary-foreground'
                    : 'text-secondary-foreground hover:text-primary-foreground',
                )}
              >
                <span className="flex size-4 items-center justify-center">
                  {seen.includes(s.id) && s.id !== section ? (
                    <CheckIcon weight="bold" className="size-3.5 text-accent" />
                  ) : null}
                </span>
                {s.label}
                {count !== undefined && (
                  <span className="ml-auto text-xs tabular-nums text-tertiary-foreground">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-medium leading-10 tracking-tight">
            {current.label}
          </h1>
          <p className="mb-8 mt-1 text-sm leading-5 text-secondary-foreground">
            {current.sub}
          </p>
          <BrandSectionBody
            section={section}
            brand={brand}
            onChange={onChange}
          />
        </div>
      </div>

      <StepFooter
        onBack={prev ? () => go(prev.id) : onBack}
        note={`${seen.length} of ${BRAND_SECTIONS.length} checked`}
      >
        {next ? (
          <Button variant="accent" size="xl" onClick={() => go(next.id)}>
            Next: {next.label}
          </Button>
        ) : (
          <Button variant="accent" size="xl" onClick={onNext}>
            The brand is right
          </Button>
        )}
      </StepFooter>
    </OnboardingFrame>
  )
}

/**
 * One section's editor. Shared with the workspace's Brand page, so what the
 * review set up is the same screen you come back to — not a summary of it.
 */
export function BrandSectionBody({
  section,
  brand,
  onChange,
}: {
  section: BrandSection
  brand: Brand
  onChange: (b: Brand) => void
}) {
  switch (section) {
    case 'positioning':
      return <PositioningSection brand={brand} onChange={onChange} />
    case 'voice':
      return <VoiceSection brand={brand} onChange={onChange} />
    case 'audiences':
      return <AudiencesSection brand={brand} onChange={onChange} />
    case 'rules':
      return <RulesSection brand={brand} onChange={onChange} />
    case 'facts':
      return <FactsSection brand={brand} onChange={onChange} />
  }
}

type SectionProps = { brand: Brand; onChange: (b: Brand) => void }

function PositioningSection({ brand, onChange }: SectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        className="min-h-24 text-base leading-6"
        value={brand.positioning}
        onChange={(e) => onChange({ ...brand, positioning: e.target.value })}
      />
      <Cite item={{ source: 'web', ref: '/' }} />
    </div>
  )
}

function VoiceSection({ brand, onChange }: SectionProps) {
  const unused = TRAIT_OPTIONS.filter(
    (w) => !brand.traits.some((t) => t.word === w),
  )
  const setTrait = (id: string, patch: Partial<Brand['traits'][number]>) =>
    onChange({
      ...brand,
      traits: brand.traits.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        {brand.traits.map((trait) => (
          <ItemCard
            key={trait.id}
            title={trait.word}
            onRemove={() =>
              onChange({
                ...brand,
                traits: brand.traits.filter((t) => t.id !== trait.id),
              })
            }
            footer={<Cite item={trait} />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniField label="Means">
                <Textarea
                  className="min-h-14"
                  placeholder="What this word means for this brand"
                  value={trait.means}
                  onChange={(e) =>
                    setTrait(trait.id, { means: e.target.value })
                  }
                />
              </MiniField>
              <MiniField label="Avoid">
                <Textarea
                  className="min-h-14"
                  placeholder="Words or habits that break it"
                  value={trait.avoid}
                  onChange={(e) =>
                    setTrait(trait.id, { avoid: e.target.value })
                  }
                />
              </MiniField>
            </div>
          </ItemCard>
        ))}
        {unused.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-tertiary-foreground">Add:</span>
            {unused.map((word) => (
              <Chip
                key={word}
                on={false}
                onClick={() =>
                  onChange({
                    ...brand,
                    traits: [
                      ...brand.traits,
                      {
                        id: `${word}-${Date.now()}`,
                        word,
                        means: '',
                        avoid: '',
                        source: 'you',
                      },
                    ],
                  })
                }
              >
                {word}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniField label="Sounds like">
          <Textarea
            className="min-h-16 border-l-2 border-l-accent italic"
            value={brand.soundsLike}
            onChange={(e) => onChange({ ...brand, soundsLike: e.target.value })}
          />
        </MiniField>
        <MiniField label="Never sounds like">
          <Textarea
            className="min-h-16 italic text-secondary-foreground line-through decoration-quaternary-foreground"
            value={brand.notLike}
            onChange={(e) => onChange({ ...brand, notLike: e.target.value })}
          />
        </MiniField>
      </div>

      <Field
        label="Posts in"
        hint="Every post is written in each language you pick"
      >
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const on = brand.languages.includes(l.code)
            return (
              <Chip
                key={l.code}
                on={on}
                disabled={on && brand.languages.length === 1}
                onClick={() =>
                  onChange({
                    ...brand,
                    languages: on
                      ? brand.languages.filter((c) => c !== l.code)
                      : [...brand.languages, l.code],
                  })
                }
              >
                {l.label}
              </Chip>
            )
          })}
        </div>
      </Field>
    </div>
  )
}

function AudiencesSection({ brand, onChange }: SectionProps) {
  const set = (id: string, patch: Partial<Audience>) =>
    onChange({
      ...brand,
      audiences: brand.audiences.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    })
  return (
    <div className="flex flex-col gap-3">
      {brand.audiences.map((a) => (
        <ItemCard
          key={a.id}
          title={
            <Input
              variant="search"
              className="h-7 px-0 text-sm font-medium"
              value={a.name}
              placeholder="Name this audience"
              onChange={(e) => set(a.id, { name: e.target.value })}
            />
          }
          onRemove={() =>
            onChange({
              ...brand,
              audiences: brand.audiences.filter((x) => x.id !== a.id),
            })
          }
          footer={<Cite item={a} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniField label="Who they are">
              <Textarea
                className="min-h-16"
                value={a.who}
                onChange={(e) => set(a.id, { who: e.target.value })}
              />
            </MiniField>
            <MiniField label="What they want">
              <Textarea
                className="min-h-16"
                value={a.wants}
                onChange={(e) => set(a.id, { wants: e.target.value })}
              />
            </MiniField>
          </div>
        </ItemCard>
      ))}
      <Button
        variant="ghost"
        className="self-start"
        onClick={() =>
          onChange({
            ...brand,
            audiences: [
              ...brand.audiences,
              {
                id: `aud-${Date.now()}`,
                name: '',
                who: '',
                wants: '',
                source: 'you',
              },
            ],
          })
        }
      >
        <PlusIcon />
        Add an audience
      </Button>
    </div>
  )
}

function RulesSection({ brand, onChange }: SectionProps) {
  const [kind, setKind] = useState<Rule['kind']>('never')
  const [text, setText] = useState('')
  return (
    <div className="flex flex-col gap-8">
      {(['never', 'always'] as const).map((k) => (
        <div key={k}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
            {k === 'never' ? 'Never' : 'Always'}
          </p>
          <ItemList
            items={brand.rules.filter((r) => r.kind === k)}
            onRemove={(id) =>
              onChange({
                ...brand,
                rules: brand.rules.filter((r) => r.id !== id),
              })
            }
          />
        </div>
      ))}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          onChange({
            ...brand,
            rules: [
              ...brand.rules,
              {
                id: `rule-${Date.now()}`,
                kind,
                text: text.trim(),
                source: 'you',
              },
            ],
          })
          setText('')
        }}
      >
        <div className="flex shrink-0">
          {(['never', 'always'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'h-8 border px-2.5 text-xs font-medium first:border-r-0',
                kind === k
                  ? 'border-primary-foreground bg-primary-foreground text-primary'
                  : 'border-quaternary text-secondary-foreground',
              )}
            >
              {k === 'never' ? 'Never' : 'Always'}
            </button>
          ))}
        </div>
        <Input
          variant="search"
          className="px-1"
          placeholder="Add a rule — e.g. never post on Sundays before noon"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </form>
    </div>
  )
}

function FactsSection({ brand, onChange }: SectionProps) {
  const [text, setText] = useState('')
  return (
    <div className="flex flex-col gap-3">
      <ItemList
        items={brand.facts}
        onRemove={(id) =>
          onChange({ ...brand, facts: brand.facts.filter((f) => f.id !== id) })
        }
      />
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          onChange({
            ...brand,
            facts: [
              ...brand.facts,
              { id: `fact-${Date.now()}`, text: text.trim(), source: 'you' },
            ],
          })
          setText('')
        }}
      >
        <PlusIcon className="size-4 text-tertiary-foreground" />
        <Input
          variant="search"
          className="px-0"
          placeholder="Add a fact — an award, an opening date, a number…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Pieces                                                                   */
/* ------------------------------------------------------------------------ */

function ItemCard({
  title,
  onRemove,
  footer,
  children,
}: {
  title: ReactNode
  onRemove: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="group border border-quaternary p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm font-medium">{title}</div>
        <RemoveButton onClick={onRemove} />
      </div>
      {children}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  )
}

function ItemList({
  items,
  onRemove,
}: {
  items: { id: string; text: string; source: Rule['source']; ref?: string }[]
  onRemove: (id: string) => void
}) {
  if (items.length === 0)
    return (
      <p className="text-sm text-tertiary-foreground">
        Nothing yet — add one below.
      </p>
    )
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex items-start justify-between gap-3 border-b border-quaternary py-2.5"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm leading-5">{item.text}</span>
            <Cite item={item} />
          </span>
          <RemoveButton onClick={() => onRemove(item.id)} />
        </li>
      ))}
    </ul>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Remove"
      onClick={onClick}
      className="mt-0.5 shrink-0 text-tertiary-foreground opacity-0 transition-opacity hover:text-primary-foreground group-hover:opacity-100 focus-visible:opacity-100"
    >
      <XIcon className="size-4" />
    </button>
  )
}

function MiniField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-tertiary-foreground">{label}</span>
      {children}
    </div>
  )
}

import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Collapse } from '@/components/ui/collapse'
import { useBrand } from '@/hooks/useBrand'
import { useCampaign } from '@/hooks/useCampaigns'
import { brandSectionCopy } from '@/lib/brandSections'
import { cn } from '@/lib'
import type { BrandAudience, BrandGuardrails, BrandVoice } from './types'

/**
 * What this campaign writes from that it did not put here — the top of its
 * Foundation page, above the documents it did.
 *
 * ## Why it exists
 *
 * The binding model has three levels and one hole in it: a campaign *picks* a
 * voice and an audience, and it picks nothing at all about the guardrails,
 * which apply to every generation whichever voice wrote it. That is the right
 * model — a campaign must not be able to opt out of the claims it is allowed to
 * make — but the app was drawing the conclusion too hard. Unpickable became
 * unmentioned, and rules nobody can see are rules nobody believes are running.
 * Somebody working inside a campaign had no way to know the workspace had
 * stated anything at all.
 *
 * So: **read-only, and unmissable.** Nothing here is a control. The guardrails
 * are not editable from a campaign because they are not the campaign's, the
 * voices and the audience are not *changed* here because they are chosen on
 * Strategy, where the campaign's other commitments are made. Both say where
 * they are edited and link there. What this adds is the fact that they exist.
 *
 * ## Why it is collapsed
 *
 * Because this is not the page's job. The Foundation page is where the
 * campaign's documents are worked on, and a band that opened to a full set of
 * guardrails every time would push the table off the screen to tell a reader
 * something that changes once a quarter. Collapsed, it is one line — and that
 * one line is written to carry the whole point on its own: it names the
 * guardrails, the cast and the audience, and it says so loudest when they are
 * missing.
 */
export function InheritedBrand({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const { data: brand } = useBrand()
  // The binding is two columns on the campaign row (CON-245), so it arrives
  // with the campaign rather than from a query of its own.
  const { data: campaign } = useCampaign(campaignId)

  // Nothing at all rather than a shell while it loads: this sits above a table
  // that is the reason the page was opened, and a band that appears a beat
  // later shoves it down.
  if (!brand || !campaign) return null

  const voice =
    brand.voices.find((v) => v.id === campaign.brand_voice_id) ?? null
  const audience =
    brand.audiences.find((a) => a.id === campaign.brand_audience_id) ?? null
  const { guardrails } = brand

  return (
    <div className="border-b border-tertiary px-3 lg:px-6">
      <Collapse
        title="From the workspace"
        description={summarise(t, guardrails, voice, audience)}
        className="mx-auto w-full max-w-content"
      >
        <div className="flex flex-col gap-6 pb-5 pt-2">
          <GuardrailsPanel guardrails={guardrails} />
          <VoicePanel campaignId={campaignId} voice={voice} />
          <AudiencePanel campaignId={campaignId} audience={audience} />
        </div>
      </Collapse>
    </div>
  )
}

/**
 * The one line the band is read as, collapsed.
 *
 * Ordered by what the reader can least afford to be wrong about: the rules
 * first, then who is speaking, then who is being spoken to. Absence is stated
 * rather than omitted in all three — a summary that lists what happens to be
 * set and silently drops the rest is how a campaign ends up looking configured
 * because nothing on screen said otherwise.
 */
function summarise(
  t: TFunction,
  guardrails: BrandGuardrails | null,
  voice: BrandVoice | null,
  audience: BrandAudience | null,
): string {
  const rules = guardrails
    ? `${countRules(guardrails)} guardrails apply to every post here`
    : brandSectionCopy(t, 'guardrails').whenEmpty
  const who = audience ? audience.name : 'nobody in particular'
  return `${rules} · ${voice ? voice.name : 'no voice chosen'} · written to ${who}`
}

/** Every statement the guardrails make, as one number. The disclaimer counts. */
function countRules(g: BrandGuardrails): number {
  return (
    g.facts.length +
    g.mayClaim.length +
    g.neverClaim.length +
    g.bannedWords.length +
    (g.disclaimer.trim() ? 1 : 0)
  )
}

function GuardrailsPanel({
  guardrails,
}: {
  guardrails: BrandGuardrails | null
}) {
  const { t } = useTranslation()
  const section = brandSectionCopy(t, 'guardrails')
  return (
    <Panel
      title="Guardrails"
      // The sentence that stops this reading as a fourth thing to choose. It
      // is the one piece of brand material with no campaign-level question
      // attached, and saying why is cheaper than letting somebody look for the
      // control.
      note="Applied to every post generated here, whichever voice writes it. There is nothing to pick and nothing to override."
      edit={<EditLink to="/foundation/guardrails">Edit in Foundation</EditLink>}
    >
      {!guardrails ? (
        <p className="border-l-2 border-destructive pl-3 text-sm leading-5 text-tertiary-foreground">
          {section.whenEmpty}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <StatementGroup label="Facts" items={guardrails.facts} />
          <StatementGroup label="May claim" items={guardrails.mayClaim} />
          <StatementGroup
            label="Never claim"
            items={guardrails.neverClaim}
            hard
          />
          {guardrails.bannedWords.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <GroupLabel>Banned words</GroupLabel>
              <div className="flex flex-wrap gap-1.5">
                {guardrails.bannedWords.map((word) => (
                  <span
                    key={word}
                    className="rounded-sm bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
          {guardrails.disclaimer.trim() && (
            <div className="flex flex-col gap-1.5">
              <GroupLabel>Disclaimer</GroupLabel>
              <p className="text-sm leading-5 text-secondary-foreground">
                {guardrails.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

function VoicePanel({
  campaignId,
  voice,
}: {
  campaignId: string
  voice: BrandVoice | null
}) {
  return (
    <Panel
      title="Voice"
      note="Chosen for this campaign out of the workspace's voices. A post can be written in another one, and says so on the post."
      // Strategy, not Foundation: this is the one thing on the band the
      // campaign decided, and the place it decided it is where its window, its
      // rate and its channels are decided too.
      edit={<StrategyLink campaignId={campaignId} />}
    >
      {!voice ? (
        <Absent>
          No voice chosen — posts here are written in the workspace default.
        </Absent>
      ) : (
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{voice.name}</span>
          {voice.whenToUse && (
            <span className="text-xs text-tertiary-foreground">
              {voice.whenToUse}
            </span>
          )}
        </div>
      )}
    </Panel>
  )
}

function AudiencePanel({
  campaignId,
  audience,
}: {
  campaignId: string
  audience: BrandAudience | null
}) {
  return (
    <Panel
      title="Audience"
      note="Who this campaign is written to. A post that addresses somebody else says so on the post."
      edit={<StrategyLink campaignId={campaignId} />}
    >
      {!audience ? (
        <Absent>
          Nobody in particular — generation falls back to whatever the brief
          says.
        </Absent>
      ) : (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{audience.name}</span>
          {audience.who && (
            <span className="text-xs text-tertiary-foreground">
              {audience.who}
            </span>
          )}
        </div>
      )}
    </Panel>
  )
}

/**
 * One inherited thing: what it is, why it is not editable here, and where it
 * is. The link is the same shape in all three so the band reads as one rule
 * applied three times rather than three arrangements.
 */
function Panel({
  title,
  note,
  edit,
  children,
}: {
  title: string
  note: string
  /**
   * Built by the caller rather than described to this one, so each link keeps
   * the router's own typing: a `to` passed through as a string is a route id
   * nothing checks, on exactly the kind of link that outlives the route it
   * points at.
   */
  edit: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium">{title}</h3>
        {edit}
      </div>
      <p className="text-xs leading-4 text-tertiary-foreground">{note}</p>
      <div className="mt-1">{children}</div>
    </section>
  )
}

const EDIT_LINK =
  'flex shrink-0 items-center gap-1 text-xs text-tertiary-foreground hover:text-foreground'

function EditLink({
  to,
  children,
}: {
  to: '/foundation/guardrails'
  children: ReactNode
}) {
  return (
    <Link to={to} className={EDIT_LINK}>
      {children}
      <ArrowUpRightIcon className="size-3" />
    </Link>
  )
}

function StrategyLink({ campaignId }: { campaignId: string }) {
  return (
    <Link
      to="/campaigns/$campaignId/strategy"
      params={{ campaignId }}
      className={EDIT_LINK}
    >
      Change on Strategy
      <ArrowUpRightIcon className="size-3" />
    </Link>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary-foreground">
      {children}
    </span>
  )
}

/**
 * A list of statements, or nothing at all — an empty group is dropped rather
 * than drawn as an empty heading, except for `Never claim`, which is the one
 * whose absence is the finding.
 */
function StatementGroup({
  label,
  items,
  hard = false,
}: {
  label: string
  items: string[]
  hard?: boolean
}) {
  if (items.length === 0 && !hard) return null
  return (
    <div className="flex flex-col gap-1.5">
      <GroupLabel>{label}</GroupLabel>
      {items.length === 0 ? (
        <p className="border-l-2 border-destructive pl-3 text-sm leading-5 text-tertiary-foreground">
          Nothing is off limits. Every voice here may promise anything.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item}
              className={cn(
                'border-l-2 pl-3 text-sm leading-5 text-secondary-foreground',
                hard ? 'border-destructive' : 'border-tertiary',
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Absent({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-5 text-tertiary-foreground">{children}</p>
  )
}

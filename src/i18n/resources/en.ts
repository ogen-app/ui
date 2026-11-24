/**
 * The English catalogue — bundled into the main chunk, and the shape every
 * other locale is typed against (`Translation`).
 *
 * One file per top-level section, put back together here in a fixed order.
 * Every locale has a folder of the same files, so the Spanish for
 * `assistant.*` is in `es/assistant.ts`. A new section is a new file in each
 * folder and a line in each locale's file here; it is still one i18next
 * namespace, so a `t()` call never names the file.
 *
 * Everything the user can read lives here — not just labels and headings, but
 * placeholders, empty states, toast and validation messages, tooltips, and the
 * strings only a screen reader reaches (`aria-label`, `title`, `alt`). A
 * literal left in a component is invisible until someone switches language and
 * finds one word of English in the middle of their page. Developer-facing text
 * (`console.*`, thrown errors, test fixtures) stays where it is.
 *
 * Conventions:
 *
 * - **Keys name the place, values carry the voice.** `profile.dangerZone.body`,
 *   not `deletingYourAccountAlsoDeletes`. A key that quotes its own English is
 *   a lie the moment the copy is edited.
 * - **One key per sentence the user reads.** Never assemble a sentence from
 *   fragments in JSX: word order is not portable. Where a sentence has markup
 *   or a link inside it, keep it whole and render it with `<Trans>`.
 * - **Plurals use i18next's `_one` / `_other` suffixes** and spell out the
 *   whole sentence in each form. English pronouns ("it"/"them") and Spanish
 *   agreement do not survive being stitched together at runtime.
 * - **Button labels on cards and the commit panel are sentence case in every
 *   language**, destructive ones included (`Delete campaign`, `Eliminar
 *   campaña`), written into the copy rather than set with a class — see
 *   CLAUDE.md. Labels elsewhere still in capitals follow as their screens move.
 */
import { common } from './en/common'
import { locale } from './en/locale'
import { validation } from './en/validation'
import { auth } from './en/auth'
import { nav } from './en/nav'
import { assetInsights } from './en/assetInsights'
import { shortcuts } from './en/shortcuts'
import { sentence } from './en/sentence'
import { savedViews } from './en/savedViews'
import { postsFilter } from './en/postsFilter'
import { grounding } from './en/grounding'
import { ideas } from './en/ideas'
import { series } from './en/series'
import { formats } from './en/formats'
import { tasks } from './en/tasks'
import { activity } from './en/activity'
import { campaignOverview } from './en/campaignOverview'
import { calendar } from './en/calendar'
import { assistant } from './en/assistant'
import { workspace } from './en/workspace'
import { workspaces } from './en/workspaces'
import { profile } from './en/profile'
import { workspaceSettings } from './en/workspaceSettings'
import { integration } from './en/integration'
import { integrations } from './en/integrations'
import { postsTable } from './en/postsTable'
import { analytics } from './en/analytics'
import { posts } from './en/posts'
import { tiers } from './en/tiers'
import { brand } from './en/brand'
import { campaigns } from './en/campaigns'
import { content } from './en/content'
import { uploads } from './en/uploads'
import { help } from './en/help'
import { announcements } from './en/announcements'
import { errors } from './en/errors'
import { onboarding } from './en/onboarding'
import { tables } from './en/tables'

export const en = {
  common,
  locale,
  validation,
  auth,
  nav,
  assetInsights,
  shortcuts,
  sentence,
  savedViews,
  postsFilter,
  grounding,
  ideas,
  series,
  formats,
  tasks,
  activity,
  campaignOverview,
  calendar,
  assistant,
  workspace,
  workspaces,
  profile,
  workspaceSettings,
  integration,
  integrations,
  postsTable,
  analytics,
  posts,
  tiers,
  brand,
  campaigns,
  content,
  uploads,
  help,
  announcements,
  errors,
  onboarding,
  tables,
}

export type Translation = typeof en

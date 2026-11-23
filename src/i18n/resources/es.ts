/**
 * Spanish. Lazy-loaded — `i18n/index.ts` imports this file, and with it every
 * section in `es/`, as one chunk that is never in the main one.
 *
 * The `Translation` annotations are what keep it honest: they are **type-only**
 * imports, so they add no runtime dependency on the English bundle, but a key
 * added to the English catalogue and forgotten here is a compile error — in
 * the section's own file — rather than a string that silently falls back
 * mid-screen.
 *
 * Button labels follow English's casing: sentence case on cards and the
 * commit panel, destructive ones included.
 */
import type { Translation } from './en'

import { common } from './es/common'
import { locale } from './es/locale'
import { validation } from './es/validation'
import { auth } from './es/auth'
import { nav } from './es/nav'
import { assetInsights } from './es/assetInsights'
import { shortcuts } from './es/shortcuts'
import { sentence } from './es/sentence'
import { savedViews } from './es/savedViews'
import { postsFilter } from './es/postsFilter'
import { grounding } from './es/grounding'
import { ideas } from './es/ideas'
import { series } from './es/series'
import { formats } from './es/formats'
import { tasks } from './es/tasks'
import { activity } from './es/activity'
import { campaignOverview } from './es/campaignOverview'
import { calendar } from './es/calendar'
import { assistant } from './es/assistant'
import { workspace } from './es/workspace'
import { workspaces } from './es/workspaces'
import { profile } from './es/profile'
import { workspaceSettings } from './es/workspaceSettings'
import { integration } from './es/integration'
import { integrations } from './es/integrations'
import { postsTable } from './es/postsTable'
import { analytics } from './es/analytics'
import { posts } from './es/posts'
import { tiers } from './es/tiers'
import { brand } from './es/brand'
import { campaigns } from './es/campaigns'
import { content } from './es/content'
import { uploads } from './es/uploads'
import { help } from './es/help'
import { announcements } from './es/announcements'
import { errors } from './es/errors'
import { onboarding } from './es/onboarding'

export const es: Translation = {
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
}

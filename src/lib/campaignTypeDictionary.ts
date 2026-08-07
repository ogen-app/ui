// Local mapping of campaign-type slugs to user-facing display info, the
// sibling of platformDictionary. The API is queried for ids, slugs, and the
// phase plan; the label, the sentence under it, and the icon live here so we
// fully control the wording the user sees.
//
// The backend's own `label`/`description` columns are deliberately not read.
// They are seeded copy that drifts from the product's voice — evergreen's ran
// to a paragraph while the rest stopped at a clause — and a database row is a
// poor place to review UI text.

import type { Icon } from "@phosphor-icons/react";
import {
  BookmarkSimpleIcon,
  ChatCircleIcon,
  EyeIcon,
  GaugeIcon,
  InfinityIcon,
  TargetIcon,
} from "@phosphor-icons/react";

export type CampaignTypeInfo = {
  label: string;
  // One clause, comparable in length across every type — these are read as a
  // set, stacked, and one long entry makes the others look like afterthoughts.
  description: string;
  icon: Icon;
};

export const CAMPAIGN_TYPES: Record<string, CampaignTypeInfo> = {
  evergreen: {
    label: "Evergreen",
    description:
      "Timeless content that holds its value for months and years — guides and reference material.",
    icon: InfinityIcon,
  },
  awareness: {
    label: "Awareness",
    description: "Put the brand in front of people who haven't come across it yet.",
    icon: EyeIcon,
  },
  engagement: {
    label: "Engagement",
    description: "Give the audience something to reply to, share, and come back for.",
    icon: ChatCircleIcon,
  },
  conversion: {
    label: "Conversion",
    description: "Drive one specific action — a purchase, a signup, a demo, a subscription.",
    icon: TargetIcon,
  },
  retention: {
    label: "Retention",
    description: "Keep current customers active and getting more out of what they have.",
    icon: BookmarkSimpleIcon,
  },
};

/**
 * Display info for a campaign type, by its backend slug.
 *
 * A type we have no entry for still renders — its slug, capitalized, with no
 * sentence — so a new server-side type is a missing description rather than a
 * blank card. Add it here when one appears.
 */
export function campaignTypeInfo(name: string): CampaignTypeInfo {
  const slug = name.toLowerCase();
  return (
    CAMPAIGN_TYPES[slug] ?? {
      label: name.charAt(0).toUpperCase() + name.slice(1),
      description: "",
      icon: GaugeIcon,
    }
  );
}

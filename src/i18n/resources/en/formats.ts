/**
 * Content formats (CON-264) — the rhetorical shape of a post.
 *
 * Deliberately a short, fixed vocabulary. The hints are what people actually
 * choose by: "explainer" and "how-to" are indistinguishable as labels and
 * obvious once each says what it does.
 */
export const formats = {
  none: 'No format',
  'how-to': {
    label: 'How-to',
    hint: 'Steps somebody can follow and get a result.',
  },
  explainer: {
    label: 'Explainer',
    hint: 'Why something works the way it does.',
  },
  listicle: {
    label: 'List',
    hint: 'A numbered set, each item standing on its own.',
  },
  story: {
    label: 'Story',
    hint: 'One thing that happened, told in order.',
  },
  digest: {
    label: 'Digest',
    hint: 'Several items rounded up for a period.',
  },
  opinion: {
    label: 'Opinion',
    hint: 'A position, argued.',
  },
  question: {
    label: 'Q&A',
    hint: 'A question answered, or asked of the audience.',
  },
  announcement: {
    label: 'Announcement',
    hint: 'News about us, said once and plainly.',
  },
}

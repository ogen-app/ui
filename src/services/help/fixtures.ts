import type { HelpArticle } from '@/types/help'

/**
 * Stand-in content, shaped exactly like the CMS projection.
 *
 * The real articles already exist in Sanity — these are the same three, copied
 * into the shape `services/help/index.ts` will return once the client lands.
 * They are here because the app reads the public `production` dataset and the
 * articles were bootstrapped into private `staging`, so there is nothing for a
 * client to read yet (CON-173, phase 2).
 *
 * Keeping the fixtures in the real payload shape — Portable Text, `target`
 * keys on cross-links, callouts as blocks — is what makes this scaffolding
 * rather than a detour: the renderer built against these needs no changes when
 * the network arrives.
 */

/** Cross-link mark. `target` is the article's key, as the query projects it. */
const linkTo = (key: string, target: string) => ({
  _key: key,
  _type: 'articleLink',
  target,
})

export const HELP_FIXTURES: Record<string, HelpArticle> = {
  'post-statuses': {
    key: 'post-statuses',
    title: 'What each post status means',
    summary:
      'A post is always in one of seven statuses. Which one decides what you can edit, and whether anything is going to publish without you.',
    category: { key: 'posts', title: 'Posts' },
    topics: ['post.status'],
    related: ['scheduling-a-post', 'unscheduling-a-post'],
    body: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Every post carries a status. It decides what you can still edit, which actions the editor offers you, and — for two of them — whether the post is going to go out on its own.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'h2',
        markDefs: [],
        children: [{ _type: 'span', text: 'The seven statuses', marks: [] }],
      },
      ...[
        ['Draft', ' — you are still writing. Nothing will publish.'],
        [
          'Ready for publish',
          ' — the content is finished, but no date is set yet.',
        ],
        [
          'Scheduled',
          ' — a date is set and Ogen will publish it for you when it arrives.',
        ],
        [
          'Scheduled for manual publishing',
          ' — a date is set, but this account is one Ogen cannot post to on your behalf. You publish it yourself, then tell Ogen where it went.',
        ],
        ['Published', ' — it is live. Nothing moves out of this status.'],
        [
          'Failed',
          ' — publishing was attempted and did not work. The post can be sent back to Ready for publish and tried again.',
        ],
        [
          'Not published',
          ' — a manual-publishing post whose moment passed without anyone publishing it.',
        ],
      ].map(([term, rest], i) => ({
        _type: 'block',
        _key: `li${i}`,
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [
          { _type: 'span', text: term, marks: ['strong'] },
          { _type: 'span', text: rest, marks: [] },
        ],
      })),
      {
        _type: 'block',
        _key: 'b3',
        style: 'h2',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Who moves a post between them', marks: [] },
        ],
      },
      {
        _type: 'block',
        _key: 'b4',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Most moves are yours. Two are not: ',
            marks: [],
          },
          { _type: 'span', text: 'Scheduled', marks: ['strong'] },
          { _type: 'span', text: ' becomes ', marks: [] },
          { _type: 'span', text: 'Published', marks: ['strong'] },
          { _type: 'span', text: ' or ', marks: [] },
          { _type: 'span', text: 'Failed', marks: ['strong'] },
          {
            _type: 'span',
            text: ' on its own, when the publisher gets to it. You will see the change without doing anything.',
            marks: [],
          },
        ],
      },
      {
        _type: 'helpCallout',
        _key: 'c1',
        tone: 'warning',
        body: [
          {
            _type: 'block',
            _key: 'cb1',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                text: 'Published is final. There is no route back to a draft, because the post already exists on the platform — editing it here would change nothing out there. If you need to change a published post, change it on the platform.',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b5',
        style: 'normal',
        markDefs: [
          linkTo('m1', 'scheduling-a-post'),
          linkTo('m2', 'unscheduling-a-post'),
        ],
        children: [
          { _type: 'span', text: 'Setting a date is covered in ', marks: [] },
          { _type: 'span', text: 'scheduling a post', marks: ['m1'] },
          { _type: 'span', text: ', and taking one back in ', marks: [] },
          { _type: 'span', text: 'unscheduling a post', marks: ['m2'] },
          { _type: 'span', text: '.', marks: [] },
        ],
      },
    ],
  },

  'scheduling-a-post': {
    key: 'scheduling-a-post',
    title: 'Scheduling a post',
    summary:
      'Set a date and Ogen publishes for you — or holds it for you to publish by hand, depending on the account.',
    category: { key: 'posts', title: 'Posts' },
    topics: ['post.schedule', 'post.scheduled-at'],
    related: ['unscheduling-a-post', 'post-statuses'],
    body: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: "A post can be scheduled once its content is finished. Pick a date and time, and the post moves out of your hands and into the publisher's.",
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'h2',
        markDefs: [],
        children: [{ _type: 'span', text: 'Setting the date', marks: [] }],
      },
      {
        _type: 'block',
        _key: 'b3',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'The date lives in the post editor, beside the status. It has to be in the future — a date in the past is rejected rather than published immediately, which is the safer of the two readings.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b4',
        style: 'normal',
        markDefs: [{ _key: 'a1', _type: 'appLink', path: '/campaigns' }],
        children: [
          { _type: 'span', text: 'Your ', marks: [] },
          { _type: 'span', text: 'campaigns', marks: ['a1'] },
          {
            _type: 'span',
            text: ' each carry their own publishing days and times, and a new post is placed against them, so most of the time the date is already close to what you want.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b5',
        style: 'h2',
        markDefs: [],
        children: [{ _type: 'span', text: 'Automatic or manual', marks: [] }],
      },
      {
        _type: 'block',
        _key: 'b6',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'What happens next depends on the account you are posting to. Where Ogen can publish on your behalf, it does. Where it cannot, the post is held and waits for you — it is still scheduled, but you are the one who publishes, and afterwards you hand Ogen the link so it can pick the post up again.',
            marks: [],
          },
        ],
      },
      {
        _type: 'helpCallout',
        _key: 'c1',
        tone: 'note',
        body: [
          {
            _type: 'block',
            _key: 'cb1',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                text: 'You do not choose between the two. Ogen knows which accounts it can publish to and routes the post for you when you schedule it.',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'helpCallout',
        _key: 'c2',
        tone: 'warning',
        body: [
          {
            _type: 'block',
            _key: 'cb2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                text: 'Once a post is scheduled, its date is locked. To move it, unschedule it first — that is not a way of editing the date, it is the only way.',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b7',
        style: 'normal',
        markDefs: [
          linkTo('m1', 'unscheduling-a-post'),
          linkTo('m2', 'post-statuses'),
        ],
        children: [
          { _type: 'span', text: 'See ', marks: [] },
          { _type: 'span', text: 'unscheduling a post', marks: ['m1'] },
          {
            _type: 'span',
            text: ' for how to take a date back, and ',
            marks: [],
          },
          { _type: 'span', text: 'post statuses', marks: ['m2'] },
          { _type: 'span', text: ' for what each state means.', marks: [] },
        ],
      },
    ],
  },

  'unscheduling-a-post': {
    key: 'unscheduling-a-post',
    title: 'Unscheduling a post',
    summary:
      'Unscheduling asks the publisher to call the post back. It stays scheduled until that is confirmed.',
    category: { key: 'posts', title: 'Posts' },
    topics: ['post.unschedule'],
    related: ['scheduling-a-post', 'post-statuses'],
    body: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: "Unscheduling takes a date back off a post and returns it to you. You need it to change a scheduled post's date, its content, or to stop it going out at all.",
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'h2',
        markDefs: [],
        children: [{ _type: 'span', text: 'It is not instant', marks: [] }],
      },
      {
        _type: 'block',
        _key: 'b3',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Unscheduling is a request, not a switch. Ogen asks the publisher to call the post back, and the post stays ',
            marks: [],
          },
          { _type: 'span', text: 'Scheduled', marks: ['strong'] },
          {
            _type: 'span',
            text: ' until the publisher confirms. Only then does it return to ',
            marks: [],
          },
          { _type: 'span', text: 'Ready for publish', marks: ['strong'] },
          { _type: 'span', text: ' or ', marks: [] },
          { _type: 'span', text: 'Draft', marks: ['strong'] },
          { _type: 'span', text: '. The wait is usually seconds.', marks: [] },
        ],
      },
      {
        _type: 'helpCallout',
        _key: 'c1',
        tone: 'warning',
        body: [
          {
            _type: 'block',
            _key: 'cb1',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                text: 'Until the status actually changes, treat the post as still scheduled. That is the honest reading: the publisher has not yet agreed to hold it.',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b4',
        style: 'h2',
        markDefs: [],
        children: [{ _type: 'span', text: 'Once it is back', marks: [] }],
      },
      {
        _type: 'block',
        _key: 'b5',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'An unscheduled post is editable again — content, date, everything. Schedule it a second time exactly as you did the first, and it is routed again from scratch.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b6',
        style: 'normal',
        markDefs: [
          linkTo('m1', 'scheduling-a-post'),
          linkTo('m2', 'post-statuses'),
        ],
        children: [
          { _type: 'span', text: 'See ', marks: [] },
          { _type: 'span', text: 'scheduling a post', marks: ['m1'] },
          { _type: 'span', text: ' and ', marks: [] },
          { _type: 'span', text: 'post statuses', marks: ['m2'] },
          { _type: 'span', text: '.', marks: [] },
        ],
      },
    ],
  },
}
